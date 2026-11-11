import type { AppState } from '@/store/types'
import { getRemoteRuntimePtyEnvironmentId } from '@/runtime/runtime-terminal-stream'
import { isExpectedAgentProcess } from '../../../shared/agent-process-recognition'
import { parseAppSshPtyId } from '../../../shared/ssh-pty-id'
import { TUI_AGENT_CONFIG } from '../../../shared/tui-agent-config'

type LivePaneState = Pick<AppState, 'tabsByWorktree' | 'terminalLayoutsByTabId'>

export type RunningAntigravityPane = { worktreeId: string; tabId: string; leafId: string }

/**
 * Panes where agy is the foreground process right now.
 *
 * Why it matters: agy keeps one Google sign-in for the whole machine, so signing out from one pane
 * signs out every other agy too (antigravity-cli#1261). A switch waits until these are quit.
 * Why ask each PTY rather than trust how the tab started: a tab launched as Antigravity keeps its
 * shell after agy exits and stays marked that way, while an agy typed by hand into a plain terminal
 * is not marked at all. Remote and SSH panes run under another machine's sign-in and are skipped.
 */
export async function findRunningAntigravityPanes(
  state: LivePaneState,
  foregroundOf: (ptyId: string) => Promise<string | null> = (ptyId) =>
    window.api.pty.confirmForegroundProcess(ptyId)
): Promise<RunningAntigravityPane[]> {
  const expected = TUI_AGENT_CONFIG.antigravity.expectedProcess
  const panes: (RunningAntigravityPane & { ptyId: string })[] = []
  for (const [worktreeId, tabs] of Object.entries(state.tabsByWorktree)) {
    for (const tab of tabs) {
      const ptys = state.terminalLayoutsByTabId[tab.id]?.ptyIdsByLeafId ?? {}
      for (const [leafId, ptyId] of Object.entries(ptys)) {
        if (ptyId && !getRemoteRuntimePtyEnvironmentId(ptyId) && !parseAppSshPtyId(ptyId)) {
          panes.push({ worktreeId, tabId: tab.id, leafId, ptyId })
        }
      }
    }
  }
  const checked = await Promise.all(
    panes.map(async ({ ptyId, ...pane }) => {
      const processName = await foregroundOf(ptyId).catch(() => null)
      return isExpectedAgentProcess(processName, expected) ? pane : null
    })
  )
  return checked.filter((pane): pane is RunningAntigravityPane => pane !== null)
}
