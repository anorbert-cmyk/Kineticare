import { describe, expect, it, vi } from 'vitest'

import { submitCheckout, GENERIC_CHECKOUT_ERROR, type CheckoutSubmitInput } from '../lib/checkout-submit'

/** A pénztárban megadott számlázási adat — a beküldés kötelező része. */
const BILLING = {
  name: 'Minta Mari',
  zip: '1011',
  city: 'Budapest',
  street: 'Fő utca 1.',
}

const INPUT: CheckoutSubmitInput = {
  productId: 1,
  quantity: 1,
  consentWithdrawalWaiver: true,
  billing: BILLING,
}

describe('submitCheckout', () => {
  it('siker-ág: 200 {orderNumber, gatewayUrl} → ok és a mezők', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ orderNumber: 'KH-2026-000123', gatewayUrl: 'https://secure.barion.com/Pay?id=abc' }), { status: 200 }),
    )
    const result = await submitCheckout(INPUT, mockFetch as never)
    expect(result).toEqual({
      ok: true,
      orderNumber: 'KH-2026-000123',
      gatewayUrl: 'https://secure.barion.com/Pay?id=abc',
    })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/start',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(INPUT),
      }),
    )
  })

  it('a számlázási adatok BENNE vannak a törzsben (nem vesznek el)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await submitCheckout(
      { ...INPUT, billing: { ...BILLING, taxNumber: '12345678-1-42' } },
      mockFetch as never,
    )
    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body)) as Record<string, unknown>
    expect(body.billing).toEqual({
      name: 'Minta Mari',
      zip: '1011',
      city: 'Budapest',
      street: 'Fő utca 1.',
      taxNumber: '12345678-1-42',
    })
  })

  it('a kliens SOSEM küld árat (priceHuf nincs a törzsben)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await submitCheckout(INPUT, mockFetch as never)
    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('priceHuf')
  })

  it('409 duplavásárlás: a szerver magyar üzenetét adja vissza', async () => {
    const serverMessage = 'Ezt a kurzust már megvetted.'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: serverMessage }), { status: 409 }),
    )
    const result = await submitCheckout(INPUT, mockFetch as never)
    expect(result).toEqual({ ok: false, message: serverMessage })
  })

  it('400 hiányos számlázási adat: a szerver magyar üzenetét adja vissza', async () => {
    const serverMessage = 'Hiányos vagy hibás számlázási adatok. Add meg a települést.'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: serverMessage }), { status: 400 }),
    )
    const result = await submitCheckout(INPUT, mockFetch as never)
    expect(result).toEqual({ ok: false, message: serverMessage })
  })

  it('502 Barion-hiba: a szerver üzenetét adja', async () => {
    const serverMessage = 'A fizetés jelenleg nem indítható, kérjük próbáld pár perc múlva.'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: serverMessage }), { status: 502 }),
    )
    const result = await submitCheckout(INPUT, mockFetch as never)
    expect(result).toEqual({ ok: false, message: serverMessage })
  })

  it('nem JSON hibaválaszra általános üzenet', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }))
    const result = await submitCheckout(INPUT, mockFetch as never)
    expect(result).toEqual({ ok: false, message: GENERIC_CHECKOUT_ERROR })
  })

  it('hálózati hibára általános üzenet', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await submitCheckout(INPUT, mockFetch as never)
    expect(result).toEqual({ ok: false, message: GENERIC_CHECKOUT_ERROR })
  })
})
