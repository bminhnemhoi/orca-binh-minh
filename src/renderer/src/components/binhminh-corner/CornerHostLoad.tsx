import { Cpu, MemoryStick } from 'lucide-react'
import { HOST_LOAD_HISTORY, useHostLoad } from './use-host-load'

const GB = 1024 ** 3

function levelClass(percent: number): string {
  return percent >= 90 ? 'bg-red-500' : percent >= 75 ? 'bg-yellow-500' : 'bg-emerald-500/80'
}

function textClass(percent: number): string {
  return percent >= 90 ? 'text-red-500' : percent >= 75 ? 'text-yellow-500' : 'text-foreground'
}

/** A 24-sample CPU line, drawn once per sample; no animation, so it costs nothing between ticks. */
function Sparkline({ values }: { values: readonly number[] }): React.JSX.Element {
  const width = 56
  const height = 14
  const step = width / (HOST_LOAD_HISTORY - 1)
  const offset = HOST_LOAD_HISTORY - values.length
  const points = values
    .map(
      (v, i) => `${((offset + i) * step).toFixed(1)},${(height - (v / 100) * height).toFixed(1)}`
    )
    .join(' ')
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0 text-muted-foreground">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

/** Whole-machine CPU and RAM, so a 16 GB laptop running several agents sees pressure early. */
export function CornerHostLoad(): React.JSX.Element | null {
  const { latest, cpuHistory } = useHostLoad(true)
  if (!latest) {
    return null
  }
  const ramPercent =
    latest.memoryTotalBytes > 0 ? (latest.memoryUsedBytes / latest.memoryTotalBytes) * 100 : 0
  const cpu = latest.cpuPercent
  return (
    <section aria-label="Tải máy" className="space-y-1.5 text-[11px]">
      <div
        className="flex items-center gap-1.5"
        title={`CPU cả máy (${latest.cpuCoreCount} luồng)`}
      >
        <Cpu className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="w-8 text-muted-foreground">CPU</span>
        <Sparkline values={cpuHistory} />
        <span className={`ml-auto tabular-nums ${cpu === null ? '' : textClass(cpu)}`}>
          {cpu === null ? '…' : `${Math.round(cpu)}%`}
        </span>
      </div>
      <div className="space-y-0.5" title="RAM cả máy, gồm mọi ứng dụng">
        <div className="flex items-center gap-1.5">
          <MemoryStick className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="w-8 text-muted-foreground">RAM</span>
          <span className={`ml-auto tabular-nums ${textClass(ramPercent)}`}>
            {(latest.memoryUsedBytes / GB).toFixed(1)} / {(latest.memoryTotalBytes / GB).toFixed(0)}{' '}
            GB
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${levelClass(ramPercent)}`}
            style={{ width: `${Math.min(100, ramPercent)}%` }}
          />
        </div>
        {ramPercent >= 90 ? (
          <p className="text-[10.5px] text-red-500">
            RAM gần đầy: đóng bớt agent đã xong hoặc ứng dụng không dùng.
          </p>
        ) : null}
      </div>
    </section>
  )
}
