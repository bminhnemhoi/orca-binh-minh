import { describe, expect, it } from 'vitest'
import {
  computeQuotaPace,
  describePace,
  fitRecentRate,
  formatDurationCompact,
  formatDurationVi,
  formatRunOutTime,
  quotaWindowName
} from './quota-pace'

describe('labels', () => {
  it('names windows in Vietnamese and shortens Antigravity model groups', () => {
    expect(quotaWindowName('Session', 300)).toBe('5 giờ')
    expect(quotaWindowName('Weekly', 10_080)).toBe('tuần')
    expect(quotaWindowName('Fable', 10_080)).toBe('Fable · tuần')
    expect(quotaWindowName('Claude and GPT models · Weekly Limit Remaining', 10_080)).toBe(
      'Claude & GPT · tuần'
    )
    expect(quotaWindowName('Gemini Models · Five Hour Limit Remaining', 300)).toBe('Gemini · 5 giờ')
  })

  it('never shows a bare clock time for another day', () => {
    const now = new Date(2026, 9, 29, 11, 30).getTime()
    expect(formatRunOutTime(new Date(2026, 9, 29, 16, 40).getTime(), now)).toBe('16:40')
    expect(formatRunOutTime(new Date(2026, 9, 30, 9, 5).getTime(), now)).toBe('09:05 ngày mai')
    expect(formatRunOutTime(new Date(2026, 10, 1, 11, 50).getTime(), now)).toBe('11:50 01/11')
  })

  it('formats durations', () => {
    expect(formatDurationVi(45 * 60_000)).toBe('45 phút')
    expect(formatDurationVi((4 * 60 + 33) * 60_000)).toBe('4 giờ 33 phút')
    expect(formatDurationVi((2 * 1440 + 8 * 60) * 60_000)).toBe('2 ngày 8 giờ')
  })
})

const HOUR = 60 * 60 * 1000
const fiveHour = (usedPercent: number, resetsAt: number) => ({
  usedPercent,
  windowMinutes: 300,
  resetsAt,
  resetDescription: null
})

describe('computeQuotaPace', () => {
  it('projects when the quota runs out before the reset', () => {
    // 2h of 5h elapsed, 60% used: 30%/h, the last 40% lasts 1h20m, before the 3h reset.
    const now = 10 * HOUR
    const pace = computeQuotaPace(fiveHour(60, now + 3 * HOUR), now)
    expect(pace?.aheadBy).toBeCloseTo(20)
    expect(pace?.runsOutAt).toBe(now + (4 / 3) * HOUR)
  })

  it('reports no run-out when the pace lasts until the reset', () => {
    const now = 10 * HOUR
    const pace = computeQuotaPace(fiveHour(20, now + 3 * HOUR), now)
    expect(pace?.aheadBy).toBeCloseTo(-20)
    expect(pace?.runsOutAt).toBeNull()
  })

  it('does not project from the first moments of a window', () => {
    const now = 10 * HOUR
    expect(computeQuotaPace(fiveHour(5, now + 4.9 * HOUR), now)?.runsOutAt).toBeNull()
  })

  it('needs a reset time inside the window', () => {
    expect(computeQuotaPace(fiveHour(50, 0), 10)).toBeNull()
    expect(computeQuotaPace(fiveHour(50, 10 * HOUR), 0)).toBeNull()
  })
})

describe('history-based pace', () => {
  const MIN = 60_000

  it('fits a straight burn and ignores too little history', () => {
    const line = [0, 5, 10, 15].map((m) => ({ t: m * MIN, used: 10 + m }))
    expect(fitRecentRate(line)! * MIN).toBeCloseTo(1)
    expect(fitRecentRate(line.slice(0, 2))).toBeNull()
    expect(fitRecentRate([0, 2, 4].map((m) => ({ t: m * MIN, used: m })))).toBeNull()
  })

  it('projects from the recent burn instead of the window average', () => {
    // 4h into a 5h window at 20% used (average 5%/h), but the last 20 min burned 1%/min.
    const now = 4 * HOUR
    const history = [0, 5, 10, 15, 20].map((m) => ({ t: now - (20 - m) * MIN, used: m }))
    const pace = computeQuotaPace(fiveHour(20, now + HOUR), now, history)!
    expect(pace.rateSource).toBe('recent')
    expect(pace.ratePerHour).toBeCloseTo(60)
    // The remaining 80% would take 80 min at that rate, past the reset in 60 min.
    expect(pace.runsOutAt).toBeNull()
    expect(pace.projectedAtReset).toBe(80)
  })

  it('describes pace in plain words', () => {
    expect(describePace(0.3)).toBe('Đúng nhịp')
    expect(describePace(-8.2)).toBe('Dư 8%')
    expect(describePace(12.6)).toBe('Vượt nhịp 13%')
  })
})

describe('formatDurationCompact', () => {
  it('fits row headers', () => {
    expect(formatDurationCompact(28 * 60_000)).toBe('28p')
    expect(formatDurationCompact((4 * 60 + 59) * 60_000)).toBe('4g59p')
    expect(formatDurationCompact(5 * 60 * 60_000)).toBe('5g')
    expect(formatDurationCompact((3 * 1440 + 22 * 60) * 60_000)).toBe('3n22g')
  })
})
