import type { Payload } from 'payload'

import type { CourseProgress, Product, User } from '../../payload-types'
import { accessExpiredMessage } from '../course-access'
import { resolveSingleCourseAccess } from '../course-access-lookup'
import { hasUserPurchased } from '../courses'
import { buildCurriculum, findLessonByRef } from '../curriculum/curriculum'
import { logger as rootLogger, type Logger } from '../logger'
import type { MarkWatchedResponseBody } from './contract'

/**
 * POST /api/course-progress/mark-watched üzleti logikája — „megnéztem ezt a
 * videót" jelölés (E1).
 *
 * A hozzáférés-ellenőrzés NEM duplikálja a szabályokat: ugyanazt a modult
 * hívja, amit a lejátszási token kiadása (src/lib/stream/issue-stream-token.ts)
 * — a vásárlás-ellenőrzést az src/lib/courses.ts `hasUserPurchased`-e, az
 * időbeli érvényességet az src/lib/course-access.ts szabálya
 * (`resolveSingleCourseAccess`) adja. Ha a lejáratszabály változik, ez a
 * végpont automatikusan követi.
 *
 * Sorrend (információminimalizálás, a stream-token mintája): a vásárlás-
 * ellenőrzés a termék lekérdezése ELŐTT fut, így a nem-vevő 403-as válasza nem
 * árulja el, hogy a kurzus egyáltalán létezik-e.
 *
 * Státusz-szabály: `published` → rendben; `archived` → a MEGLÉVŐ vevő tovább
 * nézi (és így jelölhet is — ugyanaz a szabály, mint a lejátszásnál); minden
 * más (draft/ismeretlen) → 404.
 *
 * Idempotencia: find-then-create. Ha a videó már megnézettként szerepel, a
 * válasz 200 `{ alreadyWatched: true }` — nem hiba. Párhuzamos kérésnél a
 * collection unique compound indexe (user + product + videoRef) fog, a create
 * hibája után a szolgáltatás újraolvassa a meglévő sort.
 */

/** Üzleti hiba HTTP-státusszal és magyar felhasználói üzenettel. */
export class CourseProgressError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CourseProgressError'
    this.status = status
  }
}

/** Egységes 403 — nem árulja el, hogy létezik-e a kurzus/videó. */
export const NOT_PURCHASED_MESSAGE =
  'A haladás rögzítéséhez a kurzus megvásárlása szükséges.'

/** Egységes 404 — a vevő számára sem elérhető (draft/ismeretlen) kurzus. */
export const COURSE_NOT_FOUND_MESSAGE = 'A kurzus nem található.'

/** 400 — a kért videó nem ehhez a kurzushoz tartozik. */
export const UNKNOWN_VIDEO_MESSAGE = 'A megjelölni kívánt videó nem ehhez a kurzushoz tartozik.'

/** 400 — hiányzó vagy hibás típusú mező a kérés törzsében. */
export const INVALID_BODY_MESSAGE =
  'Érvénytelen kérés: a kurzus és a videó azonosítója is kötelező.'

export interface MarkWatchedServiceInput {
  payload: Payload
  user: User
  /** A kérés törzsének productId mezője (nyers, validálatlan). */
  productId: unknown
  /** A kérés törzsének videoRef mezője (nyers, validálatlan). */
  videoRef: unknown
  /** „Most" — determinisztikus teszteléshez injektálható. */
  now?: Date
  logger?: Logger
}

/** A szolgáltatás eredménye AZONOS a végpont válasz-törzsével (közös szerződés). */
export type MarkWatchedServiceResult = MarkWatchedResponseBody

/**
 * A termékazonosító elfogadott alakja: pozitív egész szám VAGY csak számjegyet
 * tartalmazó szöveg. A szerződés szerint a kliens szövegként küldi; a számot is
 * elfogadjuk, mert a JSON-ban ez a természetes alak, és a repó másik végpontja
 * (stream-token) is így viselkedik.
 */
function parseProductId(raw: unknown): number {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const parsed = Number(raw.trim())
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed
    }
  }
  throw new CourseProgressError(400, INVALID_BODY_MESSAGE)
}

/** A videó stabil azonosítója — kizárólag nem üres szöveg. */
function parseVideoRef(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new CourseProgressError(400, INVALID_BODY_MESSAGE)
  }
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new CourseProgressError(400, INVALID_BODY_MESSAGE)
  }
  return trimmed
}

/**
 * A videoRef csak akkor fogadható el, ha a termék TANANYAGÁBAN (modulok →
 * leckék, vagy a régi, lapos videólista) VAN olyan lecke, amelynek a stabil
 * refje pontosan ez. Így a haladás sosem mutathat idegen (vagy kitalált)
 * leckére.
 *
 * A keresés SZÁNDÉKOSAN kizárólag a `ref`-re illeszt (a Bunny-GUID-ra nem, még
 * akkor sem, ha a sornak van saját id-ja): a `course-progress.videoRef` névtér
 * egységes, és a két alak egyidejű elfogadása ugyanahhoz a leckéhez két
 * különböző haladás-sort engedne létrejönni.
 *
 * A NEM elindítható lecke (pl. feldolgozás alatti videó) jelölése továbbra is
 * megengedett — ez a korábbi viselkedés —, a haladás-számításba viszont nem
 * számít bele (src/lib/curriculum/progress.ts).
 */
function lessonBelongsToProduct(product: Product, videoRef: string): boolean {
  return findLessonByRef(buildCurriculum(product, true), videoRef) !== null
}

/** A meglévő haladás-sor `watchedAt` értéke ISO-alakban (hibás érték → most). */
function watchedAtIso(row: CourseProgress, fallback: Date): string {
  const raw = row.watchedAt
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw)
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString()
    }
  }
  return fallback.toISOString()
}

/** A user+product+videoRef hármas meglévő sora (ha van). */
async function findExisting(input: {
  payload: Payload
  userId: number
  productId: number
  videoRef: string
}): Promise<CourseProgress | null> {
  const result = await input.payload.find({
    collection: 'course-progress',
    where: {
      and: [
        { user: { equals: input.userId } },
        { product: { equals: input.productId } },
        { videoRef: { equals: input.videoRef } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

export async function markVideoWatched(
  input: MarkWatchedServiceInput,
): Promise<MarkWatchedServiceResult> {
  const log = input.logger ?? rootLogger
  const productId = parseProductId(input.productId)
  const videoRef = parseVideoRef(input.videoRef)
  const now = input.now ?? new Date()

  // 1) Paywall: a vásárlás-ellenőrzés a termék lekérdezése ELŐTT.
  if (!hasUserPurchased(input.user.purchases, productId)) {
    log.warn('kurzus-haladás: jelölés megtagadva (nincs vásárlás)', {
      userId: input.user.id,
      productId,
    })
    throw new CourseProgressError(403, NOT_PURCHASED_MESSAGE)
  }

  // 2) A termék betöltése (a vevőnél a purchases miatt léteznie kell).
  let product: Product
  try {
    product = await input.payload.findByID({
      collection: 'products',
      id: productId,
      overrideAccess: true,
      depth: 0,
    })
  } catch {
    log.warn('kurzus-haladás: a megvásárolt termék nem található', {
      userId: input.user.id,
      productId,
    })
    throw new CourseProgressError(404, COURSE_NOT_FOUND_MESSAGE)
  }

  // 3) Státusz: published/archived → rendben; draft vagy ismeretlen → 404.
  if (product.status !== 'published' && product.status !== 'archived') {
    log.warn('kurzus-haladás: a termék nem elérhető státuszú', {
      userId: input.user.id,
      productId,
      status: product.status ?? null,
    })
    throw new CourseProgressError(404, COURSE_NOT_FOUND_MESSAGE)
  }

  // 4) Időbeli érvényesség (A1) — a lejárt hozzáférésű vevő nem rögzít haladást.
  const access = await resolveSingleCourseAccess({
    payload: input.payload,
    userId: input.user.id,
    product,
    now: input.now,
    logger: log,
  })
  if (!access.hasAccess) {
    log.warn('kurzus-haladás: jelölés megtagadva (lejárt hozzáférés)', {
      userId: input.user.id,
      productId,
      expiresAt: access.expiresAt?.toISOString() ?? null,
    })
    throw new CourseProgressError(403, accessExpiredMessage(access.expiresAt))
  }

  // 5) A videoRef ehhez a kurzushoz tartozik-e (stabil azonosító, sosem sorszám).
  if (!lessonBelongsToProduct(product, videoRef)) {
    log.warn('kurzus-haladás: ismeretlen videó-azonosító a kurzuson', {
      userId: input.user.id,
      productId,
    })
    throw new CourseProgressError(400, UNKNOWN_VIDEO_MESSAGE)
  }

  // 6) Idempotens írás: find-then-create.
  const existing = await findExisting({
    payload: input.payload,
    userId: input.user.id,
    productId,
    videoRef,
  })
  if (existing !== null) {
    return {
      productId,
      videoRef,
      watchedAt: watchedAtIso(existing, now),
      alreadyWatched: true,
    }
  }

  try {
    const created = await input.payload.create({
      collection: 'course-progress',
      data: {
        user: input.user.id,
        product: productId,
        videoRef,
        watchedAt: now.toISOString(),
      },
      overrideAccess: true,
    })
    log.info('kurzus-haladás: videó megjelölve megnézettként', {
      userId: input.user.id,
      productId,
    })
    return {
      productId,
      videoRef,
      watchedAt: watchedAtIso(created, now),
      alreadyWatched: false,
    }
  } catch (error) {
    // Verseny két párhuzamos kérés között: a unique compound index elutasítja a
    // másodikat. Ez NEM felhasználói hiba — a sor létezik, a kérés célja teljesült.
    const raced = await findExisting({
      payload: input.payload,
      userId: input.user.id,
      productId,
      videoRef,
    })
    if (raced !== null) {
      log.info('kurzus-haladás: párhuzamos jelölés — a meglévő sor marad', {
        userId: input.user.id,
        productId,
      })
      return {
        productId,
        videoRef,
        watchedAt: watchedAtIso(raced, now),
        alreadyWatched: true,
      }
    }
    throw error
  }
}
