import { describe, expect, it } from 'vitest'
import {
  ANTIGRAVITY_KNOWN_ACCOUNT_REFRESH_MS,
  forgetAntigravityKnownAccount,
  orderAntigravityKnownAccounts,
  recordAntigravityKnownAccount
} from './antigravity-known-accounts'

describe('recordAntigravityKnownAccount', () => {
  it('adds a new account with its email normalized', () => {
    expect(recordAntigravityKnownAccount(undefined, ' Minh.A@Gmail.com ', 10)).toEqual([
      { email: 'minh.a@gmail.com', lastSeenAt: 10 }
    ])
  })

  it('skips the write while the account was seen recently', () => {
    const list = [{ email: 'a@x.com', lastSeenAt: 1_000 }]
    expect(recordAntigravityKnownAccount(list, 'a@x.com', 2_000)).toBeNull()
  })

  it('refreshes lastSeenAt once the throttle window has passed', () => {
    const list = [
      { email: 'a@x.com', lastSeenAt: 0 },
      { email: 'b@x.com', lastSeenAt: 5 }
    ]
    expect(
      recordAntigravityKnownAccount(list, 'a@x.com', ANTIGRAVITY_KNOWN_ACCOUNT_REFRESH_MS)
    ).toEqual([
      { email: 'b@x.com', lastSeenAt: 5 },
      { email: 'a@x.com', lastSeenAt: ANTIGRAVITY_KNOWN_ACCOUNT_REFRESH_MS }
    ])
  })

  it('ignores a value that is not an email', () => {
    expect(recordAntigravityKnownAccount([], 'Gemini API key', 1)).toBeNull()
  })
})

describe('forgetAntigravityKnownAccount', () => {
  it('removes only the named account', () => {
    const list = [
      { email: 'a@x.com', lastSeenAt: 1 },
      { email: 'b@x.com', lastSeenAt: 2 }
    ]
    expect(forgetAntigravityKnownAccount(list, 'A@x.com')).toEqual([
      { email: 'b@x.com', lastSeenAt: 2 }
    ])
  })
})

describe('orderAntigravityKnownAccounts', () => {
  const list = [
    { email: 'old@x.com', lastSeenAt: 1 },
    { email: 'new@x.com', lastSeenAt: 3 },
    { email: 'cur@x.com', lastSeenAt: 2 }
  ]

  it('puts the signed-in account first, then the most recently seen', () => {
    expect(orderAntigravityKnownAccounts(list, 'CUR@x.com')).toEqual([
      'cur@x.com',
      'new@x.com',
      'old@x.com'
    ])
  })

  it('shows the signed-in account even before it is remembered', () => {
    expect(orderAntigravityKnownAccounts([], 'fresh@x.com')).toEqual(['fresh@x.com'])
  })

  it('lists remembered accounts when nobody is signed in', () => {
    expect(orderAntigravityKnownAccounts(list, null)).toEqual([
      'new@x.com',
      'cur@x.com',
      'old@x.com'
    ])
  })
})
