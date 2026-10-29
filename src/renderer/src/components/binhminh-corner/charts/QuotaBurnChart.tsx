import { useState } from 'react'
import type { QuotaPace, QuotaSample } from '../quota-pace'

const W = 252
const PLOT_H = 64
const AXIS_H = 14
const TOP = 4

const pad = (n: number): string => String(n).padStart(2, '0')

function tick(ms: number, long: boolean): string {
  const d = new Date(ms)
  return long
    ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Burn-down for one quota window: remaining % from window start to reset, the even-pace guide,
 * the actual line from recorded history, and the projection at the current rate.
 */
export function QuotaBurnChart({
  pace,
  used,
  history,
  now,
  title
}: {
  pace: QuotaPace
  used: number
  history: readonly QuotaSample[]
  now: number
  title: string
}): React.JSX.Element {
  const [hover, setHover] = useState<number | null>(null)
  const start = pace.startsAt
  const end = pace.startsAt + pace.lengthMs
  const long = pace.lengthMs > 24 * 60 * 60 * 1000
  const x = (t: number): number => ((Math.min(Math.max(t, start), end) - start) / pace.lengthMs) * W
  const y = (remaining: number): number =>
    TOP + (1 - Math.min(Math.max(remaining, 0), 100) / 100) * (PLOT_H - TOP)
  const recorded = history
    .filter((p) => p.t >= start && p.t < now)
    .map((p) => ({ t: p.t, rem: 100 - p.used }))
  // Why prepend the window start: a quota window begins with nothing used, so the line is anchored
  // there even before Orca has recorded any samples of this window.
  const actual = [
    ...(recorded.length === 0 || recorded[0]!.t > start ? [{ t: start, rem: 100 }] : []),
    ...recorded,
    { t: now, rem: 100 - used }
  ]
  const line = actual
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.rem).toFixed(1)}`)
    .join('')
  const area = `${line}L${x(now).toFixed(1)},${PLOT_H}L${x(actual[0]!.t).toFixed(1)},${PLOT_H}Z`
  const projEnd = pace.runsOutAt
    ? { t: pace.runsOutAt, rem: 0 }
    : { t: end, rem: 100 - pace.projectedAtReset }
  const risky = pace.runsOutAt !== null
  const nowX = x(now)
  const labels = [
    { x: 0, text: tick(start, long), anchor: 'start' as const },
    { x: nowX, text: 'bây giờ', anchor: 'middle' as const },
    { x: W, text: tick(end, long), anchor: 'end' as const }
  ].filter((l, i, all) => i !== 1 || (l.x - all[0]!.x > 40 && all[2]!.x - l.x > 40))
  const shown = hover !== null ? actual[hover] : null

  return (
    <figure className="m-0 space-y-1">
      <svg
        viewBox={`0 0 ${W} ${PLOT_H + AXIS_H}`}
        width="100%"
        role="img"
        aria-label={`${title}: còn ${Math.round(100 - used)}%${risky ? `, theo nhịp này hết lúc ${tick(pace.runsOutAt!, false)}` : ''}`}
        className="block overflow-visible"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const t = start + ((e.clientX - rect.left) / rect.width) * pace.lengthMs
          let best = 0
          actual.forEach((p, i) => {
            if (Math.abs(p.t - t) < Math.abs(actual[best]!.t - t)) {
              best = i
            }
          })
          setHover(best)
        }}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={0} x2={W} y1={PLOT_H} y2={PLOT_H} stroke="var(--w-border)" strokeWidth={1} />
        <line
          x1={0}
          y1={y(100)}
          x2={W}
          y2={y(0)}
          stroke="var(--w-text-3)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <path d={area} fill="var(--w-accent)" opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="var(--w-accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1={nowX}
          y1={y(100 - used)}
          x2={x(projEnd.t)}
          y2={y(projEnd.rem)}
          stroke={risky ? 'var(--w-warn)' : 'var(--w-accent)'}
          strokeWidth={1.5}
          strokeDasharray="1.5 3"
          strokeLinecap="round"
        />
        <line
          x1={nowX}
          x2={nowX}
          y1={0}
          y2={PLOT_H}
          stroke="var(--w-text-3)"
          strokeOpacity={0.6}
          strokeWidth={1}
        />
        {risky ? (
          <>
            <circle
              cx={x(projEnd.t)}
              cy={y(0)}
              r={3}
              fill="var(--w-warn)"
              stroke="var(--w-bg)"
              strokeWidth={2}
              paintOrder="stroke"
            />
            <text
              x={Math.min(Math.max(x(projEnd.t), 16), W - 16)}
              y={y(0) - 6}
              textAnchor="middle"
              fontSize={10}
              fill="var(--w-text-2)"
            >
              ~{tick(pace.runsOutAt!, false)}
            </text>
          </>
        ) : null}
        {shown ? (
          <circle
            cx={x(shown.t)}
            cy={y(shown.rem)}
            r={3}
            fill="var(--w-accent)"
            stroke="var(--w-bg)"
            strokeWidth={2}
            paintOrder="stroke"
          />
        ) : null}
        {labels.map((l) => (
          <text
            key={l.text}
            x={l.x}
            y={PLOT_H + AXIS_H - 2}
            textAnchor={l.anchor}
            fontSize={10}
            fill="var(--w-text-3)"
          >
            {l.text}
          </text>
        ))}
      </svg>
      <figcaption className="flex justify-between text-[10.5px] bm-t3">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-3 rounded"
            style={{ background: 'var(--w-accent)' }}
          />
          {shown ? `${tick(shown.t, false)} · còn ${Math.round(shown.rem)}%` : 'Còn lại'}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 border-t border-dashed"
            style={{ borderColor: 'var(--w-text-3)' }}
          />
          Nhịp đều
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          <tr>
            <th>Bắt đầu</th>
            <td>{tick(start, long)}</td>
          </tr>
          <tr>
            <th>Còn lại bây giờ</th>
            <td>{Math.round(100 - used)}%</td>
          </tr>
          <tr>
            <th>Dự báo lúc reset</th>
            <td>{Math.round(100 - pace.projectedAtReset)}% còn lại</td>
          </tr>
        </tbody>
      </table>
    </figure>
  )
}
