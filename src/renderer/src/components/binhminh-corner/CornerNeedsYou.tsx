import { useEffect, useMemo } from 'react'
import { AgentIcon } from '@/lib/agent-catalog'
import { useLiveDashboardSnapshot } from '../dashboard/useLiveDashboardSnapshot'
import { revealDashboardAgent } from '../dashboard/reveal-dashboard-agent'
import type { DashboardCard, DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import type { TuiAgent } from '../../../../shared/tui-agent'

const MAX_ROWS = 4

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
 * Agents waiting for the user, each one click from its pane.
 *
 * Why mounted only while something waits: the live dashboard snapshot subscribes to many store
 * slices, so the corner pays for it only when there is something to show. `showList` false keeps
 * it headless, so the pet can still jump to the first waiting agent.
 */
export function CornerNeedsYou({
  showList,
  onFirstTarget
}: {
  showList: boolean
  onFirstTarget: (target: DashboardRevealAgentArgs | null) => void
}): React.JSX.Element | null {
  const snapshot = useLiveDashboardSnapshot()
  const waiting = useMemo(
    () => snapshot.cards.filter((card) => card.bucket === 'attention'),
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
      className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-1.5"
    >
      <p className="px-1 text-[11px] font-medium text-amber-500">Cần bạn ({waiting.length})</p>
      {waiting.slice(0, MAX_ROWS).map((card) => (
        <button
          key={card.paneKey}
          type="button"
          onClick={() => revealDashboardAgent(revealArgs(card))}
          className="flex w-full cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] outline-none hover:bg-accent/60 focus-visible:ring-1 focus-visible:ring-ring"
          title={card.task || card.worktreeName}
        >
          <AgentIcon agent={card.agentType as TuiAgent} size={12} />
          <span className="shrink-0 font-medium text-foreground">{card.worktreeName}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{card.task}</span>
        </button>
      ))}
      {waiting.length > MAX_ROWS ? (
        <p className="px-1 text-[10.5px] text-muted-foreground">
          và {waiting.length - MAX_ROWS} agent khác
        </p>
      ) : null}
    </section>
  )
}
