/**
 * A POST /api/course-progress/mark-watched végpont KÖZÖS szerződése — a kliens
 * (lejátszó-komponens) és a szerver (route-handler + szolgáltatás) egyetlen
 * közös forrása.
 *
 * A src/lib/stream/contract.ts mintája: a kérés- és válasz-alak EGY helyen van
 * leírva, így a két oldal nem tudhat észrevétlenül eltérni egymástól (a
 * stream-token végponton ez korábban valós hibát okozott: a kliens
 * `videoIndex`-et küldött, a szerver `videoId`-t olvasott).
 *
 * A modul környezet-független (nincs benne node:, Payload vagy Next import),
 * ezért kliens-komponensből és szerverről is importálható.
 *
 * Szerződés:
 * - Kérés:  POST /api/course-progress/mark-watched
 *           törzs: { productId: string, videoRef: string }
 * - Válasz: 200 { productId: number, videoRef: string, watchedAt: string (ISO-8601),
 *           alreadyWatched: boolean }
 *   Az `alreadyWatched: true` NEM hiba: a végpont idempotens, az ismételt
 *   megjelölés ugyanazt a sort adja vissza.
 * - Hibák:  401 (nincs belépés) · 403 (nincs megvásárolva / lejárt hozzáférés)
 *           · 404 (nincs ilyen elérhető kurzus) · 400 (hibás törzs vagy a
 *           videoRef nem ehhez a kurzushoz tartozik) · 500.
 */

/** A végpont útvonala — a kliens EZZEL építi a kérést. */
export const MARK_WATCHED_PATH = '/api/course-progress/mark-watched'

/** A kérés törzse. A `productId` szövegként utazik (a szerver számot is elfogad). */
export interface MarkWatchedRequestBody {
  productId: string
  videoRef: string
}

/** A 200-as válasz törzse — a szerver ezt adja, a kliens ezt olvassa. */
export interface MarkWatchedResponseBody {
  productId: number
  videoRef: string
  /** A megjelölés időpontja ISO-8601 (UTC) alakban. */
  watchedAt: string
  /** true, ha a videó MÁR korábban meg volt jelölve (idempotens ismétlés). */
  alreadyWatched: boolean
}

export function buildMarkWatchedRequestBody(input: {
  productId: number
  videoRef: string
}): MarkWatchedRequestBody {
  return { productId: String(input.productId), videoRef: input.videoRef }
}

/**
 * A 200-as válasz törzsének ellenőrzése és parse-olása.
 *
 * @returns a parse-olt válasz, vagy null, ha a törzs nem felel meg a
 *   szerződésnek (a hívó ilyenkor általános hibaüzenetet mutat).
 */
export function parseMarkWatchedResponseBody(body: unknown): MarkWatchedResponseBody | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const candidate = body as {
    productId?: unknown
    videoRef?: unknown
    watchedAt?: unknown
    alreadyWatched?: unknown
  }
  if (typeof candidate.productId !== 'number' || !Number.isFinite(candidate.productId)) {
    return null
  }
  if (typeof candidate.videoRef !== 'string' || candidate.videoRef.length === 0) {
    return null
  }
  if (typeof candidate.watchedAt !== 'string' || !Number.isFinite(Date.parse(candidate.watchedAt))) {
    return null
  }
  if (typeof candidate.alreadyWatched !== 'boolean') {
    return null
  }
  return {
    productId: candidate.productId,
    videoRef: candidate.videoRef,
    watchedAt: candidate.watchedAt,
    alreadyWatched: candidate.alreadyWatched,
  }
}
