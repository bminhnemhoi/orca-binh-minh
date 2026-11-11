// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../../shared/constants'
import { useAppStore } from '@/store'
import { DeckAgentAccountPicker } from './DeckAgentAccountPicker'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'

vi.mock('@/lib/agent-catalog', () => ({
  AgentIcon: () => <span />,
  getAgentLabel: (agent: string) => agent
}))
const activateAndRevealWorktree = vi.fn()
const activateTabAndFocusPane = vi.fn()
vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorktree: (...args: unknown[]) => activateAndRevealWorktree(...args)
}))
vi.mock('@/lib/activate-tab-and-focus-pane', () => ({
  activateTabAndFocusPane: (...args: unknown[]) => activateTabAndFocusPane(...args)
}))

const agyUsage: ProviderRateLimits = {
  provider: 'antigravity',
  status: 'ok',
  error: null,
  session: { usedPercent: 30, windowMinutes: 300, resetsAt: null, resetDescription: null },
  weekly: null,
  accountEmail: 'cur@example.com',
  updatedAt: 1
}

let foregroundByPty: Record<string, string> = {}

function agyLaunchedTab(foregroundProcess: string): void {
  foregroundByPty = { 'pty-1': foregroundProcess }
  useAppStore.setState({
    tabsByWorktree: {
      wt: [{ id: 'tab-agy', launchAgent: 'antigravity' } as never]
    },
    terminalLayoutsByTabId: {
      'tab-agy': { ptyIdsByLeafId: { leaf: 'pty-1' } } as never
    }
  })
}

async function switchButton(name = 'Switch'): Promise<HTMLElement> {
  const button = screen.getByRole('button', { name })
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  return button
}

beforeEach(() => {
  foregroundByPty = {}
  activateAndRevealWorktree.mockClear()
  activateTabAndFocusPane.mockClear()
  vi.stubGlobal('api', {
    pty: {
      confirmForegroundProcess: vi.fn(async (ptyId: string) => foregroundByPty[ptyId] ?? null)
    }
  })
  useAppStore.setState({
    settings: {
      ...getDefaultSettings('/tmp/test-home'),
      antigravityKnownAccounts: [
        { email: 'old@example.com', lastSeenAt: 1 },
        { email: 'cur@example.com', lastSeenAt: 2 }
      ]
    },
    rateLimits: { ...useAppStore.getState().rateLimits, antigravity: agyUsage },
    tabsByWorktree: {},
    terminalLayoutsByTabId: {},
    agentStatusByPaneKey: {}
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Deck account picker for Antigravity', () => {
  it('lists remembered accounts with the signed-in one first and launches it directly', () => {
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    const rows = screen.getAllByRole('button', { name: /@example\.com$/ })
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'cur@example.com',
      'old@example.com'
    ])
    fireEvent.click(screen.getByRole('button', { name: 'cur@example.com' }))
    expect(launch).toHaveBeenCalledWith(undefined)
  })

  it('asks before switching and runs the sign-in flow on confirm', async () => {
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'old@example.com' }))
    expect(launch).not.toHaveBeenCalled()
    expect(screen.getByText('Switch agy to old@example.com?')).toBeTruthy()
    fireEvent.click(await switchButton())
    await waitFor(() => expect(launch).toHaveBeenCalledWith(undefined, true))
  })

  it('does not count a tab started as Antigravity once agy has exited in it', async () => {
    agyLaunchedTab('powershell.exe')
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'old@example.com' }))
    fireEvent.click(await switchButton())
    await waitFor(() => expect(launch).toHaveBeenCalledWith(undefined, true))
    expect(screen.queryByText(/agy is still running/)).toBeNull()
  })

  it('blocks the switch while agy still runs in a pane and shows where', async () => {
    agyLaunchedTab('agy.exe')
    const launch = vi.fn()
    const close = vi.fn()
    render(<DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={close} />)
    fireEvent.click(screen.getByRole('button', { name: 'old@example.com' }))
    expect(await screen.findByText(/agy is still running in 1 pane/)).toBeTruthy()
    fireEvent.click(await switchButton())
    await waitFor(() => expect(screen.getByText(/agy is still running in 1 pane/)).toBeTruthy())
    expect(launch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(close).toHaveBeenCalled()
    expect(activateAndRevealWorktree).toHaveBeenCalledWith('wt')
    expect(activateTabAndFocusPane).toHaveBeenCalledWith('tab-agy', 'leaf')
  })

  it('forgets a remembered account without signing anything out', () => {
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'old@example.com' }))
    fireEvent.click(screen.getByRole('button', { name: 'Forget' }))
    expect(launch).not.toHaveBeenCalled()
    expect(screen.queryByText('Switch agy to old@example.com?')).toBeNull()
  })

  it('says a new account replaces the signed-in one rather than adding to it', async () => {
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    expect(screen.queryByRole('button', { name: 'Add account' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Use another account' }))
    expect(screen.getByText('Sign in to another account?')).toBeTruthy()
    expect(
      screen.getByText(/replaces cur@example\.com instead of adding a second one/)
    ).toBeTruthy()
    fireEvent.click(await switchButton('Sign in'))
    await waitFor(() => expect(launch).toHaveBeenCalledWith(undefined, true))
  })
})
