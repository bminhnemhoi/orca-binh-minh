import { useState } from 'react'
import { AlertTriangle, ChevronDown, CircleAlert } from 'lucide-react'
import { useAppStore } from '@/store'
import { useResetCountdownClock } from '@/hooks/useResetCountdownClock'
import { ProviderIcon } from '../status-bar/tooltip'
import { QuotaBurnChart } from './charts/QuotaBurnChart'
import { readQuotaSeries } from './quota-history'
import { describePace, formatDurationVi, formatRunOutTime, quotaWindowName } from './quota-pace'
import { buildQuotaRows, type QuotaRow, type QuotaRowWindow } from './quota-rows'
import { quotaSections } from './quota-sections'

function Bar({
  w,
  height,
  now
}: {
  w: QuotaRowWindow
  height: number
  now: number
}): React.JSX.Element {
  const left = Math.max(0, 100 - w.window.usedPercent)
  const evenLeft = w.pace
    ? Math.max(0, 100 - ((now - w.pace.startsAt) / w.pace.lengthMs) * 100)
    : null
  return (
    <div className="bm-track" style={{ height }}>
      <div
        className="bm-fill"
        data-level={w.level === 'ok' ? undefined : w.level}
        style={{ transform: `scaleX(${left / 100})` }}
      />
      {evenLeft !== null && w.window.usedPercent < 100 ? (
        <span
          className="bm-pace-tick"
          style={{ left: `${evenLeft}%`, top: -3, bottom: -3 }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

function StatusLine({ row, now }: { row: QuotaRow; now: number }): React.JSX.Element {
  const w = row.tight
  const reset = w.window.resetsAt ? formatDurationVi(w.window.resetsAt - now) : null
  if (row.level !== 'ok') {
    const Icon = row.level === 'crit' ? CircleAlert : AlertTriangle
    const text = w.pace?.runsOutAt
      ? `Hết lúc ${formatRunOutTime(w.pace.runsOutAt, now)}${reset ? ` · reset sau ${reset}` : ''}`
      : `Còn ${Math.round(100 - w.window.usedPercent)}%${reset ? ` · reset sau ${reset}` : ''}`
    return (
      <p className="flex items-center gap-1 text-[11px] bm-t2">
        <Icon
          className="size-3 shrink-0"
          style={{ color: row.level === 'crit' ? 'var(--w-crit)' : 'var(--w-warn)' }}
          aria-label={row.level === 'crit' ? 'Nguy hiểm' : 'Cảnh báo'}
        />
        {text}
      </p>
    )
  }
  return (
    <p className="text-[11px] bm-t3">
      {w.pace ? describePace(w.pace.aheadBy) : 'Chưa đủ dữ liệu nhịp'}
      {w.pace && w.window.windowMinutes > 600 && w.window.resetsAt
        ? ` · ~${Math.round((100 - w.window.usedPercent) / Math.max((w.window.resetsAt - now) / 86_400_000, 1))}%/ngày là vừa`
        : ''}
    </p>
  )
}

/**
 * One row per subscription pool: a thick bar for the short window, a hairline bar for the
 * weekly one, each with an even-pace tick, and a line that only turns amber/red when the pace
 * actually threatens the reset. Rows expand into a burn-down chart.
 */
export function CornerQuotaCard(): React.JSX.Element | null {
  const limits = useAppStore((s) => s.rateLimits)
  const [open, setOpen] = useState<string | null>(null)
  // Why reset times straight from the state: the countdown clock must not depend on `now`.
  const now = useResetCountdownClock(
    (['claude', 'codex', 'antigravity'] as const).flatMap((p) => {
      const usage = limits[p]
      return usage ? quotaSections(usage).map((s) => s.window.resetsAt) : []
    })
  )
  const rows = buildQuotaRows(limits, now, (provider, section) =>
    readQuotaSeries(provider, section.label, section.window)
  )
  if (rows.length === 0) {
    return null
  }
  return (
    <section aria-label="Hạn mức" className="bm-card divide-y divide-[var(--w-border)]">
      {rows.map((row) => {
        const head = row.short ?? row.long!
        const leftPct = Math.round(100 - head.window.usedPercent)
        const reset = head.window.resetsAt ? formatDurationVi(head.window.resetsAt - now) : null
        const expanded = open === row.key
        const chartWindow = row.tight
        return (
          <div
            key={row.key}
            className="space-y-1.5 px-2.5 py-2"
            style={{ opacity: row.staleForMs ? 0.6 : 1 }}
            data-active={expanded || undefined}
          >
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : row.key)}
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center gap-1.5 text-left"
              title={row.accountEmail ?? undefined}
            >
              <span className="flex size-3.5 shrink-0 items-center justify-center">
                <ProviderIcon provider={row.provider} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium bm-t1">
                {row.name}
                {row.pool ? <span className="font-normal bm-t3"> · {row.pool}</span> : null}
              </span>
              <span className="shrink-0 text-[11.5px] bm-num bm-t1">
                {leftPct}%{reset ? <span className="bm-t3"> · {reset}</span> : null}
              </span>
              <ChevronDown
                className={`size-3 shrink-0 bm-t3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {row.short ? <Bar w={row.short} height={6} now={now} /> : null}
            {row.long ? <Bar w={row.long} height={3} now={now} /> : null}
            <StatusLine row={row} now={now} />
            {row.staleForMs ? (
              <p className="text-[10.5px] bm-t3">
                Cập nhật {formatDurationVi(row.staleForMs)} trước
              </p>
            ) : null}
            {expanded && chartWindow.pace ? (
              <div className="bm-enter pt-1">
                <QuotaBurnChart
                  pace={chartWindow.pace}
                  used={chartWindow.window.usedPercent}
                  history={readQuotaSeries(row.provider, chartWindow.label, chartWindow.window)}
                  now={now}
                  title={`${row.name}${row.pool ? ` ${row.pool}` : ''} · ${quotaWindowName(chartWindow.label, chartWindow.window.windowMinutes)}`}
                />
                <p className="pt-1 text-[10.5px] bm-t3">
                  Tốc độ {Math.round(chartWindow.pace.ratePerHour)}%/giờ (
                  {chartWindow.pace.rateSource === 'average'
                    ? 'trung bình từ đầu khung'
                    : chartWindow.window.windowMinutes <= 600
                      ? 'theo 30 phút gần nhất'
                      : 'theo 24 giờ gần nhất'}
                  ) · dự báo lúc reset còn {Math.round(100 - chartWindow.pace.projectedAtReset)}%
                </p>
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
