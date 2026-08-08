import { describe, expect, it, vi } from 'vitest'

import {
  loginUser,
  registerUser,
  forgotPassword,
  resetPassword,
  GENERIC_AUTH_ERROR,
} from '../lib/auth-client'

describe('loginUser', () => {
  it('siker-ág: 200 → ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const result = await loginUser({ email: 'a@b.hu', password: 'titok123456' }, mockFetch as never)
    expect(result.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('401 → magyar hiba (nem árulja el, melyik rossz)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    const result = await loginUser({ email: 'a@b.hu', password: 'rossz' }, mockFetch as never)
    expect(result.ok).toBe(false)
    expect(result.message).toBe('Hibás e-mail-cím vagy jelszó.')
  })

  it('hálózati hiba → általános üzenet', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('down'))
    const result = await loginUser({ email: 'a@b.hu', password: 'x' }, mockFetch as never)
    expect(result).toEqual({ ok: false, message: GENERIC_AUTH_ERROR })
  })
})

describe('registerUser', () => {
  it('400/409 → foglalt e-mail vagy gyenge jelszó üzenet', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 400 }))
    const result = await registerUser(
      { email: 'foglalt@b.hu', password: 'x'.repeat(12), name: 'Teszt' },
      mockFetch as never,
    )
    expect(result.ok).toBe(false)
    expect(result.message).toContain('foglalt')
  })
})

describe('forgotPassword', () => {
  it('mindig ok (a Payload mindig 200-at ad — ne szivárogjon a cím)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const result = await forgotPassword('nemletezo@b.hu', mockFetch as never)
    expect(result.ok).toBe(true)
  })

  it('A2 — 429 (IP-alapú korlát) esetén NEM hazudik sikert, a szerver üzenetét adja vissza', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ message: 'Túl sok próbálkozás. Kérjük, próbáld újra pár perc múlva.' }] }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const result = await forgotPassword('valaki@b.hu', mockFetch as never)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Túl sok próbálkozás')
  })
})

describe('resetPassword', () => {
  it('400 → lejárt/érvénytelen link üzenet', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 400 }))
    const result = await resetPassword({ token: 'lejart', password: 'x'.repeat(12) }, mockFetch as never)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('lejárt')
  })

  it('siker-ág: 200 → ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const result = await resetPassword({ token: 'valid', password: 'x'.repeat(12) }, mockFetch as never)
    expect(result.ok).toBe(true)
  })
})
