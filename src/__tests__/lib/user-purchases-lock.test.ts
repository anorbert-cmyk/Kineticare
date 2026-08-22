import { describe, expect, it } from 'vitest'

import { userPurchasesLockKey } from '../../lib/user-purchases-lock'

describe('userPurchasesLockKey', () => {
  it('a kulcs purchases:user:<id> alakú (K1)', () => {
    expect(userPurchasesLockKey(7)).toBe('purchases:user:7')
    expect(userPurchasesLockKey('42')).toBe('purchases:user:42')
  })
})
