import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/store'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { activateTabAndFocusPane } from '@/lib/activate-tab-and-focus-pane'
import {
  findRunningAntigravityPanes,
  type RunningAntigravityPane
} from '@/lib/antigravity-live-panes'
import { Button } from '../ui/button'

/**
 * Confirmation for signing agy in to another Google account. It first looks for panes where agy is
 * still running, because signing out signs out every agy on this computer, and checks again on
 * confirm since agy may have started meanwhile. Mount it with a `key` per target account.
 */
export function AntigravitySwitchPanel({
  targetEmail,
  signedInEmail,
  busy,
  onCancel,
  onForget,
  onConfirm,
  onClose
}: {
  /** null = an account Orca has not seen yet. */
  targetEmail: string | null
  signedInEmail: string | null
  busy: boolean
  onCancel: () => void
  onForget: (email: string) => void
  onConfirm: () => void
  onClose: () => void
}): React.JSX.Element {
  // null while checking.
  const [running, setRunning] = useState<RunningAntigravityPane[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void findRunningAntigravityPanes(useAppStore.getState()).then((panes) => {
      if (!cancelled) {
        setRunning(panes)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])
  const confirm = async (): Promise<void> => {
    setRunning(null)
    const panes = await findRunningAntigravityPanes(useAppStore.getState())
    setRunning(panes)
    if (panes.length === 0) {
      onConfirm()
    }
  }
  const show = (pane: RunningAntigravityPane): void => {
    onClose()
    activateAndRevealWorktree(pane.worktreeId)
    activateTabAndFocusPane(pane.tabId, pane.leafId)
  }
  return (
    <div className="space-y-2 rounded-md border border-border p-2" role="alert">
      <p className="text-xs">
        {targetEmail
          ? `Switch agy to ${targetEmail}?`
          : signedInEmail
            ? 'Sign in to another account?'
            : 'Sign in to agy?'}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {signedInEmail
          ? `agy holds one Google sign-in for this computer, so this replaces ${signedInEmail} instead of adding a second one. Orca opens agy with /logout typed in: press Enter and confirm, then sign in${targetEmail ? ` as ${targetEmail}` : ''} in the browser page agy opens.`
          : `agy opens Google sign-in in your browser${targetEmail ? `: choose ${targetEmail} there` : ''}.`}{' '}
        Every agy uses that account afterwards, and Orca remembers it here.
      </p>
      {running && running.length > 0 ? (
        <p className="text-[11px] text-destructive">
          agy is still running in {running.length} {running.length === 1 ? 'pane' : 'panes'}. Quit
          it there (type /exit), then press {targetEmail ? 'Switch' : 'Sign in'} again.{' '}
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0 text-[11px]"
            onClick={() => show(running[0]!)}
          >
            Show
          </Button>
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        {targetEmail ? (
          <Button variant="link" size="xs" disabled={busy} onClick={() => onForget(targetEmail)}>
            Forget
          </Button>
        ) : (
          <span />
        )}
        <span className="flex gap-1">
          <Button variant="ghost" size="xs" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="xs"
            disabled={busy || running === null}
            aria-busy={running === null}
            onClick={() => void confirm()}
          >
            {running === null ? <Loader2 className="animate-spin" /> : null}
            {targetEmail ? 'Switch' : 'Sign in'}
          </Button>
        </span>
      </div>
    </div>
  )
}
