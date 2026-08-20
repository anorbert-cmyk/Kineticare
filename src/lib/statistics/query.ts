/**
 * Statisztika-lekérdezés — a Payload local API-ról a tiszta aggregátor bemenete.
 *
 * ═══ SZABÁLYOK ═══
 * - Csak a szerepkör-kapu UTÁN hívható (`overrideAccess: true` különben
 *   adatszivárgás). A nézet a `canAccessStatistics` után hívja.
 * - A `refunds` mezőt NEM kérjük le és NEM olvassuk (owner-only, CLAUDE.md 4.).
 * - `depth: 1` kell az `items[].product.audience`-hez. Ha a product csak
 *   azonosító (szám vagy `{ id }` audience nélkül), a
 *   `hydrateProductAudience` külön `products.find`-del pótolja. Explicit
 *   `audience: null` marad null → laikus.
 * - Lapozás felső korláttal: a `limit: 0` korlátlan memóriát jelentene. A
 *   kurzus-haladás panel mintájára explicit lapméret + max, és a csonkolást
 *   a nézet kimondja.
 */

import type { Payload } from 'payload'

import {
  buildRevenueReport,
  type RevenueOrderInput,
  type RevenueOrderItemInput,
  type RevenueReport,
} from './revenue'

/** Egy lapon beolvasott rendelés. */
export const STATISTICS_ORDER_PAGE_SIZE = 200
/** Legfeljebb ennyi fizetett rendelést aggregálunk egy nézet-betöltéskor. */
export const STATISTICS_ORDER_MAX = 10_000
/** A tölcsér (minden státusz) lapmérete. */
export const STATISTICS_FUNNEL_PAGE_SIZE = 500
export const STATISTICS_FUNNEL_MAX = 20_000

interface FindResultLike<T> {
  docs?: T[] | null
  totalDocs?: number | null
  hasNextPage?: boolean | null
}

interface PagedResult<T> {
  docs: T[]
  truncated: boolean
}

/**
 * A rendelés-dokumentum azon szelete, amit a lekérdezés KIKÉR. Nincs benne
 * `refunds`, `customerSnapshot`, `ipAddress`, `customerEmail`.
 */
export interface StatisticsOrderDoc {
  status?: string | null
  createdAt?: string | null
  invoiceCompletionDate?: string | null
  totalHufSnapshot?: number | null
  items?: readonly StatisticsOrderItemDoc[] | null
}

export interface StatisticsOrderItemDoc {
  product?: unknown
  quantity?: number | null
  titleSnapshot?: string | null
  priceHufSnapshot?: number | null
}

export interface StatisticsStatusDoc {
  status?: string | null
}

const ORDER_SELECT = {
  status: true,
  createdAt: true,
  invoiceCompletionDate: true,
  totalHufSnapshot: true,
  items: true,
} as const

const STATUS_SELECT = {
  status: true,
} as const

/**
 * Lapozott beolvasás felső korláttal. A pontosan a korláttal egyező, teljes
 * halmaz NEM csonkolt — ugyanaz a szabály, mint a kurzus-haladás panelen.
 */
export async function readStatisticsPages<T>(
  fetchPage: (page: number, limit: number) => Promise<FindResultLike<T>>,
  pageSize: number,
  maxDocs: number,
): Promise<PagedResult<T>> {
  const docs: T[] = []
  let page = 1

  for (;;) {
    const result = await fetchPage(page, pageSize)
    const pageDocs = Array.isArray(result.docs) ? result.docs : []
    docs.push(...pageDocs)
    if (docs.length >= maxDocs) {
      const hasMorePages =
        typeof result.hasNextPage === 'boolean' ? result.hasNextPage : pageDocs.length === pageSize
      return {
        docs: docs.slice(0, maxDocs),
        truncated: hasMorePages || docs.length > maxDocs,
      }
    }
    if (pageDocs.length < pageSize || result.hasNextPage === false) {
      return { docs, truncated: false }
    }
    page += 1
  }
}

function audienceFromProduct(product: unknown): unknown {
  if (typeof product !== 'object' || product === null) {
    return undefined
  }
  return (product as { audience?: unknown }).audience
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function quantityOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** A Payload-dokumentum leképezése az aggregátor bemenetére — tiszta, tesztelhető. */
export function mapOrderDocToRevenueInput(doc: StatisticsOrderDoc): RevenueOrderInput {
  const items: RevenueOrderItemInput[] = []
  if (Array.isArray(doc.items)) {
    for (const item of doc.items) {
      items.push({
        audience: audienceFromProduct(item.product),
        priceHuf: finiteOrZero(item.priceHufSnapshot),
        quantity: quantityOf(item.quantity),
        titleSnapshot: typeof item.titleSnapshot === 'string' ? item.titleSnapshot : null,
      })
    }
  }
  return {
    status: typeof doc.status === 'string' ? doc.status : '',
    createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : '',
    invoiceCompletionDate:
      typeof doc.invoiceCompletionDate === 'string' ? doc.invoiceCompletionDate : null,
    totalHuf: typeof doc.totalHufSnapshot === 'number' ? doc.totalHufSnapshot : null,
    items,
  }
}

export function mapStatusDocs(docs: readonly StatisticsStatusDoc[]): string[] {
  return docs.map((doc) => (typeof doc.status === 'string' ? doc.status : ''))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function productIdOf(product: unknown): number | null {
  if (typeof product === 'number' && Number.isFinite(product)) {
    return product
  }
  if (isRecord(product) && typeof product.id === 'number' && Number.isFinite(product.id)) {
    return product.id
  }
  return null
}

/**
 * Audience-t kell pótolni, ha a product csak azonosító, vagy `{ id }` van
 * audience kulcs nélkül. Explicit `audience: null` NEM hiányzó: az a laikus
 * fallback a `normalizeAudience`-ben.
 */
function productNeedsAudienceHydration(product: unknown): boolean {
  if (typeof product === 'number' && Number.isFinite(product)) {
    return true
  }
  if (!isRecord(product)) {
    return false
  }
  if (typeof product.id !== 'number' || !Number.isFinite(product.id)) {
    return false
  }
  return !('audience' in product)
}

async function hydrateProductAudience(
  payload: Pick<Payload, 'find'>,
  docs: StatisticsOrderDoc[],
): Promise<StatisticsOrderDoc[]> {
  const missingIds = new Set<number>()
  for (const doc of docs) {
    for (const item of doc.items ?? []) {
      if (productNeedsAudienceHydration(item.product)) {
        const id = productIdOf(item.product)
        if (id !== null) {
          missingIds.add(id)
        }
      }
    }
  }
  if (missingIds.size === 0) {
    return docs
  }

  const products = (await payload.find({
    collection: 'products',
    where: { id: { in: [...missingIds] } },
    depth: 0,
    pagination: false,
    limit: missingIds.size,
    select: { id: true, audience: true },
    overrideAccess: true,
  })) as FindResultLike<{ id?: unknown; audience?: unknown }>

  const audienceById = new Map<number, unknown>()
  for (const product of products.docs ?? []) {
    if (typeof product.id === 'number') {
      audienceById.set(product.id, product.audience)
    }
  }

  return docs.map((doc) => ({
    ...doc,
    items: Array.isArray(doc.items)
      ? doc.items.map((item) => {
          if (!productNeedsAudienceHydration(item.product)) {
            return item
          }
          const id = productIdOf(item.product)
          if (id === null) {
            return item
          }
          return {
            ...item,
            product: { id, audience: audienceById.get(id) },
          }
        })
      : doc.items,
  }))
}

export interface QueryRevenueReportDeps {
  payload: Pick<Payload, 'find'>
  now?: Date
  months?: number
}

/**
 * Fizetett rendelések + státusz-tölcsér beolvasása, majd aggregálás.
 *
 * `overrideAccess: true` — a hívó felelőssége, hogy ezt CSAK a szerepkör-kapu
 * után hívja. A függvény magában nem ellenőriz szerepkört, hogy a unit-teszt
 * Payload-mockkal, auth nélkül futhasson.
 */
export async function queryRevenueReport(deps: QueryRevenueReportDeps): Promise<RevenueReport> {
  const paidPage = await readStatisticsPages<StatisticsOrderDoc>(
    (page, limit) =>
      deps.payload.find({
        collection: 'orders',
        where: { status: { equals: 'paid' } },
        depth: 1,
        page,
        limit,
        select: ORDER_SELECT,
        overrideAccess: true,
      }) as Promise<FindResultLike<StatisticsOrderDoc>>,
    STATISTICS_ORDER_PAGE_SIZE,
    STATISTICS_ORDER_MAX,
  )

  const funnelPage = await readStatisticsPages<StatisticsStatusDoc>(
    (page, limit) =>
      deps.payload.find({
        collection: 'orders',
        depth: 0,
        page,
        limit,
        select: STATUS_SELECT,
        overrideAccess: true,
      }) as Promise<FindResultLike<StatisticsStatusDoc>>,
    STATISTICS_FUNNEL_PAGE_SIZE,
    STATISTICS_FUNNEL_MAX,
  )

  const hydrated = await hydrateProductAudience(deps.payload, paidPage.docs)
  const orders = hydrated.map(mapOrderDocToRevenueInput)
  const statuses = mapStatusDocs(funnelPage.docs)
  return buildRevenueReport(orders, statuses, {
    now: deps.now,
    months: deps.months,
    truncated: paidPage.truncated || funnelPage.truncated,
  })
}
