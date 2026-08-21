import type { Payload } from 'payload'

import type { Product } from '../../payload-types'
import type { CourseEnrollment, CourseProgressStatRow } from '../admin/course-progress-stats'
import {
  ENROLLMENT_MAX,
  ENROLLMENT_PAGE_SIZE,
  PROGRESS_MAX,
  PROGRESS_PAGE_SIZE,
} from '../admin/course-progress-handler'
import { buildCurriculum } from '../curriculum/curriculum'
import {
  buildCourseEngagementReport,
  type CourseEngagementInput,
  type CourseEngagementReport,
} from './engagement'
import { trimTruncatedProgress } from './progress-truncation'
import { readStatisticsPages } from './query'

/**
 * Kurzus-hatás lekérdezés — a Payload local API-ról a tiszta engagement-
 * aggregátor bemenete.
 *
 * ═══ SZABÁLYOK ═══
 * - `overrideAccess: true` — a hívó (StatisticsView) felelőssége, hogy ezt
 *   CSAK a szerepkör-kapu (`canAccessStatistics`) UTÁN hívja. Ugyanaz a
 *   szerződés, mint a `queryRevenueReport`-nál: a függvény magában nem
 *   ellenőriz szerepkört, hogy a unit-teszt Payload-mockkal, auth nélkül
 *   futhasson.
 * - A kurzusonkénti CIKLUS szándékos: a webshopban kevés kurzus van (a
 *   plafon is ezt tükrözi), és a soros lekérdezés kíméli az adatbázist —
 *   párhuzamosításra itt nincs szükség.
 * - A felső korlátok a kurzus-haladás handler plafonjainak FELE
 *   (src/lib/admin/course-progress-handler.ts): ez a nézet MINDEN kurzust
 *   egy kérésben aggregál, a handler egyet — a memória-költségvetés így
 *   marad összemérhető. Az importált konstansokból számolódnak, tehát a
 *   két hely nem tud szétcsúszni.
 * - Csonkolásnál a számok ALSÓ becslések, de SOSEM hamisak: a haladás-lista
 *   plafonján túli diákok kimaradnak a sorból (`trimTruncatedProgress`),
 *   nem pedig „nem kezdte el"-ként jelennek meg. Enélkül egy kész diák a
 *   „nem kezdte el" oszlopba esne, vagyis a torzítás iránya ELLENTÉTES
 *   lenne a `truncated` figyelmeztetés ígéretével. A `truncated` jelzést a
 *   nézet magyarul kimondja; a hallgatónkénti pontos adat a kurzus
 *   szerkesztőlapján él, ahol a handler UGYANEZT a közös szabályt hívja.
 * - A tananyaghoz `depth: 0` elég (a course-progress-handler mintája): az
 *   összesítés a mellékleteket nem használja, a lekérdezés így olcsóbb.
 */

/** Egy lapon beolvasott kurzusok száma. */
export const ENGAGEMENT_PRODUCT_PAGE_SIZE = 50
/** Legfeljebb ennyi kurzust aggregálunk egy nézet-betöltéskor. */
export const ENGAGEMENT_PRODUCT_MAX = 200
/** Kurzusonként legfeljebb ennyi hozzáférőt olvasunk be (handler-plafon fele). */
export const ENGAGEMENT_ENROLLMENT_MAX = ENROLLMENT_MAX / 2
/** Kurzusonként legfeljebb ennyi haladás-sort olvasunk be (handler-plafon fele). */
export const ENGAGEMENT_PROGRESS_MAX = PROGRESS_MAX / 2

interface FindResultLike<T> {
  docs?: T[] | null
  totalDocs?: number | null
  hasNextPage?: boolean | null
}

/** A termék-dokumentum azon szelete, amit a lekérdezés KIKÉR. */
interface EngagementProductDoc {
  id?: unknown
  displayTitle?: unknown
  sku?: unknown
  audience?: unknown
  modules?: Product['modules']
  videos?: Product['videos']
}

interface EngagementEnrollmentDoc {
  id?: unknown
}

interface EngagementProgressDoc {
  user?: unknown
  videoRef?: unknown
}

/* A `videos`/`modules` kell a buildCurriculum-nak; érzékeny mező (pl.
   vevő-email, purchases lista) egyik lekérdezésben sincs kiválasztva. */
const PRODUCT_SELECT = {
  displayTitle: true,
  sku: true,
  audience: true,
  modules: true,
  videos: true,
} as const

/* Üres select = csak az `id` jön vissza (a Payload a select-módban az id-t
   mindig adja). Így a vevő e-mailje, számlázási adata és purchases-listája
   be sem kerül a memóriába — ez a nézet csak darabszámot mutat. */
const ENROLLMENT_SELECT = {} as const

const PROGRESS_SELECT = { user: true, videoRef: true } as const

function finiteId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A relationship-érték numerikus azonosítója (nyers id vagy populate-olt doc). */
function relationshipId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'object' && value !== null) {
    return finiteId((value as { id?: unknown }).id)
  }
  return null
}

function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * A kurzus emberi neve: marketingcím, ennek hiányában sku, végül az
 * azonosító — ugyanaz a sorrend, mint a course-progress handlerben.
 */
function productLabel(doc: EngagementProductDoc, productId: number): string {
  return trimmedOrNull(doc.displayTitle) ?? trimmedOrNull(doc.sku) ?? `#${String(productId)}`
}

export interface QueryCourseEngagementDeps {
  payload: Pick<Payload, 'find'>
}

/**
 * Minden kurzus hatás-sora (eladás × haladás) egyetlen jelentésben.
 *
 * `overrideAccess: true` — lásd a fejkommentet: kizárólag a szerepkör-kapu
 * után hívható.
 */
export async function queryCourseEngagement(
  deps: QueryCourseEngagementDeps,
): Promise<CourseEngagementReport> {
  const productsPage = await readStatisticsPages<EngagementProductDoc>(
    (page, limit) =>
      deps.payload.find({
        collection: 'products',
        depth: 0,
        page,
        limit,
        sort: 'id',
        select: PRODUCT_SELECT,
        overrideAccess: true,
      }) as Promise<FindResultLike<EngagementProductDoc>>,
    ENGAGEMENT_PRODUCT_PAGE_SIZE,
    ENGAGEMENT_PRODUCT_MAX,
  )

  let truncated = productsPage.truncated
  const inputs: CourseEngagementInput[] = []

  for (const doc of productsPage.docs) {
    const productId = finiteId(doc.id)
    if (productId === null) {
      continue
    }

    // „Hozzáfér" = akinek a purchases listája tartalmazza a terméket — a
    // course-progress handler definíciója. Csak az azonosító kell: a nevet
    // és az e-mailt ez a nézet nem mutatja, a névsor a kurzus lapján él.
    const enrollmentPage = await readStatisticsPages<EngagementEnrollmentDoc>(
      (page, limit) =>
        deps.payload.find({
          collection: 'users',
          where: { purchases: { equals: productId } },
          depth: 0,
          page,
          limit,
          sort: 'id',
          select: ENROLLMENT_SELECT,
          overrideAccess: true,
        }) as Promise<FindResultLike<EngagementEnrollmentDoc>>,
      ENROLLMENT_PAGE_SIZE,
      ENGAGEMENT_ENROLLMENT_MAX,
    )

    // A `watchedAt` itt nem kell: az összesítő totals-blokkja (elkezdte,
    // befejezte, átlag) nem használja, csak a hallgatónkénti utolsó
    // aktivitás — az pedig a kurzuslap dolga.
    const progressPage = await readStatisticsPages<EngagementProgressDoc>(
      (page, limit) =>
        deps.payload.find({
          collection: 'course-progress',
          where: { product: { equals: productId } },
          depth: 0,
          page,
          limit,
          sort: ['user', 'id'],
          select: PROGRESS_SELECT,
          overrideAccess: true,
        }) as Promise<FindResultLike<EngagementProgressDoc>>,
      PROGRESS_PAGE_SIZE,
      ENGAGEMENT_PROGRESS_MAX,
    )

    truncated = truncated || enrollmentPage.truncated || progressPage.truncated

    const enrollments: CourseEnrollment[] = []
    for (const enrollmentDoc of enrollmentPage.docs) {
      const userId = finiteId(enrollmentDoc.id)
      if (userId === null) {
        continue
      }
      enrollments.push({ userId, email: '', name: null })
    }

    const progressRows: CourseProgressStatRow[] = []
    for (const row of progressPage.docs) {
      const userId = relationshipId(row.user)
      const videoRef = trimmedOrNull(row.videoRef)
      if (userId === null || videoRef === null) {
        continue
      }
      progressRows.push({ userId, videoRef })
    }

    // A haladás-lista plafonjánál az utolsó felhasználó sorai félbevághatók.
    // A közös szabály eldobja őt és a nála nagyobb azonosítójú diákokat —
    // így a sor kevesebb diákot összesít, de amit mutat, az igaz.
    const teljes = trimTruncatedProgress({
      progressRows,
      enrollments,
      truncated: progressPage.truncated,
    })

    inputs.push({
      productId,
      title: productLabel(doc, productId),
      audience: doc.audience,
      // hasAccess: true — az admin a teljes szerkezetet látja; a modellből
      // ebben a nézetben csak a leckeszám (nevező) hasznosul, GUID nem megy ki.
      curriculum: buildCurriculum(
        { modules: doc.modules ?? null, videos: doc.videos ?? null },
        true,
      ),
      enrollments: teljes.enrollments,
      progressRows: teljes.progressRows,
    })
  }

  return buildCourseEngagementReport(inputs, { truncated })
}
