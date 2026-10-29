import { useId, useState } from 'react'

/**
 * A fixed-scale (0–100) area sparkline with a threshold line and a hover/keyboard crosshair.
 *
 * Why fixed scale: autoscaling would make 5% CPU look like a spike. Why no tweening: each sample
 * only swaps the path, so the compositor produces no frames between samples.
 */
export function AreaSparkline({
  values,
  capacity,
  width = 120,
  height = 28,
  threshold,
  ariaLabel,
  describe
}: {
  values: readonly number[]
  /** Slots on the x axis; newer samples fill from the right. */
  capacity: number
  width?: number
  height?: number
  threshold?: number
  ariaLabel: string
  /** Tooltip text for the sample at `index` (0 = oldest kept). */
  describe: (index: number) => string
}): React.JSX.Element {
  const gradientId = useId()
  const [focus, setFocus] = useState<number | null>(null)
  const pad = 3
  const plotH = height - pad * 2
  const step = width / Math.max(capacity - 1, 1)
  const offset = capacity - values.length
  const x = (i: number): number => (offset + i) * step
  const y = (v: number): number => pad + plotH - (Math.min(Math.max(v, 0), 100) / 100) * plotH
  const line = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join('')
  const area =
    values.length > 1
      ? `${line}L${x(values.length - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`
      : ''
  const last = values.length - 1
  const over = threshold !== undefined && values.length > 0 && values[last]! >= threshold
  const shown = focus ?? null

  const pick = (clientX: number, rect: DOMRect): void => {
    const i = Math.round(((clientX - rect.left) / rect.width) * (capacity - 1)) - offset
    setFocus(Math.min(Math.max(i, 0), last))
  }

  return (
    <div className="relative" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="block overflow-visible rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--w-accent)]"
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setFocus(null)}
        onFocus={() => setFocus(last)}
        onBlur={() => setFocus(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setFocus((f) => Math.max((f ?? last) - 1, 0))
          } else if (e.key === 'ArrowRight') {
            setFocus((f) => Math.min((f ?? last) + 1, last))
          }
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--w-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--w-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {threshold !== undefined ? (
          <>
            {over ? (
              <rect
                x={0}
                y={0}
                width={width}
                height={y(threshold)}
                fill="var(--w-crit)"
                opacity={0.08}
              />
            ) : null}
            <line
              x1={0}
              x2={width}
              y1={y(threshold)}
              y2={y(threshold)}
              stroke="var(--w-crit)"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          </>
        ) : null}
        {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
        {values.length > 1 ? (
          <path
            d={line}
            fill="none"
            stroke="var(--w-accent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {values.length > 0 ? (
          <circle
            cx={x(last)}
            cy={y(values[last]!)}
            r={2.5}
            fill="var(--w-accent)"
            stroke="var(--w-bg)"
            strokeWidth={2}
            paintOrder="stroke"
          />
        ) : null}
        {shown !== null ? (
          <line
            x1={x(shown)}
            x2={x(shown)}
            y1={0}
            y2={height}
            stroke="var(--w-text-3)"
            strokeWidth={1}
          />
        ) : null}
      </svg>
      {shown !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] bm-t1"
          style={{
            left: Math.min(Math.max(x(shown) - 40, -8), width - 72),
            background: 'var(--w-surface-hover)',
            border: '1px solid var(--w-border)'
          }}
        >
          {describe(shown)}
        </div>
      ) : null}
    </div>
  )
}
