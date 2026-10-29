import { useEffect, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AgentIcon } from '@/lib/agent-catalog'
import { useLiveDashboardSnapshot } from '../dashboard/useLiveDashboardSnapshot'
import { revealDashboardAgent } from '../dashboard/reveal-dashboard-agent'
import type { DashboardCard, DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import type { TuiAgent } from '../../../../shared/tui-agent'
import { formatDurationVi } from './quota-pace'
import { useNow } from './use-window-attention'

const MAX_ROWS = 3

function revealArgs(card: DashboardCard): DashboardRevealAgentArgs {
  return {
    repoId: card.repoId,
    worktreeId: card.worktreeId,
    tabId: card.tabId,
    leafId: card.leafId,
    ...(card.executionHostId ? { executionHostId: card.executionHostId } : {})
  }
}

/**
 * Agents waiting for the user, longest wait first, each one click from its pane.
 *
 * Why mounted only while something waits: the live dashboard snapshot subscribes to many store
 * slices, so the corner pays for it only when there is something to show. `showList` false keeps
 * it headless, so the pet can still jump to the agent that has waited longest.
 */
export function CornerNeedsYou({
  showList,
  onFirstTarget
}: {
  showList: boolean
  onFirstTarget: (target: DashboardRevealAgentArgs | null) => void
}): React.JSX.Element | null {
  const snapshot = useLiveDashboardSnapshot()
  const now = useNow(30_000)
  const waiting = useMemo(
    () =>
      snapshot.cards
        .filter((card) => card.bucket === 'attention')
        .sort((a, b) => a.stateChangedAt - b.stateChangedAt),
    [snapshot.cards]
  )
  const first = waiting[0]
  // Why primitives as dependencies: the snapshot may rebuild card objects on unrelated store
  // writes; reporting a "new" target each time would re-render the corner in a loop.
  const repoId = first?.repoId
  const worktreeId = first?.worktreeId
  const tabId = first?.tabId
  const leafId = first?.leafId ?? null
  const executionHostId = first?.executionHostId
  useEffect(() => {
    onFirstTarget(
      repoId && worktreeId && tabId
        ? { repoId, worktreeId, tabId, leafId, ...(executionHostId ? { executionHostId } : {}) }
        : null
    )
  }, [repoId, worktreeId, tabId, leafId, executionHostId, onFirstTarget])
  useEffect(() => () => onFirstTarget(null), [onFirstTarget])
  if (!showList || waiting.length === 0) {
    return null
  }
  return (
    <section
      aria-label="Agent cần bạn"
      className="bm-chip flex-col items-stretch gap-0.5"
      data-level="warn"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium bm-t1">
        <AlertTriangle className="size-3.5" style={{ color: 'var(--w-warn)' }} aria-hidden />
        Cần bạn trả lời ({waiting.length})
      </p>
      {waiting.slice(0, MAX_ROWS).map((card) => (
        <button
          key={card.paneKey}
          type="button"
          onClick={() => revealDashboardAgent(revealArgs(card))}
          className="bm-enter flex h-6 w-full cursor-pointer items-center gap-1.5 rounded px-1 text-left text-[11px] hover:bg-[var(--w-surface-hover)]"
          title={card.task || card.worktreeName}
        >
          <AgentIcon agent={card.agentType as TuiAgent} size={12} />
          <span className="max-w-[45%] shrink-0 truncate font-medium bm-t1">
            {card.worktreeName}
          </span>
          <span className="min-w-0 flex-1 truncate bm-t3">{card.task}</span>
          <span className="shrink-0 bm-num bm-t2">
            {formatDurationVi(Math.max(now - card.stateChangedAt, 0))}
          </span>
        </button>
      ))}
      {waiting.length > MAX_ROWS ? (
        <p className="px-1 text-[10.5px] bm-t3">+{waiting.length - MAX_ROWS} agent khác</p>
      ) : null}
    </section>
  )
}
