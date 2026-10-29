import { describe, expect, it } from 'vitest'
import { evaluateInsights, type HostSample, type InsightInput } from './corner-insights'
import type { QuotaRow } from './quota-rows'

const GB = 1024 ** 3
const NOW = 1_000_000_000
const samples = (availableGb: number, cpu = 20): HostSample[] =>
  Array.from({ length: 10 }, (_, i) => ({
    t: NOW - i * 3000,
    cpu,
    availableBytes: availableGb * GB
  }))
const input = (over: Partial<InsightInput> = {}): InsightInput => ({
  now: NOW,
  host: samples(8),
  quota: [],
  hibernationEnabled: false,
  snoozedUntil: {},
  ...over
})
const calm = { ram: false, cpu: false }

const row = (over: Partial<QuotaRow> & { used: number; level: QuotaRow['level'] }): QuotaRow => {
  const tight = {
    label: 'Session',
    window: {
      usedPercent: over.used,
      windowMinutes: 300,
      resetsAt: NOW + 3_600_000,
      resetDescription: null
    },
    pace: { runsOutAt: NOW + 1_200_000, ratePerHour: 40, rateSource: 'recent' } as never,
    level: over.level
  }
  return {
    key: over.key ?? 'claude:',
    provider: 'claude',
    name: over.name ?? 'Claude',
    pool: null,
    short: tight,
    long: null,
    tight,
    level: over.level,
    accountEmail: null,
    staleForMs: null
  }
}

describe('evaluateInsights', () => {
  it('stays quiet when everything is fine', () => {
    expect(evaluateInsights(input(), calm).insight).toBeNull()
  })

  it('suggests sleeping finished agents under memory pressure, with hysteresis', () => {
    const low = evaluateInsights(input({ host: samples(2) }), calm)
    expect(low.insight?.action?.kind).toBe('enable-hibernation')
    // 2.8 GB is above the 2.5 GB warning but below the 3.2 GB clear line: stays on.
    expect(evaluateInsights(input({ host: samples(2.8) }), low.memory).insight?.id).toBe('ram:warn')
    expect(evaluateInsights(input({ host: samples(3.5) }), low.memory).insight).toBeNull()
  })

  it('puts a critical quota above a RAM warning and points at the roomiest pool', () => {
    const quota = [
      row({ used: 96, level: 'crit' }),
      row({ key: 'codex:', name: 'Codex', used: 10, level: 'ok' })
    ]
    const result = evaluateInsights(input({ host: samples(2), quota }), calm)
    expect(result.insight?.id).toBe('quota:claude::Session')
    expect(result.insight?.text).toContain('Còn 90% ở Codex')
  })

  it('respects a snooze', () => {
    const result = evaluateInsights(
      input({ host: samples(2), snoozedUntil: { 'ram:warn': NOW + 1 } }),
      calm
    )
    expect(result.insight).toBeNull()
  })

  it('flags sustained CPU only after the 30-second mean crosses 85%', () => {
    expect(evaluateInsights(input({ host: samples(8, 90) }), calm).insight?.id).toBe('cpu')
    expect(evaluateInsights(input({ host: samples(8, 80) }), calm).insight).toBeNull()
  })
})
