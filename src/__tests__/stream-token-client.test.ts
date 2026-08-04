import { describe, expect, it, vi } from 'vitest'

import { fetchStreamToken, GENERIC_STREAM_ERROR } from '../lib/stream-token-client'

describe('fetchStreamToken', () => {
  it('200 {token, expiresAt} → token-kind', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt.abc', expiresAt: 1785588000 }), { status: 200 }),
    )
    const result = await fetchStreamToken({ productId: 1, videoIndex: 0 }, mockFetch as never)
    expect(result).toEqual({ kind: 'token', token: 'jwt.abc', expiresAt: 1785588000 })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/stream-token?productId=1&videoIndex=0',
      expect.objectContaining({ credentials: 'include' }),
    )
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
