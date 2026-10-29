import { ChevronDown, Cpu, Loader2, MemoryStick } from 'lucide-react'
import { useAppStore } from '@/store'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { AreaSparkline } from './charts/AreaSparkline'
import { HOST_LOAD_HISTORY, type HostLoadState } from './use-host-load'

const GB = 1024 ** 3
const gb = (bytes: number): string => (bytes / GB).toFixed(1)
const pad = (n: number): string => String(n).padStart(2, '0')
const clock = (t: number): string => {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Top memory/CPU consumers, read on demand: the snapshot runs a process sweep, too heavy to poll. */
function ConsumersPanel({ sortBy }: { sortBy: 'memory' | 'cpu' }): React.JSX.Element {
  const snapshot = useAppStore((s) => s.memorySnapshot)
  const rows = [...(snapshot?.worktrees ?? [])]
    .sort((a, b) => (sortBy === 'memory' ? b.memory - a.memory : b.cpu - a.cpu))
    .slice(0, 4)
  if (!snapshot) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] bm-t3">
        <Loader2 className="size-3 animate-spin" /> Đang đo từng workspace…
      </p>
    )
  }
  return (
    <div className="space-y-0.5">
      <p className="bm-label">
        Tốn {sortBy === 'memory' ? 'RAM' : 'CPU'} nhất · Orca {gb(snapshot.app.memory)} GB
      </p>
      {rows.length === 0 ? <p className="text-[11px] bm-t3">Chưa có agent nào đang chạy.</p> : null}
      {rows.map((w) => (
        <button
          key={w.worktreeId}
          type="button"
          onClick={() => activateAndRevealWorktree(w.worktreeId)}
          className="flex w-full cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-left text-[11px] hover:bg-[var(--w-surface-hover)]"
          title={`${w.repoName} · ${w.sessions.length} tiến trình`}
        >
          <span className="min-w-0 flex-1 truncate bm-t1">{w.worktreeName}</span>
          <span className="bm-num bm-t2">{gb(w.memory)} GB</span>
          <span className="w-10 text-right bm-num bm-t3">{Math.round(w.cpu)}%</span>
        </button>
      ))}
    </div>
  )
}

export function CornerSystemCard({
  load,
  detail,
  onDetail
}: {
  load: HostLoadState
  /** Which consumer list is open, controlled so an insight chip can open it too. */
  detail: 'memory' | 'cpu' | null
  onDetail: (detail: 'memory' | 'cpu' | null) => void
}): React.JSX.Element | null {
  const { latest, samples } = load
  if (!latest) {
    return null
  }
  const cpuSamples = samples.filter((s) => s.cpu !== null)
  const cpuValues = cpuSamples.map((s) => s.cpu!)
  const cpu = latest.cpuPercent
  const total = latest.memoryTotalBytes
  const used = latest.memoryUsedBytes
  const orca = Math.min(latest.orcaAppBytes, used)
  const parts = [
    { key: 'orca', label: 'Orca', bytes: orca, color: 'var(--w-accent)' },
    {
      key: 'other',
      label: 'App khác + agent',
      bytes: Math.max(used - orca, 0),
      color: 'var(--w-text-3)'
    },
    { key: 'free', label: 'Trống', bytes: Math.max(total - used, 0), color: 'var(--w-track)' }
  ]
  const ramPct = total > 0 ? (used / total) * 100 : 0
  const toggle = (next: 'memory' | 'cpu'): void => {
    const open = detail === next ? null : next
    onDetail(open)
    if (open) {
      void useAppStore.getState().fetchMemorySnapshot()
    }
  }

  return (
    <section aria-label="Tải máy" className="bm-card space-y-2.5 p-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1 bm-label">
            <Cpu className="size-3" /> CPU
          </div>
          <div className="text-[18px] font-semibold leading-[22px] bm-t1 bm-num">
            {cpu === null ? '…' : `${Math.round(cpu)}%`}
          </div>
          <AreaSparkline
            values={cpuValues}
            capacity={HOST_LOAD_HISTORY}
            width={116}
            threshold={85}
            ariaLabel={`CPU cả máy 5 phút gần nhất, hiện ${cpu === null ? 'chưa đo' : `${Math.round(cpu)}%`}`}
            describe={(i) => `${clock(cpuSamples[i]!.t)} · ${Math.round(cpuValues[i]!)}%`}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1 bm-label">
            <MemoryStick className="size-3" /> RAM
          </div>
          <div className="text-[18px] font-semibold leading-[22px] bm-t1">
            <span className="bm-num">{gb(used)}</span>
            <span className="text-[12px] font-normal bm-t3"> / {gb(total)} GB</span>
          </div>
          <div
            className="flex h-1.5 w-full gap-[2px] overflow-hidden"
            role="img"
            aria-label={parts.map((p) => `${p.label} ${gb(p.bytes)} GB`).join(', ')}
            title={`Đã dùng ${Math.round(ramPct)}%`}
          >
            {parts.map((p) =>
              p.bytes > 0 ? (
                <span
                  key={p.key}
                  className="h-full first:rounded-l-[var(--w-radius-bar)] last:rounded-r-[var(--w-radius-bar)]"
                  style={{ flexGrow: p.bytes, background: p.color }}
                />
              ) : null
            )}
          </div>
          <div className="flex flex-wrap gap-x-2 text-[10.5px] leading-[14px] bm-t2">
            {parts.map((p) => (
              <span key={p.key} className="flex items-center gap-1">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ background: p.color }}
                />
                {p.key === 'other' ? 'Khác' : p.label} <span className="bm-num">{gb(p.bytes)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-1">
        {(['memory', 'cpu'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            aria-expanded={detail === kind}
            className="flex h-6 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] bm-t2 hover:bg-[var(--w-surface-hover)]"
          >
            {kind === 'memory' ? 'Ai tốn RAM' : 'Ai tốn CPU'}
            <ChevronDown
              className={`size-3 transition-transform ${detail === kind ? 'rotate-180' : ''}`}
            />
          </button>
        ))}
      </div>
      {detail ? <ConsumersPanel sortBy={detail} /> : null}
    </section>
  )
}
