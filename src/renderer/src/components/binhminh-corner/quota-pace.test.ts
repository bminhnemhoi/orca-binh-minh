import { describe, expect, it } from 'vitest'
import { computeQuotaPace } from './quota-pace'

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
