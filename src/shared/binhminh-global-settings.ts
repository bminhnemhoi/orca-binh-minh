import type { AntigravityKnownAccount } from './antigravity-known-accounts'
import type { BinhMinhCornerSettings } from './binhminh-corner-settings'

/**
 * Settings added by the Orca Bình Minh fork, kept out of global-settings-types.ts so that file
 * stays under its line ceiling and upstream merges touch one line there.
 */
export type BinhMinhGlobalSettings = {
  /** Google accounts seen signed in to agy; emails only, agy keeps the one credential itself. */
  antigravityKnownAccounts?: AntigravityKnownAccount[]
  /** The corner widget; read through resolveBinhMinhCornerSettings. */
  binhMinhCorner?: BinhMinhCornerSettings
}
