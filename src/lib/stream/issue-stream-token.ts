import type { Payload } from 'payload'

import { accessExpiredMessage } from '../course-access'
import { resolveSingleCourseAccess } from '../course-access-lookup'
import type { Product, User } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import { createStreamPlaybackToken } from './token'

/**
 * GET /api/stream-token üzleti logikája (paywall API-szinten).
 *
 * Szabályok:
 * - Csak bejelentkezett felhasználó (az auth a route-handlerben történik).
 * - A felhasználó `purchases` listájának TARTALMAZNIA kell a terméket
 *   (a T-022 Barion-callback írja, idempotensen) — egyébként 403.
 * - A termék státusza: published → rendben; archived → a meglévő vevő
 *   tovább nézi; draft (vagy ismeretlen) → senkinek sem (403).
 * - A hozzáférés IDŐBELI érvényessége (A1): a termék `accessDurationDays`
 *   mezője szerint lejárt hozzáférés → 403, magyar üzenettel és strukturált
 *   naplóval. A szabály egyetlen forrása az src/lib/course-access.ts.
 * - Információminimalizálás: a nem-vevő 403-as válasza akkor is ugyanaz,
 *   ha a termék/videó nem létezik — a vásárlás-ellenőrzés a termék
 *   lekérdezése ELŐTT történik, így a 403 nem árulja el a létezést. A lejárt
 *   hozzáférés eltérő üzenete csak a bizonyítottan vásárló vevőhöz jut el.
 *
 * A CF_STREAM_SIGNING_KEY környezeti változó NEM induláskori kötelező ENV
 * (az app annélkül is elindul) — itt, kérés-idejű lazy ellenőrzéssel
 * hiányzik: 503 + naplózás.
 */

/** Üzleti hiba HTTP-státusszal és magyar felhasználói üzenettel. */
export class StreamTokenError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'StreamTokenError'
    this.status = status
  }
}

export interface StreamTokenServiceInput {
  payload: Payload
  user: User
  /** A kérés productId query-paramétere (nyers, validálatlan). */
  productId: unknown
  /** Opcionális videó-azonosító a terméken belül (streamAssetId vagy sor-id). */
  videoId?: unknown
  /** RequestId-vel kötött logger (opcionális; alapértelmezés a root logger). */
  logger?: Logger
}

export interface StreamTokenServiceResult {
  /** Az aláírt Cloudflare Stream lejátszási JWT. */
  token: string
  /** A token lejárata (ISO 8601) — a kliens UX-höz. */
  expiresAt: string
}

/** Egységes 403-as üzenet — nem árulja el, hogy létezik-e a termék/videó. */
const FORBIDDEN_MESSAGE = 'A videó megtekintéséhez a kurzus megvásárlása szükséges.'

/** Egységes 503-as üzenet — a CF_STREAM_* konfiguráció/adat hibáira. */
const UNAVAILABLE_MESSAGE =
  'A videólejátszás ideiglenesen nem érhető el. Kérjük, próbáld újra később.'

function parseProductId(raw: unknown): number {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const parsed = Number(raw.trim())
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }
  throw new StreamTokenError(400, 'Érvénytelen vagy hiányzó termékazonosító.')
}

/** A users.purchases relationship eleme lehet id (number) vagy populate-olt Product. */
function hasPurchased(user: User, productId: number): boolean {
  const purchases = Array.isArray(user.purchases) ? user.purchases : []
  return purchases.some((entry) => {
    if (typeof entry === 'number') {
      return entry === productId
    }
    return (
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.id === 'number' &&
      entry.id === productId
    )
  })
}

type ProductVideo = NonNullable<Product['videos']>[number]

/**
 * Videó kiválasztása a termékből. videoId nélkül az első lejátszásra kész
 * (ready) videó, egyébként az első elem; videoId-val streamAssetId VAGY a
 * sor `id` mezője szerinti egyezés.
 */
function selectVideo(product: Product, videoId: string | undefined): ProductVideo {
  const videos = Array.isArray(product.videos) ? product.videos : []
  if (videoId !== undefined) {
    const match = videos.find((video) => video.streamAssetId === videoId || video.id === videoId)
    if (!match) {
      throw new StreamTokenError(404, 'A kért videó nem található.')
    }
    return match
  }
  const first = videos.find((video) => video.status === 'ready') ?? videos[0]
  if (!first) {
    throw new StreamTokenError(404, 'A kurzushoz nem tartozik lejátszható videó.')
  }
  return first
}

/** Kérés-idejű (lazy) ENV-ellenőrzés — NEM induláskori assert (lásd src/env.ts megjegyzés). */
function requireSigningKey(log: Logger): string {
  const key = process.env.CF_STREAM_SIGNING_KEY
  if (typeof key !== 'string' || key.trim().length === 0) {
    log.error('stream-token: hiányzik a CF_STREAM_SIGNING_KEY — a videólejátszás nem elérhető')
    throw new StreamTokenError(503, UNAVAILABLE_MESSAGE)
  }
  return key
}

export async function issueStreamToken(
  input: StreamTokenServiceInput,
): Promise<StreamTokenServiceResult> {
  const log = input.logger ?? rootLogger
  const productId = parseProductId(input.productId)

  // 1) Paywall: a vásárlás-ellenőrzés a termék lekérdezése ELŐTT — a nem-vevő
  //    403-as válasza nem fedi fel, hogy a termék/videó egyáltalán létezik-e.
  if (!hasPurchased(input.user, productId)) {
    log.warn('stream-token: hozzáférés megtagadva (nincs vásárlás)', {
      userId: input.user.id,
      productId,
    })
    throw new StreamTokenError(403, FORBIDDEN_MESSAGE)
  }

  // 2) A vevő esetében a termék biztosan létezik a purchases miatt; ha mégsem,
  //    az adat-inkonzisztencia — 404 (a nem-vevők felé nincs enumerációs csatorna).
  let product: Product
  try {
    product = await input.payload.findByID({
      collection: 'products',
      id: productId,
      overrideAccess: true,
      depth: 0,
    })
  } catch {
    log.warn('stream-token: a megvásárolt termék nem található', {
      userId: input.user.id,
      productId,
    })
    throw new StreamTokenError(404, 'A kurzus nem található.')
  }

  // 3) Státusz-szabály: published → rendben; archived → a meglévő vevő tovább
  //    nézi; draft/ismeretlen → senki (owner preview jelenleg nem scope).
  if (product.status !== 'published' && product.status !== 'archived') {
    log.warn('stream-token: a termék nem published/archived státuszú', {
      userId: input.user.id,
      productId,
    })
    throw new StreamTokenError(403, FORBIDDEN_MESSAGE)
  }

  // 3/b) Időbeli érvényesség: a termék accessDurationDays mezője szerint lejárt
  //      hozzáférés → 403. Korlátlan terméknél (üres/0/negatív mező) ez extra
  //      adatbázis-kör nélkül fut le.
  const access = await resolveSingleCourseAccess({
    payload: input.payload,
    userId: input.user.id,
    product,
    logger: log,
  })
  if (!access.hasAccess) {
    log.warn('stream-token: hozzáférés megtagadva (lejárt hozzáférés)', {
      userId: input.user.id,
      productId,
      accessDurationDays: product.accessDurationDays ?? null,
      expiresAt: access.expiresAt?.toISOString() ?? null,
    })
    throw new StreamTokenError(403, accessExpiredMessage(access.expiresAt))
  }

  // 4) Videó kiválasztása és lejátszhatóság-ellenőrzés.
  const rawVideoId = typeof input.videoId === 'string' ? input.videoId.trim() : ''
  const video = selectVideo(product, rawVideoId.length > 0 ? rawVideoId : undefined)
  const streamAssetId = typeof video.streamAssetId === 'string' ? video.streamAssetId.trim() : ''
  if (streamAssetId.length === 0) {
    log.error('stream-token: a videóhoz nincs streamAssetId rendelve', {
      userId: input.user.id,
      productId,
    })
    throw new StreamTokenError(503, UNAVAILABLE_MESSAGE)
  }
  if (video.status !== 'ready') {
    throw new StreamTokenError(
      409,
      'A videó feldolgozása még folyamatban van. Kérjük, próbáld újra később.',
    )
  }
  if (
    typeof video.durationSec !== 'number' ||
    !Number.isFinite(video.durationSec) ||
    video.durationSec < 0
  ) {
    log.error('stream-token: a videó durationSec mezője hiányzik vagy érvénytelen', {
      userId: input.user.id,
      productId,
    })
    throw new StreamTokenError(503, UNAVAILABLE_MESSAGE)
  }

  // 5) Token kiállítása — a signing key kérés-idejű lazy ellenőrzéssel.
  const signingKey = requireSigningKey(log)
  const keyId = process.env.CF_STREAM_SIGNING_KEY_ID
  const issued = createStreamPlaybackToken({
    videoId: streamAssetId,
    durationSec: video.durationSec,
    signingKey,
    keyId: typeof keyId === 'string' && keyId.trim().length > 0 ? keyId : undefined,
  })

  log.info('stream-token: lejátszási token kiállítva', {
    userId: input.user.id,
    productId,
    expiresAt: new Date(issued.exp * 1000).toISOString(),
  })

  return {
    token: issued.token,
    expiresAt: new Date(issued.exp * 1000).toISOString(),
  }
}
