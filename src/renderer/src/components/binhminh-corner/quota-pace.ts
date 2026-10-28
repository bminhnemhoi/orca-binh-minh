import type { RateLimitWindow } from '../../../../shared/rate-limit-types'

export type QuotaPace = {
  /** Used percent minus what an even pace would have used by now; positive = ahead of pace. */
  aheadBy: number
  /** When the window runs out at the current rate, if that comes before the reset. */
  runsOutAt: number | null
}

/** Below this share of the window elapsed, the rate is too noisy to project. */
const MIN_ELAPSED_SHARE = 0.05

/**
 * Pace for a quota window, as Win-CodexBar and ccusage show it.
 *
 * Even pace needs no history: by the time a share of the window has elapsed, the same share of
 * the quota would be used. The projection assumes the average rate so far continues.
 */
export function computeQuotaPace(window: RateLimitWindow, now: number): QuotaPace | null {
  if (!window.resetsAt || window.windowMinutes <= 0) {
    return null
  }
  const length = window.windowMinutes * 60 * 1000
  const remaining = window.resetsAt - now
  if (remaining <= 0 || remaining > length) {
    return null
  }
  const elapsed = length - remaining
  const share = elapsed / length
  const used = Math.min(Math.max(window.usedPercent, 0), 100)
  const aheadBy = used - share * 100
  let runsOutAt: number | null = null
  if (share >= MIN_ELAPSED_SHARE && used > 0 && used < 100) {
    const msToEmpty = ((100 - used) / used) * elapsed
    if (msToEmpty < remaining) {
      runsOutAt = now + msToEmpty
    }
  }
  return { aheadBy, runsOutAt }
}

export function formatClockTime(ms: number): string {
  const date = new Date(ms)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
