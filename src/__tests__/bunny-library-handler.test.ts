import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBunnyVideosHandler } from '../lib/stream/bunny-library-handler'

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
})
