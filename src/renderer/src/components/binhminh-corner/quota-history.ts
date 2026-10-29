import type { RateLimitState, RateLimitWindow } from '../../../../shared/rate-limit-types'
import { quotaSections } from './quota-sections'

/**
 * Used-percent samples per quota window, so the corner can draw "used over time vs. even pace".
 *
 * Why the renderer's localStorage: the samples are a convenience for one machine's chart, small
 * (a point per quota read, pruned when a window resets) and safe to lose. One series per window
 * instance, keyed by its reset time, so a reset starts a fresh line instead of a cliff.
 */
const STORAGE_KEY = 'binhminh.quotaHistory.v1'
const MAX_POINTS = 600
/** A repeated reading is kept only if this long has passed, so flat stretches stay cheap. */
const MIN_REPEAT_MS = 20 * 60 * 1000
const KEEP_AFTER_RESET_MS = 24 * 60 * 60 * 1000

export type QuotaPoint = { t: number; used: number }
type Store = Record<string, { resetsAt: number; points: [number, number][] }>

const PROVIDERS = ['claude', 'codex', 'antigravity'] as const

export function quotaSeriesKey(provider: string, label: string, window: RateLimitWindow): string {
  return `${provider}|${label}|${window.windowMinutes}|${window.resetsAt ?? 0}`
}

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {}
  } catch {
    return {}
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage full or blocked: the chart falls back to the current reading only.
  }
}

/** Pure core: returns the next store, or null when nothing changed. */
export function appendQuotaSamples(store: Store, state: RateLimitState, now: number): Store | null {
  let changed = false
  const next: Store = {}
  for (const [key, series] of Object.entries(store)) {
    if (series.resetsAt + KEEP_AFTER_RESET_MS > now) {
      next[key] = series
    } else {
      changed = true
    }
  }
  for (const provider of PROVIDERS) {
    const usage = state[provider]
    if (!usage || usage.status !== 'ok') {
      continue
    }
    for (const { label, window } of quotaSections(usage)) {
      if (!window?.resetsAt) {
        continue
      }
      const key = quotaSeriesKey(provider, label, window)
      const series = next[key] ?? { resetsAt: window.resetsAt, points: [] }
      const last = series.points.at(-1)
      const used = Math.round(window.usedPercent * 10) / 10
      if (last && last[1] === used && now - last[0] < MIN_REPEAT_MS) {
        continue
      }
      next[key] = {
        resetsAt: window.resetsAt,
        points: [...series.points, [now, used] as [number, number]].slice(-MAX_POINTS)
      }
      changed = true
    }
  }
  return changed ? next : null
}

export function recordQuotaHistory(state: RateLimitState, now = Date.now()): void {
  const next = appendQuotaSamples(read(), state, now)
  if (next) {
    write(next)
  }
}

export function readQuotaSeries(
  provider: string,
  label: string,
  window: RateLimitWindow
): QuotaPoint[] {
  const series = read()[quotaSeriesKey(provider, label, window)]
  return series ? series.points.map(([t, used]) => ({ t, used })) : []
}
