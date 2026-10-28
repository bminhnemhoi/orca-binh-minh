/**
 * Google accounts Orca has seen signed in to the Antigravity CLI.
 *
 * Why only the email: agy keeps one Google credential per machine in the OS keyring and has no
 * per-process profile (antigravity-cli#155, #381, #1261). Orca never copies that credential; it
 * remembers which accounts were used so switching back is one click, and agy itself signs in.
 */
export type AntigravityKnownAccount = {
  email: string
  /** Unix ms of the most recent quota read that reported this account. */
  lastSeenAt: number
}

/** Why throttle: every quota refresh reports the email, and each settings write is persisted. */
export const ANTIGRAVITY_KNOWN_ACCOUNT_REFRESH_MS = 60 * 60 * 1000

export function normalizeAntigravityEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Returns the updated list, or null when nothing worth persisting changed. */
export function recordAntigravityKnownAccount(
  accounts: readonly AntigravityKnownAccount[] | undefined,
  email: string,
  now: number
): AntigravityKnownAccount[] | null {
  const normalized = normalizeAntigravityEmail(email)
  if (!normalized.includes('@')) {
    return null
  }
  const list = accounts ?? []
  const existing = list.find((account) => account.email === normalized)
  if (existing && now - existing.lastSeenAt < ANTIGRAVITY_KNOWN_ACCOUNT_REFRESH_MS) {
    return null
  }
  return [
    ...list.filter((account) => account.email !== normalized),
    { email: normalized, lastSeenAt: now }
  ]
}

export function forgetAntigravityKnownAccount(
  accounts: readonly AntigravityKnownAccount[] | undefined,
  email: string
): AntigravityKnownAccount[] {
  const normalized = normalizeAntigravityEmail(email)
  return (accounts ?? []).filter((account) => account.email !== normalized)
}

/** The signed-in account first, then the rest by most recently seen. */
export function orderAntigravityKnownAccounts(
  accounts: readonly AntigravityKnownAccount[] | undefined,
  currentEmail: string | null | undefined
): string[] {
  const current = currentEmail ? normalizeAntigravityEmail(currentEmail) : null
  const others = [...(accounts ?? [])]
    .filter((account) => account.email !== current)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .map((account) => account.email)
  return current ? [current, ...others] : others
}
