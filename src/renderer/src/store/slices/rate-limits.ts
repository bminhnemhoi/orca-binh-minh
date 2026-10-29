import type { StateCreator } from 'zustand'
import type { RateLimitRuntimeTarget, RateLimitState } from '../../../../shared/rate-limit-types'
import { createEmptyRateLimitState } from '../../../../shared/rate-limit-state-factory'
import { recordAntigravityKnownAccount } from '../../../../shared/antigravity-known-accounts'
import { recordQuotaHistory } from '@/components/binhminh-corner/quota-history'
import type { AppState } from '../types'

export type RateLimitSlice = {
  rateLimits: RateLimitState
  fetchRateLimits: () => Promise<void>
  refreshRateLimits: () => Promise<void>
  refreshGrokRateLimits: () => Promise<void>
  refreshClaudeRateLimitsForTarget: (target: RateLimitRuntimeTarget) => Promise<void>
  refreshCodexRateLimitsForTarget: (target: RateLimitRuntimeTarget) => Promise<void>
  consumeCodexRateLimitResetCredit: () => Promise<void>
  fetchInactiveClaudeAccountUsage: () => Promise<void>
  fetchInactiveCodexAccountUsage: () => Promise<void>
  setRateLimitsFromPush: (state: RateLimitState) => void
}

/** Why here: every quota reading passes through this slice, so an agy account is remembered the
 *  first time Orca sees it signed in, and switching back to it later is one click. */
function rememberAntigravityAccount(get: () => AppState, state: RateLimitState): void {
  const email = state.antigravity?.accountEmail
  const settings = get().settings
  if (!email || !settings) {
    return
  }
  const next = recordAntigravityKnownAccount(settings.antigravityKnownAccounts, email, Date.now())
  if (next) {
    void get().updateSettings({ antigravityKnownAccounts: next })
  }
}

export const createRateLimitSlice: StateCreator<AppState, [], [], RateLimitSlice> = (set, get) => {
  const applyRateLimits = (state: RateLimitState): void => {
    set({ rateLimits: state })
    rememberAntigravityAccount(get, state)
    recordQuotaHistory(state)
  }
  return {
    rateLimits: createEmptyRateLimitState(),

    fetchRateLimits: async () => {
      try {
        const state = await window.api.rateLimits.get()
        applyRateLimits(state)
      } catch (error) {
        console.error('Failed to fetch rate limits:', error)
      }
    },

    refreshRateLimits: async () => {
      try {
        const state = await window.api.rateLimits.refresh()
        applyRateLimits(state)
      } catch (error) {
        console.error('Failed to refresh rate limits:', error)
      }
    },

    refreshGrokRateLimits: async () => {
      try {
        const state = await window.api.rateLimits.refreshGrok()
        applyRateLimits(state)
      } catch (error) {
        console.error('Failed to refresh Grok usage:', error)
      }
    },

    refreshClaudeRateLimitsForTarget: async (target) => {
      const current = get().rateLimits
      const targetChanged =
        current.claudeTarget.runtime !== target.runtime ||
        current.claudeTarget.wslDistro !== target.wslDistro
      set({
        rateLimits: {
          ...current,
          claudeTarget: target,
          claude:
            current.claude && !targetChanged
              ? { ...current.claude, status: 'fetching' }
              : {
                  provider: 'claude',
                  session: null,
                  weekly: null,
                  updatedAt: 0,
                  error: null,
                  status: 'fetching'
                }
        }
      })
      try {
        const state = await window.api.rateLimits.refreshClaudeForTarget(target)
        applyRateLimits(state)
      } catch (error) {
        console.error('Failed to refresh Claude usage for runtime:', error)
      }
    },

    refreshCodexRateLimitsForTarget: async (target) => {
      const current = get().rateLimits
      const targetChanged =
        current.codexTarget.runtime !== target.runtime ||
        current.codexTarget.wslDistro !== target.wslDistro
      set({
        rateLimits: {
          ...current,
          codexTarget: target,
          codex:
            current.codex && !targetChanged
              ? { ...current.codex, status: 'fetching' }
              : {
                  provider: 'codex',
                  session: null,
                  weekly: null,
                  updatedAt: 0,
                  error: null,
                  status: 'fetching'
                }
        }
      })
      try {
        const state = await window.api.rateLimits.refreshCodexForTarget(target)
        applyRateLimits(state)
      } catch (error) {
        console.error('Failed to refresh Codex usage for runtime:', error)
      }
    },

    consumeCodexRateLimitResetCredit: async () => {
      try {
        const result = await window.api.rateLimits.consumeCodexResetCredit()
        applyRateLimits(result.state)
      } catch (error) {
        console.error('Failed to consume Codex rate-limit reset:', error)
        throw error
      }
    },

    fetchInactiveClaudeAccountUsage: async () => {
      try {
        await window.api.rateLimits.fetchInactiveClaudeAccounts()
      } catch (error) {
        console.error('Failed to fetch inactive Claude account usage:', error)
      }
    },

    fetchInactiveCodexAccountUsage: async () => {
      try {
        await window.api.rateLimits.fetchInactiveCodexAccounts()
      } catch (error) {
        console.error('Failed to fetch inactive Codex account usage:', error)
      }
    },

    setRateLimitsFromPush: (state) => {
      applyRateLimits(state)
    }
  }
}
