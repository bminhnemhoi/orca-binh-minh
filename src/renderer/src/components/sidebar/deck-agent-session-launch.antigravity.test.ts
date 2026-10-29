import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { launchDeckAgentSession } from './deck-agent-session-launch'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'

const launchDeckAccountAgent = vi.fn(async () => 'tab-new')
const draftAntigravitySignOut = vi.fn(async () => true)

vi.mock('./deck-account-agent-launch', () => ({
  deckAccountLaunchIsLocal: () => true,
  launchDeckAccountAgent: (...args: unknown[]) => launchDeckAccountAgent(...(args as []))
}))
vi.mock('@/lib/antigravity-sign-out-draft', () => ({
  draftAntigravitySignOut: (...args: unknown[]) => draftAntigravitySignOut(...(args as []))
}))

function setAgyEmail(accountEmail: string | null): void {
  const antigravity = {
    provider: 'antigravity',
    status: 'ok',
    error: null,
    session: null,
    weekly: null,
    accountEmail,
    updatedAt: 1
  } as ProviderRateLimits
  useAppStore.setState({ rateLimits: { ...useAppStore.getState().rateLimits, antigravity } })
}

const pane = { tabId: 'tab-old', leafId: 'leaf', direction: 'vertical' as const }

describe('launchDeckAgentSession Antigravity sign-in', () => {
  beforeEach(() => {
    launchDeckAccountAgent.mockClear()
    draftAntigravitySignOut.mockClear()
  })

  it('opens agy in a tab of its own and leaves /logout for the user to send', async () => {
    setAgyEmail('cur@example.com')
    const tabId = await launchDeckAgentSession({
      agent: 'antigravity',
      worktreeId: 'wt',
      groupId: 'g',
      pane,
      login: true
    })
    expect(tabId).toBe('tab-new')
    expect(launchDeckAccountAgent).toHaveBeenCalledWith(
      'wt',
      'g',
      'antigravity',
      undefined,
      undefined,
      null,
      'new-tab'
    )
    expect(draftAntigravitySignOut).toHaveBeenCalledWith('tab-new', expect.any(Function))
  })

  it('types nothing when agy is not signed in, since agy asks to sign in by itself', async () => {
    setAgyEmail(null)
    await launchDeckAgentSession({
      agent: 'antigravity',
      worktreeId: 'wt',
      groupId: 'g',
      pane: null,
      login: true
    })
    expect(launchDeckAccountAgent).toHaveBeenCalledOnce()
    expect(draftAntigravitySignOut).not.toHaveBeenCalled()
  })

  it('launches a normal agy next to the chosen pane without a draft', async () => {
    setAgyEmail('cur@example.com')
    await launchDeckAgentSession({ agent: 'antigravity', worktreeId: 'wt', groupId: 'g', pane })
    expect(launchDeckAccountAgent).toHaveBeenCalledWith(
      'wt',
      'g',
      'antigravity',
      undefined,
      undefined,
      pane
    )
    expect(draftAntigravitySignOut).not.toHaveBeenCalled()
  })
})
