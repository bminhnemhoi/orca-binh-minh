import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { launchAiVaultSessionInNewTab } from '@/lib/launch-ai-vault-session'
import { prepareAiVaultSessionForResume } from '@/lib/ai-vault-session-resume-preparation'
import { buildAiVaultResumeStartupForWorktree } from '@/lib/ai-vault-resume-command'
import { activateAiVaultStructuredSession } from '@/lib/activate-ai-vault-structured-session'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { activateTabAndFocusPane } from '@/lib/activate-tab-and-focus-pane'
import { draftAntigravitySignOut } from '@/lib/antigravity-sign-out-draft'
import { findOriginalAiVaultSessionPane } from '../right-sidebar/ai-vault-original-pane'
import { resolveAiVaultSessionLaunchTarget } from '../right-sidebar/ai-vault-session-launch-target'
import { AGENT_LAUNCH_ACCOUNT_ENV } from '../../../../shared/agent-launch-account'
import type { AiVaultSession } from '../../../../shared/ai-vault-types'
import type { TuiAgent } from '../../../../shared/tui-agent'
import type { WorktreeStartupLaunch } from '../../../../shared/worktree/launch-types'
import { deckAccountLaunchIsLocal, launchDeckAccountAgent } from './deck-account-agent-launch'
import { launchDeckAgentInPane, type DeckAgentSplitTarget } from './deck-agent-split'

/**
 * Opens agy for a sign-in or account switch. A signed-in agy gets `/logout` waiting in its input;
 * a signed-out one asks to sign in by itself.
 */
async function launchAntigravitySwitch(worktreeId: string, groupId: string): Promise<string> {
  const signedIn = Boolean(useAppStore.getState().rateLimits.antigravity?.accountEmail)
  // Why a tab of its own: the draft goes to the tab's first PTY, which in a split is another pane.
  const tabId = await launchDeckAccountAgent(
    worktreeId,
    groupId,
    'antigravity',
    undefined,
    undefined,
    null,
    'new-tab'
  )
  if (signedIn) {
    void draftAntigravitySignOut(tabId, () =>
      toast.message('Type /logout in agy and press Enter, then sign in to the other account.')
    )
  }
  return tabId
}

export async function launchDeckAgentSession(args: {
  agent: TuiAgent
  worktreeId: string
  groupId: string
  pane: DeckAgentSplitTarget | null
  accountId?: string
  session?: AiVaultSession
  login?: boolean
}): Promise<string | null> {
  const { agent, worktreeId, groupId, pane, accountId, session } = args
  const state = useAppStore.getState()
  const effectiveAccountId =
    accountId ??
    (agent === 'codex'
      ? (state.settings?.activeCodexManagedAccountIdsByRuntime?.host ??
        state.settings?.activeCodexManagedAccountId)
      : agent === 'claude' || agent === 'claude-agent-teams'
        ? (state.settings?.activeClaudeManagedAccountIdsByRuntime?.host ??
          state.settings?.activeClaudeManagedAccountId)
        : undefined)
  if (!session) {
    if (
      deckAccountLaunchIsLocal(worktreeId) &&
      (agent === 'claude' ||
        agent === 'claude-agent-teams' ||
        agent === 'codex' ||
        agent === 'antigravity')
    ) {
      if (args.login && agent === 'antigravity') {
        return launchAntigravitySwitch(worktreeId, groupId)
      }
      return launchDeckAccountAgent(
        worktreeId,
        groupId,
        agent,
        effectiveAccountId ?? undefined,
        undefined,
        pane
      )
    }
    if (pane) {
      await launchDeckAgentInPane(worktreeId, pane, agent)
      return pane.tabId
    }
    const result = launchAgentInNewTab({ agent, worktreeId, groupId })
    return result?.surface.kind === 'local-terminal' ? result.surface.tabId : null
  }
  if (session.agent !== (agent === 'claude-agent-teams' ? 'claude' : agent)) {
    throw new Error('Choose a session belonging to this agent.')
  }
  const target = resolveAiVaultSessionLaunchTarget({
    sessionFilePath: session.filePath,
    sessionExecutionHostId: session.executionHostId,
    activeWorktreeId: worktreeId,
    targetState: state
  })
  if (target.status !== 'ready') {
    throw new Error('This session must be opened on the host that owns it.')
  }
  if (session.structuredSession) {
    if (!(await activateAiVaultStructuredSession(session))) {
      throw new Error('This session could not be reopened.')
    }
    return null
  }
  const original = findOriginalAiVaultSessionPane(state, session)
  if (
    original &&
    state.agentStatusByPaneKey[original.paneKey]?.providerSession?.id === session.sessionId &&
    state.terminalLayoutsByTabId[original.tabId]?.ptyIdsByLeafId?.[original.leafId]
  ) {
    activateAndRevealWorktree(original.worktreeId)
    activateTabAndFocusPane(original.tabId, original.leafId)
    return original.tabId
  }
  const prepared = await prepareAiVaultSessionForResume(
    session,
    deckAccountLaunchIsLocal(worktreeId) ? (effectiveAccountId ?? undefined) : undefined
  )
  const resume = buildAiVaultResumeStartupForWorktree({
    state,
    worktreeId,
    session: prepared,
    commandOverride: state.settings?.agentCmdOverrides?.[agent]
  })
  const env = {
    ...resume.env,
    ...(effectiveAccountId && deckAccountLaunchIsLocal(worktreeId)
      ? { [AGENT_LAUNCH_ACCOUNT_ENV]: effectiveAccountId }
      : {})
  }
  const startup: WorktreeStartupLaunch = {
    command: resume.command,
    ...(resume.cwd ? { cwd: resume.cwd } : {}),
    env,
    ...(resume.envToDelete ? { envToDelete: resume.envToDelete } : {}),
    ...(resume.launchConfig
      ? {
          launchConfig: {
            ...resume.launchConfig,
            agentEnv: { ...resume.launchConfig.agentEnv, ...env }
          }
        }
      : {}),
    ...(resume.providerSession ? { resumeProviderSession: resume.providerSession } : {}),
    launchAgent: agent,
    startupCommandDelivery: 'shell-ready'
  }
  if (pane) {
    await launchDeckAgentInPane(worktreeId, pane, agent, {
      accountId,
      startup,
      sessionTitle: session.title
    })
    return pane.tabId
  }
  const launched = launchAiVaultSessionInNewTab({
    agent: session.agent,
    worktreeId,
    targetGroupId: groupId,
    ...resume,
    ...(startup.launchConfig ? { launchConfig: startup.launchConfig } : {}),
    env
  })
  if (launched.tabId === null) {
    const outcome = await launched.runtimeLaunch
    if (outcome.status === 'failed') {
      throw new Error(outcome.message || 'Could not resume this session.')
    }
    return null
  }
  state.setActiveTab(launched.tabId)
  if (session.agent === 'claude' || session.agent === 'codex') {
    state.setAiVaultTabTitle(launched.tabId, {
      agent: session.agent,
      sessionId: session.sessionId,
      title: session.title
    })
  }
  return launched.tabId
}
