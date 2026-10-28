import type { AppState } from '@/store/types'

type LivePaneState = Pick<
  AppState,
  'tabsByWorktree' | 'terminalLayoutsByTabId' | 'agentStatusByPaneKey'
>

function tabHasLivePty(state: LivePaneState, tabId: string, leafId?: string): boolean {
  const ptys = state.terminalLayoutsByTabId[tabId]?.ptyIdsByLeafId
  if (!ptys) {
    return false
  }
  return leafId === undefined ? Object.values(ptys).some(Boolean) : Boolean(ptys[leafId])
}

/**
 * Tabs that still run an Antigravity CLI.
 *
 * Why it matters: agy keeps one Google sign-in for the whole machine, so signing out from one pane
 * signs out every other agy too (antigravity-cli#1261). A switch waits until these are closed.
 * Counts tabs Orca launched as Antigravity plus panes whose live hook status reports agy, so an
 * agy typed by hand into a plain terminal is caught as well.
 */
export function listLiveAntigravityTabIds(state: LivePaneState): string[] {
  const tabIds = new Set<string>()
  for (const tabs of Object.values(state.tabsByWorktree)) {
    for (const tab of tabs) {
      if (tab.launchAgent === 'antigravity' && tabHasLivePty(state, tab.id)) {
        tabIds.add(tab.id)
      }
    }
  }
  for (const entry of Object.values(state.agentStatusByPaneKey)) {
    if (entry.agentType !== 'antigravity') {
      continue
    }
    const separator = entry.paneKey.indexOf(':')
    if (separator <= 0) {
      continue
    }
    const tabId = entry.paneKey.slice(0, separator)
    if (tabHasLivePty(state, tabId, entry.paneKey.slice(separator + 1))) {
      tabIds.add(tabId)
    }
  }
  return [...tabIds]
}
