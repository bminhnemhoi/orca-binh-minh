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

const pad = (n: number): string => String(n).padStart(2, '0')

/** "16:40", "16:40 ngày mai" or "16:40 01/11": a bare clock time must never read as today. */
export function formatRunOutTime(ms: number, now: number): string {
  const date = new Date(ms)
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const today = new Date(now)
  const dayDiff = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000
  )
  if (dayDiff === 0) {
    return clock
  }
  return dayDiff === 1
    ? `${clock} ngày mai`
    : `${clock} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

/** "45 phút", "4 giờ 33 phút", "2 ngày 8 giờ". */
export function formatDurationVi(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) {
    return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`
  }
  if (hours > 0) {
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`
  }
  return `${mins} phút`
}

/**
 * Short Vietnamese name for a quota window: "5 giờ", "tuần", or for Antigravity's model groups
 * "Claude & GPT · tuần". The section label from getWindowSections names the bucket group.
 */
export function quotaWindowName(label: string, windowMinutes: number): string {
  const base =
    windowMinutes === 300
      ? '5 giờ'
      : windowMinutes === 10_080
        ? 'tuần'
        : windowMinutes >= 40_000
          ? 'tháng'
          : `${Math.round(windowMinutes / 60)} giờ`
  if (label.includes(' · ')) {
    const group = label
      .split(' · ')[0]!
      .replace(/\s+models?$/i, '')
      .replace(/\s+and\s+/i, ' & ')
    return `${group} · ${base}`
  }
  return label === 'Fable' ? `Fable · ${base}` : base
}
