import type { Payload } from 'payload'

import type { Order, Product } from '../payload-types'
import { resolveCourseAccess, type CourseAccessState } from './course-access'
import { logger as rootLogger, type Logger } from './logger'

/**
 * A vásárlási időpont felderítése a hozzáférés-számításhoz (A1).
 *
 * A `users.purchases` reláció csak azt tudja, MIT vett meg a felhasználó — azt
 * nem, hogy MIKOR. Az orders sémában nincs `paidAt` mező (új mező migrációt
 * igényelne, ami tilos zóna), ezért a vásárlás időpontja a termékre szóló
 * **paid** rendelés `createdAt` értéke. A rendelés és a paid átmenet között
 * percek telnek el, a hozzáférés hossza pedig napokban mérendő — ez a
 * pontosság bőven elegendő.
 *
 * Ismételt vásárlás (megújítás) esetén a LEGUTOLSÓ paid rendelés számít, így az
 * újravásárlás meghosszabbítja a hozzáférést.
 *
 * A modul tiszta magja a `purchaseDatesFromOrders` (rendelés-lista → térkép);
 * a Payload-lekérdezés csak az adatot szállítja hozzá.
 */

/**
 * Egy vevőnél ennél több paid rendeléssel nem számolunk egy oldalletöltésen.
 * A lekérdezés a LEGFRISSEBB rendelésekkel kezd (`-createdAt`), mert a
 * megújítás-szabály szerint úgyis a legutolsó vásárlás dönt.
 */
export const PURCHASE_HISTORY_QUERY_LIMIT = 250

/**
 * productId → a legutolsó PAID rendelés `createdAt` értéke (ISO-string).
 * A nem paid (created/pending/cancelled/failed/refunded) rendelések kimaradnak.
 */
export function purchaseDatesFromOrders(orders: Order[]): Map<number, string> {
  const latest = new Map<number, { iso: string; ms: number }>()
  for (const order of orders) {
    if (order.status !== 'paid') {
      continue
    }
    const createdAt = typeof order.createdAt === 'string' ? order.createdAt : null
    const createdAtMs = createdAt === null ? Number.NaN : new Date(createdAt).getTime()
    if (createdAt === null || Number.isNaN(createdAtMs)) {
      continue
    }
    for (const item of order.items ?? []) {
      const product = item.product
      if (product === null || product === undefined) {
        continue
      }
      const productId = typeof product === 'object' ? product.id : product
      const previous = latest.get(productId)
      if (previous === undefined || createdAtMs > previous.ms) {
        latest.set(productId, { iso: createdAt, ms: createdAtMs })
      }
    }
  }
  return new Map([...latest].map(([productId, value]) => [productId, value.iso]))
}

export interface PurchaseHistoryInput {
  payload: Payload
  /** A vevő azonosítója — a lekérdezés kizárólag az ő rendeléseit olvassa. */
  userId: number
  logger?: Logger
}

/**
 * A vevő paid rendeléseiből épített vásárlásidőpont-térkép.
 *
 * Lekérdezési hiba esetén ÜRES térképpel tér vissza (a hívó így „ismeretlen
 * vásárlási időpontot" lát, ami a szabály szerint korlátlan hozzáférés) — egy
 * adatbázis-akadás nem zárhatja ki a fizető vevőt a saját kurzusából. A hiba
 * strukturált naplóba kerül.
 */
export async function fetchPurchaseDates(input: PurchaseHistoryInput): Promise<Map<number, string>> {
  const log = input.logger ?? rootLogger
  try {
    const result = await input.payload.find({
      collection: 'orders',
      where: {
        and: [{ customer: { equals: input.userId } }, { status: { equals: 'paid' } }],
      },
      sort: '-createdAt',
      depth: 0,
      limit: PURCHASE_HISTORY_QUERY_LIMIT,
      overrideAccess: true,
    })
    return purchaseDatesFromOrders(result.docs as Order[])
  } catch (error) {
    log.warn('kurzus-hozzáférés: a vásárlási időpontok lekérdezése sikertelen', {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return new Map()
  }
}

/** A hozzáférés-számításhoz elegendő termék-alak (id + korlát). */
export type CourseAccessProduct = Pick<Product, 'id' | 'accessDurationDays'>

/** Van-e a listában olyan termék, amelyen egyáltalán értelmezett a lejárat. */
function hasAnyDurationLimit(products: CourseAccessProduct[]): boolean {
  return products.some(
    (product) =>
      typeof product.accessDurationDays === 'number' &&
      Number.isFinite(product.accessDurationDays) &&
      product.accessDurationDays > 0,
  )
}

export interface CourseAccessForUserInput {
  payload: Payload
  userId: number
  products: CourseAccessProduct[]
  /** „Most" — determinisztikus teszteléshez injektálható. */
  now?: Date
  logger?: Logger
}

/**
 * productId → hozzáférés-állapot az adott vevőre.
 *
 * Ha egyik terméken sincs érvényes `accessDurationDays`, a rendelés-lekérdezés
 * EL SEM INDUL (a mai, korlátlan viselkedés extra DB-kör nélkül marad).
 */
export async function resolveCourseAccessForUser(
  input: CourseAccessForUserInput,
): Promise<Map<number, CourseAccessState>> {
  const states = new Map<number, CourseAccessState>()
  if (input.products.length === 0) {
    return states
  }

  const purchaseDates = hasAnyDurationLimit(input.products)
    ? await fetchPurchaseDates({
        payload: input.payload,
        userId: input.userId,
        logger: input.logger,
      })
    : new Map<number, string>()

  for (const product of input.products) {
    states.set(
      product.id,
      resolveCourseAccess({
        purchasedAt: purchaseDates.get(product.id) ?? null,
        accessDurationDays: product.accessDurationDays ?? null,
        now: input.now,
      }),
    )
  }
  return states
}

export interface SingleCourseAccessInput {
  payload: Payload
  userId: number
  product: CourseAccessProduct
  now?: Date
  logger?: Logger
}

/** Egy termék hozzáférés-állapota (a lejátszó-oldal és a stream-token ága). */
export async function resolveSingleCourseAccess(
  input: SingleCourseAccessInput,
): Promise<CourseAccessState> {
  const states = await resolveCourseAccessForUser({
    payload: input.payload,
    userId: input.userId,
    products: [input.product],
    now: input.now,
    logger: input.logger,
  })
  return states.get(input.product.id) ?? { hasAccess: true, expiresAt: null, reason: 'unlimited' }
}
