import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CircleAlert, Lightbulb, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import {
  evaluateInsights,
  type HostSample,
  type Insight,
  type InsightMemory
} from './corner-insights'
import type { QuotaRow } from './quota-rows'

const SNOOZE_MS = 60 * 60 * 1000
const SNOOZE_KEY = 'binhminh.insightSnooze.v1'
/** Why 20 min: Arc-style auto-archive, long enough that a paused agent you return to is still awake. */
const HIBERNATE_IDLE_MS = 20 * 60 * 1000

function readSnoozes(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function CornerInsightChip({
  host,
  quota,
  onShowDetail
}: {
  host: readonly HostSample[]
  quota: readonly QuotaRow[]
  onShowDetail: (kind: 'memory' | 'cpu') => void
}): React.JSX.Element | null {
  const hibernationEnabled = useAppStore((s) => s.settings?.experimentalAgentHibernation === true)
  const memory = useRef<InsightMemory>({ ram: false, cpu: false })
  const [snoozes, setSnoozes] = useState(readSnoozes)
  const [insight, setInsight] = useState<Insight | null>(null)
  useEffect(() => {
    const result = evaluateInsights(
      { now: Date.now(), host, quota, hibernationEnabled, snoozedUntil: snoozes },
      memory.current
    )
    memory.current = result.memory
    setInsight(result.insight)
    // Why these deps: `host` changes once per 3 s sample and `quota` once per quota read (the
    // corner memoizes it), so the tip is re-evaluated per new reading, not per render.
  }, [host, quota, hibernationEnabled, snoozes])

  if (!insight) {
    return null
  }
  const Icon =
    insight.level === 'crit' ? CircleAlert : insight.level === 'warn' ? AlertTriangle : Lightbulb
  const iconColor =
    insight.level === 'crit'
      ? 'var(--w-crit)'
      : insight.level === 'warn'
        ? 'var(--w-warn)'
        : 'var(--w-accent)'

  const snooze = (): void => {
    const next = { ...snoozes, [insight.id]: Date.now() + SNOOZE_MS }
    setSnoozes(next)
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(next))
    } catch {
      // Snooze still holds for this session.
    }
  }
  const act = (): void => {
    const action = insight.action?.kind
    if (action === 'enable-hibernation') {
      void useAppStore
        .getState()
        .updateSettings({
          experimentalAgentHibernation: true,
          agentHibernationIdleMs: HIBERNATE_IDLE_MS
        })
        .then(() =>
          toast.success(
            'Đã bật tự ngủ: agent xong việc và rảnh 20 phút sẽ được cho ngủ để giải phóng RAM.'
          )
        )
    } else if (action === 'show-memory' || action === 'show-cpu') {
      onShowDetail(action === 'show-memory' ? 'memory' : 'cpu')
    }
  }

  return (
    <div
      key={insight.id}
      className="bm-chip bm-enter"
      data-level={insight.level === 'info' ? undefined : insight.level}
      style={
        insight.level === 'info'
          ? { background: 'var(--w-surface)', border: '1px solid var(--w-border)' }
          : undefined
      }
      role="status"
    >
      <Icon className="size-3.5 shrink-0" style={{ color: iconColor }} aria-hidden />
      <span className="min-w-0 flex-1 bm-t1" title={insight.detail}>
        {insight.text}
      </span>
      {insight.action ? (
        <button type="button" className="bm-chip-action" onClick={act}>
          {insight.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Ẩn 1 giờ"
        title="Ẩn 1 giờ"
        onClick={snooze}
        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded bm-t3 hover:bg-[var(--w-surface-hover)]"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
