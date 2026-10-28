import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, RefreshCw, Settings } from 'lucide-react'
import { useAppStore } from '@/store'
import { AgentIcon, getAgentLabel } from '@/lib/agent-catalog'
import { getCodexAccountDisplayLabel } from '@/lib/codex-account-display-label'
import { getUsageRosterRowState } from '../status-bar/usage-roster-row-state'
import { getTightestUsageSection } from '../status-bar/UsageRosterPanel'
import { Button } from '../ui/button'
import { DeckAccountUsage } from './DeckAccountUsage'
import { listLiveAntigravityTabIds } from '@/lib/antigravity-live-panes'
import {
  forgetAntigravityKnownAccount,
  orderAntigravityKnownAccounts
} from '../../../../shared/antigravity-known-accounts'
import type { DeckAccountAgent } from './deck-account-agent-launch'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'

export function accountNeedsSignIn(usage: ProviderRateLimits | null): boolean {
  return Boolean(
    usage &&
    (getUsageRosterRowState(usage, false).kind === 'sign-in' ||
      usage.usageMetadata?.failureKind === 'stale-token')
  )
}

export function DeckAgentAccountPicker({
  agent,
  local,
  onLaunch,
  onClose
}: {
  agent: DeckAccountAgent
  local: boolean
  onLaunch: (accountId?: string, login?: boolean) => void
  onClose: () => void
}): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const limits = useAppStore((s) => s.rateLimits)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  // Why a confirmation step for Antigravity only: agy has one Google sign-in per machine, so
  // choosing another account signs every agy out. undefined = no switch pending, null = new account.
  const [pendingSwitch, setPendingSwitch] = useState<string | null | undefined>(undefined)
  const liveAntigravityTabs = useAppStore((s) =>
    agent === 'antigravity' ? listLiveAntigravityTabIds(s).length : 0
  )
  const antigravityEmail =
    agent === 'antigravity' ? (limits.antigravity?.accountEmail ?? null) : null
  const antigravityId = (email: string): string => `agy:${email}`
  const activeId =
    agent === 'claude'
      ? (settings?.activeClaudeManagedAccountIdsByRuntime?.host ??
        settings?.activeClaudeManagedAccountId)
      : agent === 'codex'
        ? (settings?.activeCodexManagedAccountIdsByRuntime?.host ??
          settings?.activeCodexManagedAccountId)
        : antigravityEmail
          ? antigravityId(antigravityEmail)
          : null
  const accounts = !local
    ? []
    : agent === 'antigravity'
      ? orderAntigravityKnownAccounts(settings?.antigravityKnownAccounts, antigravityEmail).map(
          (email) => ({
            id: antigravityId(email),
            label: email,
            detail: email === antigravityEmail ? 'Signed in to agy' : 'Switch to this account'
          })
        )
      : agent === 'claude'
        ? (settings?.claudeManagedAccounts ?? [])
            .filter((a) => a.managedAuthRuntime !== 'wsl')
            .map((a) => ({ id: a.id, label: a.email, detail: a.organizationName }))
        : (settings?.codexManagedAccounts ?? [])
            .filter((a) => a.managedHomeRuntime !== 'wsl')
            .map((a) => ({
              id: a.id,
              label: getCodexAccountDisplayLabel(a, settings?.codexManagedAccounts ?? []),
              detail: a.workspaceLabel
            }))
  const usageForAccount = (id: string | null): ProviderRateLimits | null => {
    if (agent === 'antigravity') {
      // Why only the signed-in account: agy reports quota for the one account it is signed in to.
      return id === null || id === activeId ? limits.antigravity : null
    }
    if (id === null || id === (activeId ?? null)) {
      return limits[agent]
    }
    const roster = agent === 'claude' ? limits.inactiveClaudeAccounts : limits.inactiveCodexAccounts
    return roster.find((a) => a.accountId === id)?.rateLimits ?? null
  }
  const selectedUsage = usageForAccount(selectedId)
  const signedOut = accountNeedsSignIn(selectedUsage)

  useEffect(() => {
    const state = useAppStore.getState()
    setSelectedId(activeId ?? null)
    if (local && agent === 'claude') {
      void state.fetchInactiveClaudeAccountUsage().catch(() => {})
    }
    if (local && agent === 'codex') {
      void state.fetchInactiveCodexAccountUsage().catch(() => {})
    }
  }, [agent, local, activeId])

  const openAccounts = (): void => {
    onClose()
    const state = useAppStore.getState()
    state.openSettingsTarget({
      pane: agent === 'antigravity' ? 'agents' : 'accounts',
      repoId: null,
      sectionId: `accounts-${agent}`
    })
    state.openSettingsPage()
  }
  const reauthenticate = async (): Promise<void> => {
    if (!selectedId || agent === 'antigravity' || busyRef.current) {
      return
    }
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await (agent === 'claude'
        ? window.api.claudeAccounts.reauthenticate({ accountId: selectedId })
        : window.api.codexAccounts.reauthenticate({
            accountId: selectedId,
            activateIfSelectionWasEmpty: false
          }))
      const state = useAppStore.getState()
      await state.fetchSettings()
      await (agent === 'claude'
        ? state.fetchInactiveClaudeAccountUsage()
        : state.fetchInactiveCodexAccountUsage())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in. Try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const previewAccount = (id: string | null): void => {
    if (!busyRef.current) {
      setSelectedId(id)
      setError(null)
    }
  }
  const launchAccount = (id: string | null): void => {
    if (busyRef.current) {
      return
    }
    previewAccount(id)
    if (agent === 'antigravity' && id !== null && id !== activeId) {
      setPendingSwitch(id.slice('agy:'.length))
      return
    }
    if (accountNeedsSignIn(usageForAccount(id))) {
      return
    }
    busyRef.current = true
    setBusy(true)
    // Why no id for Antigravity: agy picks its own account; an account env var would be recorded as
    // a pinned Codex pane (spawn-commit-persist.ts).
    onLaunch(agent === 'antigravity' ? undefined : (id ?? undefined))
  }
  const confirmAntigravitySwitch = (): void => {
    if (busyRef.current || liveAntigravityTabs > 0) {
      return
    }
    busyRef.current = true
    setBusy(true)
    onLaunch(undefined, true)
  }
  const forgetAntigravityAccount = (email: string): void => {
    void useAppStore.getState().updateSettings({
      antigravityKnownAccounts: forgetAntigravityKnownAccount(
        settings?.antigravityKnownAccounts,
        email
      )
    })
    setPendingSwitch(undefined)
  }
  const hideDefaultRow = agent === 'antigravity' && local && antigravityEmail !== null
  const previewLabel =
    accounts.find((a) => a.id === selectedId)?.label ??
    (agent === 'antigravity' ? 'Current agy account' : 'Orca default')
  return (
    <div className="flex max-w-[calc(100vw-2rem)]" aria-label={`${getAgentLabel(agent)} accounts`}>
      <div className="w-80 shrink-0 space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AgentIcon agent={agent} size={18} />
            {getAgentLabel(agent)}
          </h3>
          {agent === 'antigravity' ? null : (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Manage accounts"
              onClick={openAccounts}
            >
              <Settings />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {local
            ? 'Hover for usage. Choose an account to continue.'
            : 'Accounts are managed on the workspace host.'}
        </p>
        <div
          className="max-h-56 space-y-1 overflow-y-auto scrollbar-sleek"
          role="group"
          aria-label="Launch account"
        >
          {[
            ...(hideDefaultRow
              ? []
              : [
                  {
                    id: null,
                    label: !local
                      ? 'Workspace host account'
                      : agent === 'antigravity'
                        ? 'Current agy account'
                        : 'Orca default',
                    detail: null
                  }
                ]),
            ...accounts
          ].map((account: { id: string | null; label: string; detail?: string | null }) => {
            const selected = selectedId === account.id
            const usage = usageForAccount(account.id)
            const tightest = usage ? getTightestUsageSection(usage) : null
            return (
              <button
                key={account.id ?? 'default'}
                type="button"
                aria-label={account.label}
                disabled={busy}
                data-current={selected}
                className="group/deck-account flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left outline-none transition-colors duration-150 hover:bg-accent/50 motion-reduce:transition-none"
                onPointerEnter={() => previewAccount(account.id)}
                onFocus={() => previewAccount(account.id)}
                onClick={() => launchAccount(account.id)}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {selected ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs group-focus-visible/deck-account:underline group-focus-visible/deck-account:underline-offset-4">
                    {account.label}
                  </span>
                  {account.detail ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {account.detail}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {accountNeedsSignIn(usage)
                    ? 'Sign in again'
                    : tightest
                      ? `${Math.round(100 - tightest.window.usedPercent)}% left`
                      : '—'}
                </span>
              </button>
            )
          })}
        </div>
        {local && agent === 'antigravity' && pendingSwitch !== undefined ? (
          <div className="space-y-2 rounded-md border border-border p-2" role="alert">
            <p className="text-xs">
              {pendingSwitch ? `Switch agy to ${pendingSwitch}?` : 'Sign in to another account?'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              agy keeps one Google sign-in for this computer. Orca signs agy out, then agy opens
              Google sign-in in your browser{pendingSwitch ? `: choose ${pendingSwitch} there` : ''}
              . Every agy uses the new account afterwards.
            </p>
            {liveAntigravityTabs > 0 ? (
              <p className="text-[11px] text-destructive">
                Close the {liveAntigravityTabs} open Antigravity{' '}
                {liveAntigravityTabs === 1 ? 'tab' : 'tabs'} first.
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              {pendingSwitch ? (
                <Button
                  variant="link"
                  size="xs"
                  disabled={busy}
                  onClick={() => forgetAntigravityAccount(pendingSwitch)}
                >
                  Forget
                </Button>
              ) : (
                <span />
              )}
              <span className="flex gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={busy}
                  onClick={() => setPendingSwitch(undefined)}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  disabled={busy || liveAntigravityTabs > 0}
                  onClick={confirmAntigravitySwitch}
                >
                  {pendingSwitch ? 'Switch' : 'Sign in'}
                </Button>
              </span>
            </div>
          </div>
        ) : local && agent === 'antigravity' && accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Orca remembers each Google account agy signs in with.
          </p>
        ) : local && accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved accounts yet.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            variant="ghost"
            size="xs"
            disabled={busy}
            onClick={agent === 'antigravity' && local ? () => setPendingSwitch(null) : openAccounts}
          >
            <Plus />
            {agent === 'antigravity' && !antigravityEmail ? 'Sign in' : 'Add account'}
          </Button>
          {selectedId && agent !== 'antigravity' ? (
            <Button
              variant={signedOut ? 'default' : 'link'}
              size="xs"
              disabled={busy}
              onClick={() => void reauthenticate()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Sign in again
            </Button>
          ) : null}
        </div>
      </div>
      {local ? (
        <aside
          className="w-64 min-w-0 space-y-3 border-l border-border p-3"
          aria-label="Account usage preview"
          aria-live="polite"
        >
          <p className="text-xs font-medium">Usage</p>
          <p className="truncate text-xs text-muted-foreground" title={previewLabel}>
            {previewLabel}
          </p>
          <DeckAccountUsage usage={selectedUsage} />
        </aside>
      ) : null}
    </div>
  )
}
