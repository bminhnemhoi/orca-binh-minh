import type { QuotaRow } from './quota-rows'
import { quotaWindowTitle, roomiestRow } from './quota-rows'
import { formatDurationVi, formatRunOutTime } from './quota-pace'

export type InsightAction = 'enable-hibernation' | 'show-memory' | 'show-cpu'

export type Insight = {
  id: string
  level: 'info' | 'warn' | 'crit'
  text: string
  /** The numbers behind the tip, shown on hover ("Vì sao?"). */
  detail: string
  action: { kind: InsightAction; label: string } | null
}

export type HostSample = { t: number; cpu: number | null; availableBytes: number }

/** Hysteresis memory: an alert stays on until its exit threshold, so it never flickers. */
export type InsightMemory = { ram: boolean; cpu: boolean }

export type InsightInput = {
  now: number
  host: readonly HostSample[]
  quota: readonly QuotaRow[]
  hibernationEnabled: boolean
  snoozedUntil: Readonly<Record<string, number>>
}

const GB = 1024 ** 3
const WINDOW_MS = 30_000
export const RAM_WARN_BELOW = 2.5 * GB
export const RAM_CLEAR_ABOVE = 3.2 * GB
export const RAM_CRIT_BELOW = 1.2 * GB
export const CPU_WARN_AT = 85
export const CPU_CLEAR_BELOW = 70

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

function quotaTip(row: QuotaRow, rows: readonly QuotaRow[], now: number): Insight {
  const w = row.tight
  const name = quotaWindowTitle(row, w)
  const left = Math.round(100 - w.window.usedPercent)
  const reset = w.window.resetsAt ? formatDurationVi(w.window.resetsAt - now) : null
  const alt = roomiestRow(rows, row)
  const altText = alt
    ? ` Còn ${Math.round(100 - alt.tight.window.usedPercent)}% ở ${alt.name}${alt.pool ? ` · ${alt.pool}` : ''}.`
    : ''
  const text =
    w.pace?.runsOutAt && w.window.resetsAt
      ? `${name} hết lúc ${formatRunOutTime(w.pace.runsOutAt, now)}, sớm ${formatDurationVi(w.window.resetsAt - w.pace.runsOutAt)} so với reset.${altText}`
      : `${name} chỉ còn ${left}%.${altText}`
  return {
    id: `quota:${row.key}:${w.label}`,
    level: row.level === 'crit' ? 'crit' : 'warn',
    text,
    detail: `Còn ${left}%${reset ? ` · reset sau ${reset}` : ''}${w.pace ? ` · tốc độ ${Math.round(w.pace.ratePerHour)}%/giờ (${w.pace.rateSource === 'recent' ? 'gần đây' : 'trung bình'})` : ''}`,
    action: null
  }
}

/**
 * The single most useful tip right now, by priority: RAM critical > quota critical > RAM >
 * quota > CPU > "use it before it resets". Agents waiting on the user are shown separately.
 */
export function evaluateInsights(
  input: InsightInput,
  memory: InsightMemory
): { insight: Insight | null; memory: InsightMemory } {
  const { now, host } = input
  const recent = host.filter((s) => s.t >= now - WINDOW_MS)
  const available = mean(recent.map((s) => s.availableBytes))
  const cpu = mean(recent.flatMap((s) => (s.cpu === null ? [] : [s.cpu])))
  const ram =
    available === null
      ? memory.ram
      : memory.ram
        ? available < RAM_CLEAR_ABOVE
        : available < RAM_WARN_BELOW
  const cpuHot =
    cpu === null ? memory.cpu : memory.cpu ? cpu >= CPU_CLEAR_BELOW : cpu >= CPU_WARN_AT
  const next: InsightMemory = { ram, cpu: cpuHot }

  const candidates: Insight[] = []
  if (ram && available !== null) {
    const crit = available < RAM_CRIT_BELOW
    candidates.push({
      id: crit ? 'ram:crit' : 'ram:warn',
      level: crit ? 'crit' : 'warn',
      text: `RAM chỉ còn ${(available / GB).toFixed(1)} GB trống.${input.hibernationEnabled ? '' : ' Agent đã xong vẫn giữ terminal và RAM.'}`,
      detail: `Trung bình 30 giây: còn ${(available / GB).toFixed(2)} GB. Cảnh báo dưới 2,5 GB, nguy hiểm dưới 1,2 GB.`,
      action: input.hibernationEnabled
        ? { kind: 'show-memory', label: 'Xem chi tiết' }
        : { kind: 'enable-hibernation', label: 'Tự ngủ agent' }
    })
  }
  const quotaRows = [...input.quota].filter((r) => r.level !== 'ok' && r.staleForMs === null)
  for (const row of quotaRows) {
    candidates.push(quotaTip(row, input.quota, now))
  }
  if (cpuHot && cpu !== null) {
    candidates.push({
      id: 'cpu',
      level: 'warn',
      text: `CPU ở mức ${Math.round(cpu)}% suốt 30 giây.`,
      detail: 'Trung bình 30 giây của CPU cả máy. Cảnh báo từ 85%, tắt khi xuống dưới 70%.',
      action: { kind: 'show-cpu', label: 'Xem chi tiết' }
    })
  }
  for (const row of input.quota) {
    const w = row.long
    if (!w?.window.resetsAt || row.level !== 'ok' || row.staleForMs !== null) {
      continue
    }
    const left = 100 - w.window.usedPercent
    const until = w.window.resetsAt - now
    if (left >= 30 && until > 0 && until < 12 * 60 * 60 * 1000) {
      candidates.push({
        id: `use:${row.key}`,
        level: 'info',
        text: `${row.name}${row.pool ? ` · ${row.pool}` : ''} · tuần còn ${Math.round(left)}%, reset sau ${formatDurationVi(until)}. Tranh thủ chạy việc dài.`,
        detail: 'Phần hạn mức tuần chưa dùng sẽ mất khi reset.',
        action: null
      })
    }
  }
  const rank = (i: Insight): number =>
    i.id === 'ram:crit'
      ? 0
      : i.id.startsWith('quota:') && i.level === 'crit'
        ? 1
        : i.id === 'ram:warn'
          ? 2
          : i.id.startsWith('quota:')
            ? 3
            : i.id === 'cpu'
              ? 4
              : 5
  const visible = candidates
    .filter((i) => (input.snoozedUntil[i.id] ?? 0) <= now)
    .sort((a, b) => rank(a) - rank(b))
  return { insight: visible[0] ?? null, memory: next }
}
