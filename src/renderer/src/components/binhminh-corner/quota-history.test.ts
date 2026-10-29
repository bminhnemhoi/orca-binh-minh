import { describe, expect, it } from 'vitest'
import { createEmptyRateLimitState } from '../../../../shared/rate-limit-state-factory'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'
import { appendQuotaSamples, quotaSeriesKey } from './quota-history'

const HOUR = 60 * 60 * 1000
const window = (usedPercent: number, resetsAt: number) => ({
  usedPercent,
  windowMinutes: 300,
  resetsAt,
  resetDescription: null
})
const claude = (usedPercent: number, resetsAt: number): ProviderRateLimits => ({
  provider: 'claude',
  status: 'ok',
  error: null,
  session: window(usedPercent, resetsAt),
  weekly: null,
  updatedAt: 0
})

describe('appendQuotaSamples', () => {
  const resetsAt = 10 * HOUR
  const key = quotaSeriesKey('claude', 'Session', window(0, resetsAt))

  it('adds a point per window and skips a repeat inside 20 minutes', () => {
    const state = { ...createEmptyRateLimitState(), claude: claude(12, resetsAt) }
    const first = appendQuotaSamples({}, state, 6 * HOUR)!
    expect(first[key]!.points).toEqual([[6 * HOUR, 12]])
    expect(appendQuotaSamples(first, state, 6 * HOUR + 60_000)).toBeNull()
    const later = appendQuotaSamples(first, state, 6 * HOUR + 21 * 60_000)!
    expect(later[key]!.points).toHaveLength(2)
  })

  it('starts a new series after a reset and prunes the old one a day later', () => {
    const before = appendQuotaSamples(
      {},
      { ...createEmptyRateLimitState(), claude: claude(90, resetsAt) },
      9 * HOUR
    )!
    const next = appendQuotaSamples(
      before,
      { ...createEmptyRateLimitState(), claude: claude(1, resetsAt + 5 * HOUR) },
      resetsAt + 25 * HOUR
    )!
    expect(next[key]).toBeUndefined()
    expect(Object.keys(next)).toHaveLength(1)
  })

  it('ignores providers that are not reporting', () => {
    const state = {
      ...createEmptyRateLimitState(),
      claude: { ...claude(5, resetsAt), status: 'error' as const }
    }
    expect(appendQuotaSamples({}, state, HOUR)).toBeNull()
  })
})
