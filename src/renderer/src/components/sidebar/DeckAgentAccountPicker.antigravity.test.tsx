// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../../shared/constants'
import { useAppStore } from '@/store'
import { DeckAgentAccountPicker } from './DeckAgentAccountPicker'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'

vi.mock('@/lib/agent-catalog', () => ({
  AgentIcon: () => <span />,
  getAgentLabel: (agent: string) => agent
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

function liveAgyTab(): void {
  useAppStore.setState({
    tabsByWorktree: {
      wt: [{ id: 'tab-agy', launchAgent: 'antigravity' } as never]
    },
    terminalLayoutsByTabId: {
      'tab-agy': { ptyIdsByLeafId: { leaf: 'pty-1' } } as never
    }
  })
}

beforeEach(() => {
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
afterEach(cleanup)

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

  it('asks before switching and runs the sign-in flow on confirm', () => {
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'old@example.com' }))
    expect(launch).not.toHaveBeenCalled()
    expect(screen.getByText('Switch agy to old@example.com?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }))
    expect(launch).toHaveBeenCalledWith(undefined, true)
  })

  it('blocks the switch while an Antigravity tab is still running', () => {
    liveAgyTab()
    const launch = vi.fn()
    render(
      <DeckAgentAccountPicker agent="antigravity" local onLaunch={launch} onClose={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'old@example.com' }))
    expect(screen.getByText(/Close the 1 open Antigravity/)).toBeTruthy()
    const confirm = screen.getByRole('button', { name: 'Switch' })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(confirm)
    expect(launch).not.toHaveBeenCalled()
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
})
