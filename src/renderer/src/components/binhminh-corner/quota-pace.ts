import type { RateLimitWindow } from '../../../../shared/rate-limit-types'

export type QuotaPace = {
  /** Used percent minus what an even pace would have used by now; positive = ahead of pace. */
  aheadBy: number
  /** When the window runs out at the current rate, if that comes before the reset. */
  runsOutAt: number | null
  /** Used percent the window would reach by its reset at the current rate (capped at 100). */
  projectedAtReset: number
  /** Percent per hour the projection assumes. */
  ratePerHour: number
  /** 'recent' = fitted to the last stretch of history; 'average' = since the window began. */
  rateSource: 'recent' | 'average'
  /** Window start and length, for charts. */
  startsAt: number
  lengthMs: number
}

export type QuotaSample = { t: number; used: number }

/** Below this share of the window elapsed, the average rate is too noisy to project. */
const MIN_ELAPSED_SHARE = 0.05
const MIN_FIT_SAMPLES = 3
const MIN_FIT_SPAN_MS = 10 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/** Least-squares slope (percent per ms) of the samples, or null when the fit is unreliable. */
export function fitRecentRate(samples: readonly QuotaSample[]): number | null {
  if (samples.length < MIN_FIT_SAMPLES) {
    return null
  }
  const t0 = samples[0]!.t
  const span = samples.at(-1)!.t - t0
  if (span < MIN_FIT_SPAN_MS) {
    return null
  }
  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (const { t, used } of samples) {
    const x = t - t0
    sx += x
    sy += used
    sxx += x * x
    sxy += x * used
  }
  const n = samples.length
  const denom = n * sxx - sx * sx
  return denom === 0 ? null : (n * sxy - sx * sy) / denom
}

/**
 * Pace for a quota window, as CodexBar, Win-CodexBar and ccusage show it.
 *
 * Even pace needs no history: by the time a share of the window has elapsed, the same share of
 * the quota would be used. The projection uses the slope of recent history when there is enough
 * of it (last 30 min for short windows, last 24 h for weekly ones), because an agent that started
 * an hour ago burns very differently from the window's average; otherwise the average so far.
 */
export function computeQuotaPace(
  window: RateLimitWindow,
  now: number,
  history: readonly QuotaSample[] = []
): QuotaPace | null {
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
  const recentSpan = window.windowMinutes <= 600 ? 30 * 60 * 1000 : 24 * HOUR_MS
  const recent = history.filter((p) => p.t >= now - recentSpan && p.t <= now)
  const fitted = fitRecentRate(recent)
  const average = share >= MIN_ELAPSED_SHARE && elapsed > 0 ? used / elapsed : null
  const rate = fitted !== null ? Math.max(fitted, 0) : (average ?? 0)
  let runsOutAt: number | null = null
  if (rate > 0 && used < 100) {
    const msToEmpty = (100 - used) / rate
    if (msToEmpty < remaining) {
      runsOutAt = now + msToEmpty
    }
  }
  return {
    aheadBy: used - share * 100,
    runsOutAt,
    projectedAtReset: Math.min(100, used + rate * remaining),
    ratePerHour: rate * HOUR_MS,
    rateSource: fitted !== null ? 'recent' : 'average',
    startsAt: window.resetsAt - length,
    lengthMs: length
  }
}

/** "Đúng nhịp", "Dư 8%" or "Vượt nhịp 12%". */
export function describePace(aheadBy: number): string {
  const rounded = Math.round(Math.abs(aheadBy))
  if (rounded < 1) {
    return 'Đúng nhịp'
  }
  return aheadBy < 0 ? `Dư ${rounded}%` : `Vượt nhịp ${rounded}%`
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
