import { afterEach, describe, expect, it, vi } from 'vitest'

import { optionalBunnyStreamEnvVars, requiredEnvVars } from '../env'
import {
  BUNNY_LIBRARY_API_KEY_ENV,
  BUNNY_PUBLIC_LIBRARY_API_KEY_ENV,
  BUNNY_SEARCH_MAX_LENGTH,
  listBunnyLibraryVideos,
  parseBunnyLibraryVideo,
  parseBunnyLibraryListPayload,
} from '../lib/stream/bunny-library'

/**
 * Bunny Stream library-lista — parser + injektált fetch, nincs valódi hálózat.
 */

const DUMMY_KEY = 'DUMMY-BUNNY-LIBRARY-KEY'

describe('Bunny library ENV — titok, nem kötelező, nem NEXT_PUBLIC', () => {
  it('a library API-kulcsok opcionálisak és nem döntik el az appot', () => {
    expect(optionalBunnyStreamEnvVars).toContain(BUNNY_LIBRARY_API_KEY_ENV)
    expect(optionalBunnyStreamEnvVars).toContain(BUNNY_PUBLIC_LIBRARY_API_KEY_ENV)
    expect(requiredEnvVars as readonly string[]).not.toContain(BUNNY_LIBRARY_API_KEY_ENV)
    expect(BUNNY_LIBRARY_API_KEY_ENV.startsWith('NEXT_PUBLIC_')).toBe(false)
    expect(BUNNY_PUBLIC_LIBRARY_API_KEY_ENV.startsWith('NEXT_PUBLIC_')).toBe(false)
  })
})

describe('parseBunnyLibraryVideo', () => {
  it('camelCase és PascalCase mezőket is elfogad', () => {
    const camel = parseBunnyLibraryVideo({
      guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      title: '1. ALAPOK',
      length: 213,
      status: 4,
      dateUploaded: '2026-08-01T10:00:00Z',
    })
    expect(camel?.guid).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(camel?.statusLabel).toBe('Kész')
    expect(camel?.lengthSec).toBe(213)

    const pascal = parseBunnyLibraryVideo({
      Guid: '11111111-2222-3333-4444-555555555555',
      Title: 'Előzetes',
      Length: 40,
      Status: 2,
    })
    expect(pascal?.title).toBe('Előzetes')
    expect(pascal?.statusLabel).toBe('Feldolgozás')
  })

  it('GUID nélkül null', () => {
    expect(parseBunnyLibraryVideo({ title: 'nincs id', status: 4 })).toBeNull()
  })
})

describe('parseBunnyLibraryListPayload', () => {
  it('az Items tömböt is olvassa', () => {
    const list = parseBunnyLibraryListPayload(
      {
        TotalItems: 1,
        Items: [
          { Guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', Title: 'Lecke', Status: 4, Length: 10 },
        ],
      },
      { kind: 'protected', libraryId: '123' },
    )
    expect(list?.videos).toHaveLength(1)
    expect(list?.totalItems).toBe(1)
  })
})

describe('listBunnyLibraryVideos', () => {
  afterEach(() => {
    delete process.env.BUNNY_STREAM_LIBRARY_API_KEY
    delete process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID
  })

  it('hiányzó kulcs → not-configured, magyar üzenet, nincs fetch', async () => {
    delete process.env.BUNNY_STREAM_LIBRARY_API_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '123'
    const fetchImpl = vi.fn()
    const result = await listBunnyLibraryVideos({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kind: 'protected',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('not-configured')
      expect(result.message).toContain('nincs bekötve')
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('siker: AccessKey fejléc megy, a lista parse-olódik, a kulcs NEM kerül a kimenetbe', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '4242'
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain('/library/4242/videos')
      const headers = init?.headers as Record<string, string>
      expect(headers.AccessKey).toBe(DUMMY_KEY)
      return {
        ok: true,
        status: 200,
        json: async () => ({
          totalItems: 1,
          items: [
            {
              guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              title: 'Lecke 1',
              status: 4,
              length: 90,
            },
          ],
        }),
      }
    })

    const result = await listBunnyLibraryVideos({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kind: 'protected',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.list.videos[0]?.title).toBe('Lecke 1')
      expect(JSON.stringify(result)).not.toContain(DUMMY_KEY)
    }
  })

  it('nem numerikus libraryId → invalid-library-id, nincs fetch', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '../evil'
    const fetchImpl = vi.fn()
    const result = await listBunnyLibraryVideos({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kind: 'protected',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('invalid-library-id')
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('túl hosszú keresés → invalid-search, nincs fetch', async () => {
    process.env.BUNNY_STREAM_LIBRARY_API_KEY = DUMMY_KEY
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID = '4242'
    const fetchImpl = vi.fn()
    const result = await listBunnyLibraryVideos({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kind: 'protected',
      search: 'x'.repeat(BUNNY_SEARCH_MAX_LENGTH + 1),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('invalid-search')
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
