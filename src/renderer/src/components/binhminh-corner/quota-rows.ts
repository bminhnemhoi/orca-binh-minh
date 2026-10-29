import type { RateLimitState, RateLimitWindow } from '../../../../shared/rate-limit-types'
import { quotaSections, type QuotaSection } from './quota-sections'
import { computeQuotaPace, quotaWindowName, type QuotaPace, type QuotaSample } from './quota-pace'

export type QuotaLevel = 'ok' | 'warn' | 'crit'

export type QuotaRowWindow = QuotaSection & { pace: QuotaPace | null; level: QuotaLevel }

export type QuotaRow = {
  key: string
  provider: 'claude' | 'codex' | 'antigravity'
  name: string
  /** Antigravity pool, e.g. "Claude & GPT"; null for single-pool providers. */
  pool: string | null
  short: QuotaRowWindow | null
  long: QuotaRowWindow | null
  /** The window closest to running out; drives the row's color and the detail chart. */
  tight: QuotaRowWindow
  level: QuotaLevel
  accountEmail: string | null
  /** Milliseconds since the reading, when it is old enough to distrust. */
  staleForMs: number | null
}

const NAMES = { claude: 'Claude', codex: 'Codex', antigravity: 'Antigravity' } as const
const SHORT_MAX_MINUTES = 600
/** Twice the default 15-minute poll: older readings are dimmed rather than shown as live. */
export const QUOTA_STALE_MS = 30 * 60 * 1000
const RUN_OUT_MARGIN_MS = 10 * 60 * 1000
const CRITICAL_RUN_OUT_MS = 15 * 60 * 1000

function poolOf(label: string): string | null {
  if (!label.includes(' · ')) {
    return null
  }
  return label
    .split(' · ')[0]!
    .replace(/\s+models?$/i, '')
    .replace(/\s+and\s+/i, ' & ')
}

export function quotaLevel(
  window: RateLimitWindow,
  pace: QuotaPace | null,
  now: number
): QuotaLevel {
  const used = window.usedPercent
  if (used >= 95 || (pace?.runsOutAt && pace.runsOutAt - now < CRITICAL_RUN_OUT_MS)) {
    return 'crit'
  }
  const resetsAt = window.resetsAt ?? Infinity
  if (pace?.runsOutAt && resetsAt - pace.runsOutAt > RUN_OUT_MARGIN_MS) {
    return 'warn'
  }
  return used >= 80 ? 'warn' : 'ok'
}

const RANK: Record<QuotaLevel, number> = { ok: 0, warn: 1, crit: 2 }

export function buildQuotaRows(
  state: RateLimitState | undefined,
  now: number,
  historyOf: (provider: string, section: QuotaSection) => readonly QuotaSample[] = () => []
): QuotaRow[] {
  const rows: QuotaRow[] = []
  for (const provider of ['claude', 'codex', 'antigravity'] as const) {
    const usage = state?.[provider]
    if (!usage || usage.status === 'unavailable') {
      continue
    }
    const pools = new Map<string, QuotaSection[]>()
    for (const section of quotaSections(usage)) {
      const pool = poolOf(section.label) ?? ''
      pools.set(pool, [...(pools.get(pool) ?? []), section])
    }
    for (const [pool, sections] of pools) {
      const decorate = (section: QuotaSection | undefined): QuotaRowWindow | null => {
        if (!section) {
          return null
        }
        const pace = computeQuotaPace(section.window, now, historyOf(provider, section))
        return { ...section, pace, level: quotaLevel(section.window, pace, now) }
      }
      const shortSection = sections.find((s) => s.window.windowMinutes <= SHORT_MAX_MINUTES)
      // Why the tighter long window: Claude reports Weekly and Fable; the one nearer its cap matters.
      const longSection = sections
        .filter((s) => s.window.windowMinutes > SHORT_MAX_MINUTES)
        .sort((a, b) => b.window.usedPercent - a.window.usedPercent)[0]
      const short = decorate(shortSection)
      const long = decorate(longSection)
      const candidates = [short, long].filter((w): w is QuotaRowWindow => w !== null)
      if (candidates.length === 0) {
        continue
      }
      const tight = candidates.reduce((a, b) =>
        RANK[b.level] > RANK[a.level] ||
        (RANK[b.level] === RANK[a.level] && b.window.usedPercent > a.window.usedPercent)
          ? b
          : a
      )
      const age = now - usage.updatedAt
      rows.push({
        key: `${provider}:${pool}`,
        provider,
        name: NAMES[provider],
        pool: pool || null,
        short,
        long,
        tight,
        level: tight.level,
        accountEmail: usage.accountEmail ?? null,
        staleForMs: usage.updatedAt > 0 && age > QUOTA_STALE_MS ? age : null
      })
    }
  }
  return rows
}

/** Lowest "% left" across every window shown, for the pet's mood; null when nothing is known. */
export function lowestQuotaLeft(rows: readonly QuotaRow[]): number | null {
  const lefts = rows.flatMap((row) =>
    [row.short, row.long].filter(Boolean).map((w) => 100 - w!.window.usedPercent)
  )
  return lefts.length ? Math.min(...lefts) : null
}

/** "Claude · 5 giờ" or "Antigravity · Claude & GPT · tuần" (bucket labels already name the pool). */
export function quotaWindowTitle(row: QuotaRow, w: QuotaRowWindow): string {
  return `${row.name} · ${quotaWindowName(w.label, w.window.windowMinutes)}`
}

/** The title of the window with the least left, or null when nothing is known. */
export function lowestQuotaLabel(rows: readonly QuotaRow[]): string | null {
  let best: { row: QuotaRow; w: QuotaRowWindow } | null = null
  for (const row of rows) {
    for (const w of [row.short, row.long]) {
      if (w && (!best || w.window.usedPercent > best.w.window.usedPercent)) {
        best = { row, w }
      }
    }
  }
  return best ? quotaWindowTitle(best.row, best.w) : null
}

/** The pool with the most room, offered as the place to move work when another runs short. */
export function roomiestRow(rows: readonly QuotaRow[], except: QuotaRow): QuotaRow | null {
  let best: QuotaRow | null = null
  for (const row of rows) {
    if (row.key === except.key || row.level !== 'ok') {
      continue
    }
    if (!best || row.tight.window.usedPercent < best.tight.window.usedPercent) {
      best = row
    }
  }
  return best
}
