/**
 * Stream-token kliens — a GET /api/stream-token végpont hívása a lejátszóhoz.
 *
 * API-szerződés (T-032): GET /api/stream-token?productId={id}&videoId={streamAssetId}
 * - 200 { token, expiresAt } — a signed playback token és a lejárat (ISO 8601 string);
 * - 401 (nincs bejelentkezés), 403 (nem vevő/draft), 404, 503 (hiányzó CF-kulcs), 500.
 */

export type StreamTokenResult =
  | { kind: 'token'; token: string; expiresAt: string }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

export const GENERIC_STREAM_ERROR =
  'A videó lejátszási joga most nem ellenőrizhető. Próbáld újra néhány perc múlva.'

export async function fetchStreamToken(
  input: { productId: number; videoId?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<StreamTokenResult> {
  try {
    const params = new URLSearchParams({ productId: String(input.productId) })
    if (typeof input.videoId === 'string' && input.videoId.length > 0) {
      params.set('videoId', input.videoId)
    }
    const response = await fetchImpl(`/api/stream-token?${params.toString()}`, {
      credentials: 'include',
    })

    if (response.status === 401 || response.status === 403) {
      return { kind: 'forbidden' }
    }
    if (response.status === 503) {
      return { kind: 'unavailable' }
    }
    if (!response.ok) {
      return { kind: 'error', message: GENERIC_STREAM_ERROR }
    }

    const body = (await response.json()) as { token?: string; expiresAt?: string }
    if (
      typeof body.token !== 'string' ||
      typeof body.expiresAt !== 'string' ||
      body.expiresAt.length === 0 ||
      Number.isNaN(Date.parse(body.expiresAt))
    ) {
      return { kind: 'error', message: GENERIC_STREAM_ERROR }
    }
    return { kind: 'token', token: body.token, expiresAt: body.expiresAt }
  } catch {
    return { kind: 'error', message: GENERIC_STREAM_ERROR }
  }
}
