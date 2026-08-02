import { describe, expect, it, vi } from 'vitest'

import { updateProfile, GENERIC_UPDATE_ERROR } from '../../lib/account-client'

describe('updateProfile', () => {
  it('siker-ág: 200 → ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const result = await updateProfile({ name: 'Kovács Anna', billingZip: '1234' }, mockFetch as never)
    expect(result.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/me',
      expect.objectContaining({ method: 'PATCH', credentials: 'include' }),
    )
  })

  it('a role és a purchases mezőket SOSEM küldi (mezőszintű access védelem)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await updateProfile({ name: 'Teszt', billingName: 'Cég Kft.' }, mockFetch as never)
    const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('role')
    expect(body).not.toHaveProperty('purchases')
  })

  it('hiba-ág: 403/500 → általános üzenet', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
    const result = await updateProfile({ name: 'Teszt' }, mockFetch as never)
    expect(result).toEqual({ ok: false, message: GENERIC_UPDATE_ERROR })
  })
})
