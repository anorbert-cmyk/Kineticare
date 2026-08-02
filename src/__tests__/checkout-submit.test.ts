import { describe, expect, it, vi } from 'vitest'

import { submitCheckout, GENERIC_CHECKOUT_ERROR } from '../../lib/checkout-submit'

describe('submitCheckout', () => {
  it('siker-ág: 200 {orderNumber, gatewayUrl} → ok és a mezők', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ orderNumber: 'KH-2026-000123', gatewayUrl: 'https://secure.barion.com/Pay?id=abc' }), { status: 200 }),
    )
    const result = await submitCheckout({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }, mockFetch as never)
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
        body: JSON.stringify({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }),
      }),
    )
  })

  it('a kliens SOSEM küld árat (priceHuf nincs a törzsben)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await submitCheckout({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }, mockFetch as never)
    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('priceHuf')
  })

  it('409 duplavásárlás: a szerver magyar üzenetét adja vissza', async () => {
    const serverMessage = 'Ezt a kurzust már megvetted.'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: serverMessage }), { status: 409 }),
    )
    const result = await submitCheckout({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }, mockFetch as never)
    expect(result).toEqual({ ok: false, message: serverMessage })
  })

  it('502 Barion-hiba: a szerver üzenetét adja', async () => {
    const serverMessage = 'A fizetés jelenleg nem indítható, kérjük próbáld pár perc múlva.'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: serverMessage }), { status: 502 }),
    )
    const result = await submitCheckout({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }, mockFetch as never)
    expect(result).toEqual({ ok: false, message: serverMessage })
  })

  it('nem JSON hibaválaszra általános üzenet', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }))
    const result = await submitCheckout({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }, mockFetch as never)
    expect(result).toEqual({ ok: false, message: GENERIC_CHECKOUT_ERROR })
  })

  it('hálózati hibára általános üzenet', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await submitCheckout({ productId: 1, quantity: 1, consentWithdrawalWaiver: true }, mockFetch as never)
    expect(result).toEqual({ ok: false, message: GENERIC_CHECKOUT_ERROR })
  })
})
