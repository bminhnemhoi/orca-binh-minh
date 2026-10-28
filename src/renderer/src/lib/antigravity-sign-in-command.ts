import type { AgentStartupShell } from '../../../shared/tui-agent-startup-shell'

/**
 * The command a sign-in or account-switch pane runs.
 *
 * Why sign out first: agy has one Google sign-in per machine and no account flag, so the only way
 * Google supports to pick another account is `/logout`, then starting agy, which opens Google
 * sign-in in the browser. agy writes its own credential; Orca never reads or copies it. On a
 * signed-out machine the logout is a no-op and agy simply asks to sign in.
 */
export function buildAntigravitySignInCommand(shell: AgentStartupShell | undefined): string {
  const separator = shell === 'cmd' ? ' & ' : '; '
  return `agy -p /logout${separator}agy`
}
