import { describe, expect, it } from 'vitest'
import { createEmptyRateLimitState } from '../../../../shared/rate-limit-state-factory'
import type { ProviderRateLimits, RateLimitWindow } from '../../../../shared/rate-limit-types'
import { buildQuotaRows, lowestQuotaLeft, roomiestRow, quotaLevel } from './quota-rows'

const HOUR = 60 * 60 * 1000
const NOW = 100 * HOUR
const win = (usedPercent: number, minutes: number, resetsIn: number): RateLimitWindow => ({
  usedPercent,
  windowMinutes: minutes,
  resetsAt: NOW + resetsIn,
  resetDescription: null
})
const base = (provider: ProviderRateLimits['provider']): ProviderRateLimits => ({
  provider,
  status: 'ok',
  error: null,
  session: null,
  weekly: null,
  updatedAt: NOW
})

describe('buildQuotaRows', () => {
  it('splits Antigravity into one row per model pool', () => {
    const state = {
      ...createEmptyRateLimitState(),
      antigravity: {
        ...base('antigravity'),
        weekly: win(50, 10080, 72 * HOUR),
        buckets: [
          { name: 'Gemini Models · Weekly Limit Remaining', ...win(0, 10080, 140 * HOUR) },
          { name: 'Gemini Models · Five Hour Limit Remaining', ...win(0, 300, 4 * HOUR) },
          { name: 'Claude and GPT models · Weekly Limit Remaining', ...win(50, 10080, 72 * HOUR) },
          { name: 'Claude and GPT models · Five Hour Limit Remaining', ...win(0, 300, 4 * HOUR) }
        ]
      }
    }
    const rows = buildQuotaRows(state, NOW)
    expect(rows.map((r) => r.pool)).toEqual(['Gemini', 'Claude & GPT'])
    expect(rows[1]!.short?.window.windowMinutes).toBe(300)
    expect(rows[1]!.long?.window.usedPercent).toBe(50)
    expect(roomiestRow(rows, rows[1]!)?.pool).toBe('Gemini')
    expect(lowestQuotaLeft(rows)).toBe(50)
  })

  it('pairs Claude session with the tighter of Weekly and Fable, and flags stale data', () => {
    const state = {
      ...createEmptyRateLimitState(),
      claude: {
        ...base('claude'),
        updatedAt: NOW - 45 * 60 * 1000,
        session: win(10, 300, 4 * HOUR),
        weekly: win(40, 10080, 48 * HOUR),
        fableWeekly: win(70, 10080, 48 * HOUR)
      }
    }
    const [row] = buildQuotaRows(state, NOW)
    expect(row!.long?.label).toBe('Fable')
    expect(row!.tight.label).toBe('Fable')
    expect(row!.staleForMs).toBe(45 * 60 * 1000)
  })
})

describe('quotaLevel', () => {
  it('warns when the pace runs out well before reset and is critical near the cap', () => {
    const w = win(60, 300, 3 * HOUR)
    expect(quotaLevel(w, { runsOutAt: NOW + HOUR } as never, NOW)).toBe('warn')
    expect(quotaLevel(w, { runsOutAt: NOW + 10 * 60 * 1000 } as never, NOW)).toBe('crit')
    expect(quotaLevel(win(96, 300, HOUR), null, NOW)).toBe('crit')
    expect(quotaLevel(win(20, 300, HOUR), null, NOW)).toBe('ok')
  })
})
