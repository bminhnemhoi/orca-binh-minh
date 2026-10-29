import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

/**
 * True in Orca Bình Minh builds: electron.vite.config.ts substitutes the constant at compile time.
 * Under Vitest it is undefined, so upstream's updater tests keep exercising the real updater.
 */
export const IS_BINHMINH_FORK =
  typeof ORCA_BINHMINH_FORK !== 'undefined' && ORCA_BINHMINH_FORK === true

/**
 * Whether the app updater must stay idle: unpackaged and dev builds, and every Orca Bình Minh build.
 *
 * Why the fork is excluded: upstream's updater installs the official Orca release, which would
 * replace this personal build and drop every customization. The fork updates by rebuilding from
 * source with binhminh/Build-Orca-BinhMinh.ps1, so updates behave as in a dev build: never
 * checked, never offered.
 */
export function isAppUpdaterInactive(): boolean {
  return IS_BINHMINH_FORK || !app.isPackaged || is.dev
}
