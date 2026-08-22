import {
  buildMarkWatchedRequestBody,
  MARK_WATCHED_PATH,
  parseMarkWatchedResponseBody,
} from './contract'

/**
 * Kurzus-haladás kliens — a POST /api/course-progress/mark-watched hívása a
 * lejátszóból.
 *
 * A kérés- és válasz-alak EGYETLEN forrása a ./contract.ts (ezt használja a
 * szerver oldala is): a kliens nem épít saját törzset és nem értelmezi maga a
 * választ. A hívó a diszkriminált eredményből dönt — HTTP-státuszt sehol nem
 * kell ismernie.
 */

export type MarkWatchedResult =
  /** Sikeres (vagy idempotensen ismételt) jelölés. */
  | { kind: 'ok'; watchedAt: string; alreadyWatched: boolean }
  /** Nincs (már) jogosultság: nincs belépve, nem vevő, vagy lejárt a hozzáférés. */
  | { kind: 'forbidden'; message: string }
  /** Bármi más hiba — általános, magyar üzenettel. */
  | { kind: 'error'; message: string }

export const GENERIC_MARK_WATCHED_ERROR =
  'A megjelölés most nem sikerült. Próbáld újra néhány perc múlva.'

export const FORBIDDEN_MARK_WATCHED_ERROR =
  'A haladás rögzítéséhez érvényes hozzáférés szükséges ehhez a kurzushoz.'

/** A szervertől kapott magyar hibaüzenet — ha nincs, az általános szöveg. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const candidate = (body as { error?: unknown }).error
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate
      }
    }
  } catch {
    // A törzs hiánya/olvashatatlansága nem külön hibaág — marad a fallback.
  }
  return fallback
}

export async function markVideoWatched(
  input: { productId: number; videoRef: string },
  fetchImpl: typeof fetch = fetch,
): Promise<MarkWatchedResult> {
  try {
    const response = await fetchImpl(MARK_WATCHED_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildMarkWatchedRequestBody(input)),
    })

    if (response.status === 401 || response.status === 403) {
      return {
        kind: 'forbidden',
        message: await errorMessage(response, FORBIDDEN_MARK_WATCHED_ERROR),
      }
    }
    if (!response.ok) {
      return { kind: 'error', message: await errorMessage(response, GENERIC_MARK_WATCHED_ERROR) }
    }

    const parsed = parseMarkWatchedResponseBody(await response.json())
    if (parsed === null) {
      return { kind: 'error', message: GENERIC_MARK_WATCHED_ERROR }
    }
    return { kind: 'ok', watchedAt: parsed.watchedAt, alreadyWatched: parsed.alreadyWatched }
  } catch {
    return { kind: 'error', message: GENERIC_MARK_WATCHED_ERROR }
  }
}
