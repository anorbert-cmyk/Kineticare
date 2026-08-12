import { describe, expect, it, vi } from 'vitest'

import { pollOrderStatus } from '../lib/order-status-poll'

/**
 * A köszönőoldal kliens-oldali státusz-pollerének tesztjei.
 *
 * A 12.2-es incidens óta a köszönőoldal hitelesítése KLIENS-OLDALI (a Barionról
 * érkező cross-site navigáción a szerver nem látja a sütit) — ez a függvény a
 * lánc utolsó láncszeme: a 401-ből „unauthorized" nézet lesz, a 404-ből
 * „nem található", a hálózati hibából „error". A fetch itt INJEKTÁLT
 * (fetchImpl paraméter) — a tesztből valódi hálózati hívás sosem mehet.
 */

function fetchReturning(status: number, body?: unknown): typeof fetch {
  return vi.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  })) as unknown as typeof fetch
}

describe('pollOrderStatus', () => {
  it('200 + érvényes törzs → status', async () => {
    const fetchImpl = fetchReturning(200, { status: 'paid' })
    const result = await pollOrderStatus('KH-2026-000123', fetchImpl)
    expect(result).toEqual({ kind: 'status', status: 'paid' })
    // A hívás ugyanazon az originen, sütivel megy (a csrf-szűrő átengedi):
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/orders/KH-2026-000123/status')
    expect(init.credentials).toBe('include')
  })

  it('a rendelésszám URL-kódolva megy ki', async () => {
    const fetchImpl = fetchReturning(200, { status: 'created' })
    await pollOrderStatus('KH 2026/#1', fetchImpl)
    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string]
    expect(url).toBe(`/api/orders/${encodeURIComponent('KH 2026/#1')}/status`)
  })

  it('401 → unauthorized (a csrf-szűrő elutasítása is ide fut)', async () => {
    expect(await pollOrderStatus('X', fetchReturning(401))).toEqual({ kind: 'unauthorized' })
  })

  it('404 → not-found', async () => {
    expect(await pollOrderStatus('X', fetchReturning(404))).toEqual({ kind: 'not-found' })
  })

  it('egyéb nem-ok státusz → error', async () => {
    expect(await pollOrderStatus('X', fetchReturning(500))).toEqual({ kind: 'error' })
    expect(await pollOrderStatus('X', fetchReturning(400))).toEqual({ kind: 'error' })
  })

  it('200, de status nélküli törzs → error', async () => {
    expect(await pollOrderStatus('X', fetchReturning(200, {}))).toEqual({ kind: 'error' })
    expect(await pollOrderStatus('X', fetchReturning(200, { status: 42 }))).toEqual({ kind: 'error' })
  })

  it('hálózati hiba (fetch dob) → error, NEM kivétel', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    expect(await pollOrderStatus('X', fetchImpl)).toEqual({ kind: 'error' })
  })
})
