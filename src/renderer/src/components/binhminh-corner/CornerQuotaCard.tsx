import { useAppStore } from '@/store'
import { useResetCountdownClock } from '@/hooks/useResetCountdownClock'
import { barColor, getWindowSections, ProviderIcon } from '../status-bar/tooltip'
import { clampUsedPercent } from '../../../../shared/usage-percentage-display'
import type {
  ProviderRateLimits,
  RateLimitState,
  RateLimitWindow
} from '../../../../shared/rate-limit-types'
import { computeQuotaPace, formatDurationVi, formatRunOutTime, quotaWindowName } from './quota-pace'

const PROVIDERS = [
  { key: 'claude', label: 'Claude' },
  { key: 'codex', label: 'Codex' },
  { key: 'antigravity', label: 'Antigravity' }
] as const

/** Below this much left, the row also says when the window resets. */
const SHOW_RESET_BELOW_LEFT = 40

type QuotaRow = {
  key: string
  label: string
  usage: ProviderRateLimits
  section: { label: string; window: RateLimitWindow }
}

/** The window closest to running out, so one line per provider shows the real constraint. */
function tightestSection(usage: ProviderRateLimits): QuotaRow['section'] | null {
  let best: QuotaRow['section'] | null = null
  for (const { label, window } of getWindowSections(usage)) {
    if (
      window &&
      (!best || clampUsedPercent(window.usedPercent) > clampUsedPercent(best.window.usedPercent))
    ) {
      best = { label, window }
    }
  }
  return best
}

/** Lowest "% left" across the quotas shown, for the pet's mood; null when nothing is known. */
export function lowestQuotaLeft(rows: readonly QuotaRow[]): number | null {
  if (rows.length === 0) {
    return null
  }
  return Math.min(...rows.map((row) => 100 - clampUsedPercent(row.section.window.usedPercent)))
}

export function selectQuotaRows(limits: RateLimitState | undefined): QuotaRow[] {
  const rows: QuotaRow[] = []
  for (const provider of PROVIDERS) {
    const usage = limits?.[provider.key]
    const section = usage && usage.status !== 'unavailable' ? tightestSection(usage) : null
    if (usage && section) {
      rows.push({ key: provider.key, label: provider.label, usage, section })
    }
  }
  return rows
}

/**
 * One line per subscription: how much is left of the tightest window, and, when it matters,
 * when it resets or when the current pace would run it out first. The data is the same
 * rate-limit state the status bar polls, so this card adds no requests.
 */
export function CornerQuotaCard(): React.JSX.Element | null {
  const limits = useAppStore((s) => s.rateLimits)
  const rows = selectQuotaRows(limits)
  const now = useResetCountdownClock(rows.map((row) => row.section.window.resetsAt))
  if (rows.length === 0) {
    return null
  }
  return (
    <section aria-label="Hạn mức" className="space-y-1.5">
      {rows.map(({ key, label, usage, section }) => {
        const used = clampUsedPercent(section.window.usedPercent)
        const left = Math.round(100 - used)
        const name = quotaWindowName(section.label, section.window.windowMinutes)
        const pace = computeQuotaPace(section.window, now)
        const resetIn = section.window.resetsAt
          ? formatDurationVi(section.window.resetsAt - now)
          : null
        const title = [
          `${label} · ${name}: còn ${left}%`,
          usage.accountEmail ?? null,
          resetIn ? `Reset sau ${resetIn}` : null,
          pace
            ? `${pace.aheadBy >= 0 ? 'Nhanh' : 'Chậm'} hơn nhịp đều ${Math.abs(Math.round(pace.aheadBy))}%`
            : null
        ]
          .filter(Boolean)
          .join('\n')
        return (
          <div key={key} className="space-y-0.5" title={title}>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="flex size-3.5 shrink-0 items-center justify-center">
                <ProviderIcon provider={key} />
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {label} · {name}
              </span>
              <span className="shrink-0 tabular-nums text-foreground">{left}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${barColor(used)}`}
                style={{ width: `${Math.max(left, 0)}%` }}
              />
            </div>
            {pace?.runsOutAt ? (
              <p className="text-[10.5px] text-amber-500">
                Theo nhịp này hết lúc {formatRunOutTime(pace.runsOutAt, now)}
                {resetIn ? ` · reset sau ${resetIn}` : ''}
              </p>
            ) : left < SHOW_RESET_BELOW_LEFT && resetIn ? (
              <p className="text-[10.5px] text-muted-foreground">Reset sau {resetIn}</p>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
