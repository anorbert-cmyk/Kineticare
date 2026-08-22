import { describe, expect, it } from 'vitest'

import { isGuestBindableAccount } from '../../lib/order-status/guest-bindable-account'

describe('isGuestBindableAccount', () => {
  it('csak aktiválatlan customer fiókot köt', () => {
    expect(
      isGuestBindableAccount({ role: 'customer', passwordSetupPending: true }),
    ).toBe(true)
  })

  it('aktivált vevő, staff, owner, hiányzó szerep: nem köt', () => {
    expect(
      isGuestBindableAccount({ role: 'customer', passwordSetupPending: false }),
    ).toBe(false)
    expect(isGuestBindableAccount({ role: 'staff', passwordSetupPending: true })).toBe(false)
    expect(isGuestBindableAccount({ role: 'owner', passwordSetupPending: true })).toBe(false)
    expect(isGuestBindableAccount({ role: 'customer' })).toBe(false)
    expect(isGuestBindableAccount({})).toBe(false)
  })
})
