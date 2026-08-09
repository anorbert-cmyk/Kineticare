import { describe, expect, it, vi } from 'vitest'

import { fetchStreamToken, GENERIC_STREAM_ERROR } from '../lib/stream-token-client'

describe('fetchStreamToken', () => {
  it('200 {token, expiresAt: ISO} → token-kind, videoId a queryben', async () => {
    const expiresAt = '2026-08-09T12:00:00.000Z'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt.abc', expiresAt }), { status: 200 }),
    )
    const result = await fetchStreamToken({ productId: 1, videoId: 'stream-asset-7' }, mockFetch as never)
    expect(result).toEqual({ kind: 'token', token: 'jwt.abc', expiresAt })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/stream-token?productId=1&videoId=stream-asset-7',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('videoId nélkül a queryben sincs videoId', async () => {
    const expiresAt = '2026-08-09T12:00:00.000Z'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt.abc', expiresAt }), { status: 200 }),
    )
    const result = await fetchStreamToken({ productId: 1 }, mockFetch as never)
    expect(result).toEqual({ kind: 'token', token: 'jwt.abc', expiresAt })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/stream-token?productId=1',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('az expiresAt ISO-stringként jön át (Date.parse-szal unix mp-re alakítható)', async () => {
    const expiresAt = '2026-08-09T12:00:00.000Z'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt.abc', expiresAt }), { status: 200 }),
    )
    const result = await fetchStreamToken({ productId: 1, videoId: 'stream-asset-7' }, mockFetch as never)
    if (result.kind !== 'token') {
      throw new Error('token-kind várt eredmény')
    }
    expect(Math.floor(Date.parse(result.expiresAt) / 1000)).toBe(1786276800)
  })

  it('numerikus expiresAt → error (a szerver ISO-t ad)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt.abc', expiresAt: 1785588000 }), { status: 200 }),
    )
    const result = await fetchStreamToken({ productId: 1 }, mockFetch as never)
    expect(result).toEqual({ kind: 'error', message: GENERIC_STREAM_ERROR })
  })

  it('érvénytelen dátum-string expiresAt → error', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt.abc', expiresAt: 'nem-datum' }), { status: 200 }),
    )
    const result = await fetchStreamToken({ productId: 1 }, mockFetch as never)
    expect(result).toEqual({ kind: 'error', message: GENERIC_STREAM_ERROR })
  })

  it('401/403 → forbidden (nem-vevő)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    const result = await fetchStreamToken({ productId: 1 }, mockFetch as never)
    expect(result).toEqual({ kind: 'forbidden' })
  })

  it('503 → unavailable (hiányzó CF-kulcs)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))
    const result = await fetchStreamToken({ productId: 1 }, mockFetch as never)
    expect(result).toEqual({ kind: 'unavailable' })
  })

  it('500 → error általános üzenettel', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
    const result = await fetchStreamToken({ productId: 1 }, mockFetch as never)
    expect(result).toEqual({ kind: 'error', message: GENERIC_STREAM_ERROR })
  })
})
