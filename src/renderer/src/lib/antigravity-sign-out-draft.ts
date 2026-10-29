import { pasteDraftWhenAgentReady } from '@/lib/agent-paste-draft'

export const ANTIGRAVITY_SIGN_OUT_DRAFT = '/logout'

/**
 * Leaves `/logout` unsent in the input of the agy that a switch pane started.
 *
 * Why a draft: agy has one Google sign-in per machine and no account flag, so the only way Google
 * supports to pick another account is `/logout` in a running agy, which then asks to sign in. agy
 * 1.4.10 refuses `/logout` under `-p` ("not available in print mode") and sends an `-i` prompt to
 * the model as plain text, so the user sends the command and answers agy's own "sign out?" prompt.
 * agy writes its own credential; Orca never reads or copies it.
 */
export function draftAntigravitySignOut(tabId: string, onTimeout: () => void): Promise<boolean> {
  return pasteDraftWhenAgentReady({
    tabId,
    content: ANTIGRAVITY_SIGN_OUT_DRAFT,
    agent: 'antigravity',
    onTimeout
  })
}
