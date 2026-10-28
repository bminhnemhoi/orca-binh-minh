import { useAppStore } from '@/store'
import { useResetCountdownClock } from '@/hooks/useResetCountdownClock'
import { getTightestUsageSection } from '../status-bar/UsageRosterPanel'
import { barColor, formatResetCountdown, ProviderIcon } from '../status-bar/tooltip'
import { clampUsedPercent } from '../../../../shared/usage-percentage-display'
import type { ProviderRateLimits, RateLimitState } from '../../../../shared/rate-limit-types'
import { computeQuotaPace, formatClockTime } from './quota-pace'

const PROVIDERS = [
  { key: 'claude', label: 'Claude' },
  { key: 'codex', label: 'Codex' },
  { key: 'antigravity', label: 'Antigravity' }
] as const

type QuotaRow = {
  key: string
  label: string
  usage: ProviderRateLimits
  section: NonNullable<ReturnType<typeof getTightestUsageSection>>
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
    const section = usage && usage.status !== 'unavailable' ? getTightestUsageSection(usage) : null
    if (usage && section) {
      rows.push({ key: provider.key, label: provider.label, usage, section })
    }
  }
  return rows
}

/**
 * One line per subscription: how much is left of the tightest window, when it resets, and a
 * warning when the current pace would run out first. The data is the same rate-limit state the
 * status bar polls, so this card adds no requests.
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
        const pace = computeQuotaPace(section.window, now)
        const reset = section.window.resetsAt
          ? formatResetCountdown(section.window.resetsAt - now)
          : null
        const title = [
          `${label} · ${section.label}`,
          usage.accountEmail ?? null,
          reset,
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
                {label} · {section.label}
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
                Theo nhịp này hết lúc {formatClockTime(pace.runsOutAt)}
              </p>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
