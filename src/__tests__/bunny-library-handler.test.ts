import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBunnyVideosHandler } from '../lib/stream/bunny-library-handler'
import { RATE_LIMIT_RULES, SlidingWindowRateLimiter } from '../lib/security/rate-limit'

/**
 * GET /api/admin/bunny-videos — RBAC és a hálózat injektálása.
 * Anon 401, customer 403, staff 200. Valódi Bunny-hívás nincs.
 */

const URL = 'http://localhost:3000/api/admin/bunny-videos'
const DUMMY_KEY = 'DUMMY-BUNNY-LIBRARY-KEY'

function createPayload(role: string | null) {
  return {
    auth: vi.fn(async () => ({
      user: role === null ? null : { id: 3, role },
    })),
  }
}

describe('createBunnyVideosHandler', () => {
  afterEach(() => {
    delete process.env.BUNNY_STREAM_LIBRARY_API_KEY
    delete process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID
  })

  it('be nem jelentkezett → 401 magyarul', async () => {
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload(null) as never,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })
    const response = await GET(new Request(URL))
    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('bejelentkezés')
  })

  it('customer → 403 magyarul', async () => {
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('customer') as never,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })
    const response = await GET(new Request(URL))
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('munkatársi vagy tulajdonosi')
  })

  it('staff + bekötött library → 200, a kulcs nincs a válaszban', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '99'
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', title: 'Demo', status: 4, length: 12 },
        ],
        totalItems: 1,
      }),
    }))
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('staff') as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const response = await GET(new Request(URL))
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toContain('Demo')
    expect(text).not.toContain(DUMMY_KEY)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('nem numerikus libraryId → 503, nincs Bunny-hívás', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = 'abc'
    const fetchImpl = vi.fn()
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('staff') as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const response = await GET(new Request(URL))
    expect(response.status).toBe(503)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe('invalid-library-id')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('túl hosszú search → 400, nincs Bunny-hívás', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '99'
    const fetchImpl = vi.fn()
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('staff') as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const response = await GET(new Request(`${URL}?search=${'x'.repeat(201)}`))
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe('invalid-search')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

/**
 * F10 (2026-08-21-i kódvizsgálat): a végpont a Payload REST catch-allon KÍVÜL
 * él, tehát az útvonal-alapú IP-limiter nem fedi, és egy hívás akár öt kimenő
 * Bunny-kérést indít. A keret staff-kört véd (nem autentikálatlan erősítő
 * vektor), de a Bunny-kvótánkat fogja meg. Ráadásul a válasz védett tár
 * GUID-jait viheti, ezért nem kerülhet gyorsítótárba.
 */
describe('createBunnyVideosHandler — kérés-korlát és gyorsítótár', () => {
  const rules = {
    ...RATE_LIMIT_RULES,
    'bunny-videos': { limit: 2, windowMs: 60_000 },
  }

  function setup(role: string) {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '99'
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [], totalItems: 0 }),
    }))
    const limiter = new SlidingWindowRateLimiter()
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload(role) as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      rateLimit: { limiter, rules },
    })
    return { GET, fetchImpl }
  }

  it('a keret felett 429, magyar üzenettel, Retry-After fejléccel — és NEM megy ki Bunny-hívás', async () => {
    const { GET, fetchImpl } = setup('staff')

    expect((await GET(new Request(URL))).status).toBe(200)
    expect((await GET(new Request(URL))).status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const elutasitott = await GET(new Request(URL))
    expect(elutasitott.status).toBe(429)
    expect(elutasitott.headers.get('Retry-After')).not.toBeNull()
    const body = (await elutasitott.json()) as { error: string }
    expect(body.error.length).toBeGreaterThan(0)
    // A lényeg: az elutasított kérés a Bunny felé SEM megy ki.
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('minden válasz no-store, a 200-as és a tiltó ágon is', async () => {
    const { GET } = setup('staff')
    expect((await GET(new Request(URL))).headers.get('Cache-Control')).toBe('no-store')

    const anonHandler = createBunnyVideosHandler({
      getPayload: async () => createPayload(null) as never,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })
    expect((await anonHandler(new Request(URL))).headers.get('Cache-Control')).toBe('no-store')

    const customerHandler = createBunnyVideosHandler({
      getPayload: async () => createPayload('customer') as never,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })
    expect((await customerHandler(new Request(URL))).headers.get('Cache-Control')).toBe('no-store')
  })

  it('a customer a szerepkör-kapun bukik el, nem a kereten (403, nem 429)', async () => {
    const { GET } = setup('customer')
    for (let i = 0; i < 5; i += 1) {
      expect((await GET(new Request(URL))).status).toBe(403)
    }
  })
})

/**
 * L5 és L9 (2026-08-21-i kódvizsgálat): a Bunny-oldali hiba naplózás nélkül
 * ment vissza, a `?library=` pedig kis-nagybetűre érzékeny volt.
 */
describe('createBunnyVideosHandler — library-paraméter és upstream-hiba', () => {
  it('a ?library=PUBLIC a NYILVÁNOS tárat kéri, nem csendben a védettet', async () => {
    process.env.BUNNY_STREAM_PUBLIC_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID = '77'
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [], totalItems: 0 }),
    }))
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('staff') as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const response = await GET(new Request(`${URL}?library=PUBLIC`))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { library: string; libraryId: string }
    expect(body.library).toBe('public')
    expect(body.libraryId).toBe('77')
    delete process.env.BUNNY_STREAM_PUBLIC_LIBRARY_API_KEY
    delete process.env.NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID
  })

  it('ismeretlen library-érték a VÉDETT tárra esik vissza (a szűkebb alapértelmezés)', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '99'
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [], totalItems: 0 }),
    }))
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('staff') as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const response = await GET(new Request(`${URL}?library=publik`))
    const body = (await response.json()) as { library: string }
    expect(body.library).toBe('protected')
  })

  it('upstream Bunny-hiba: 502 a kliensnek, és nem néma — a válasz kódot visz', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '99'
    const fetchImpl = vi.fn(async () => {
      throw new Error('kapcsolat megszakadt')
    })
    const GET = createBunnyVideosHandler({
      getPayload: async () => createPayload('staff') as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const response = await GET(new Request(URL))
    expect(response.status).toBe(502)
    const body = (await response.json()) as { error: string; code: string }
    expect(body.code).toBe('upstream')
    expect(body.error).toContain('nem érhető el')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
