import { describe, expect, it, vi } from 'vitest'
import { findRunningAntigravityPanes } from './antigravity-live-panes'

const state = {
  tabsByWorktree: {
    'wt-a': [
      { id: 'tab-agy', launchAgent: 'antigravity' },
      { id: 'tab-split', launchAgent: undefined }
    ],
    'wt-b': [{ id: 'tab-ssh', launchAgent: 'antigravity' }]
  },
  terminalLayoutsByTabId: {
    'tab-agy': { ptyIdsByLeafId: { leaf: 'pty-exited-agy' } },
    'tab-split': { ptyIdsByLeafId: { left: 'pty-shell', right: 'pty-hand-typed-agy', gone: '' } },
    'tab-ssh': { ptyIdsByLeafId: { leaf: 'ssh:conn1@@pty-remote' } }
  }
} as never

const foreground: Record<string, string> = {
  'pty-exited-agy': 'powershell.exe',
  'pty-shell': 'pwsh.exe',
  'pty-hand-typed-agy': 'agy.exe',
  'ssh:conn1@@pty-remote': 'agy'
}

describe('findRunningAntigravityPanes', () => {
  it('reports panes whose foreground process is agy, however the tab was started', async () => {
    const foregroundOf = vi.fn(async (ptyId: string) => foreground[ptyId] ?? null)
    await expect(findRunningAntigravityPanes(state, foregroundOf)).resolves.toEqual([
      { worktreeId: 'wt-a', tabId: 'tab-split', leafId: 'right' }
    ])
    // Why: an SSH pane's agy signs in on the remote machine, so it never blocks a local switch.
    expect(foregroundOf).not.toHaveBeenCalledWith('ssh:conn1@@pty-remote')
    expect(foregroundOf).not.toHaveBeenCalledWith('')
  })

  it('treats a pane it cannot inspect as not running agy', async () => {
    const foregroundOf = vi.fn(async (ptyId: string) => {
      if (ptyId === 'pty-hand-typed-agy') {
        throw new Error('terminal gone')
      }
      return foreground[ptyId] ?? null
    })
    await expect(findRunningAntigravityPanes(state, foregroundOf)).resolves.toEqual([])
  })
})
