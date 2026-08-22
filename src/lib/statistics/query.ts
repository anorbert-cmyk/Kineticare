/**
 * Statisztika-lekérdezés — a Payload local API-ról a tiszta aggregátor bemenete.
 *
 * ═══ SZABÁLYOK ═══
 * - Csak a szerepkör-kapu UTÁN hívható (`overrideAccess: true` különben
 *   adatszivárgás). A nézet a `canAccessStatistics` után hívja.
 * - A `refunds` mezőt NEM kérjük le és NEM olvassuk (owner-only, CLAUDE.md 4.).
 * - `depth: 1` kell az `items[].product.audience`-hez. Ha a product csak
 *   azonosító (szám vagy `{ id }` audience nélkül), a
 *   `hydrateProductFields` külön `products.find`-del pótolja (az ágat és a
 *   bevétel-tábla sorfejlécéhez kellő marketingcímet is). Explicit
 *   `audience: null` marad null → laikus.
 * - Lapozás felső korláttal: a `limit: 0` korlátlan memóriát jelentene. A
 *   kurzus-haladás panel mintájára explicit lapméret + max, és a csonkolást
 *   a nézet kimondja. EZ CSAK A FIZETETT rendelésekre vonatkozik: ott a
 *   tényleges sorokra (tételek, összegek, dátumok) szükség van.
 * - A TÖLCSÉR nem olvas sort: hét `payload.count` adja (hat státusz + a
 *   szűrés nélküli összes). Következmény a `RevenueReport` szerződésére: a
 *   `truncated` jelző ezután KIZÁRÓLAG a fizetett rendelések lapozásától
 *   függ — a tölcsér számai sosem csonkák, plafon sincs rajtuk (F8,
 *   2026-08-21-i vizsgálat).
 */

import type { Payload } from 'payload'

import {
  buildOrderFunnelFromCounts,
  buildRevenueReport,
  FUNNEL_STATUSES,
  type OrderFunnelCounts,
  type RevenueOrderInput,
  type RevenueOrderItemInput,
  type RevenueReport,
} from './revenue'

/** Egy lapon beolvasott rendelés. */
export const STATISTICS_ORDER_PAGE_SIZE = 200
/** Legfeljebb ennyi fizetett rendelést aggregálunk egy nézet-betöltéskor. */
export const STATISTICS_ORDER_MAX = 10_000

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

const ORDER_SELECT = {
  status: true,
  createdAt: true,
  invoiceCompletionDate: true,
  totalHufSnapshot: true,
  items: true,
} as const

/**
 * Determinisztikus rendezés a LAPOZOTT rendelés-lekérdezésekhez (F2).
 *
 * ═══ MIÉRT KELL (2026-08-21-i vizsgálat) ═══
 * `sort` nélkül a Drizzle-adapter alapértelmezése `-createdAt`, TIEBREAKER
 * NÉLKÜL. Azonos időbélyegű rendeléseknél (tömeges import, egy másodpercen
 * belüli vásárlások) a lapok határán az adatbázis szabadon cserélheti a sorok
 * sorrendjét: ugyanaz a rendelés KÉTSZER jöhet be, vagy KIESHET — a riport
 * bevétele így a valóság fölé vagy alá csúszik, némán.
 *
 * ═══ MIÉRT `['-createdAt', 'id']` ÉS NEM `'id'` ═══
 * Az `id` önmagában is egyedi (elsődleges kulcs), tehát a lapozást stabilizálná
 * — DE növekvő sorrendben a felső korlát (STATISTICS_ORDER_MAX) a LEGRÉGEBBI
 * rendeléseket tartaná meg, és éppen a friss hónapokat vágná le a 12 havi
 * riportból. A `-createdAt` a friss sorokat hozza előre, az `id` pedig egyedi
 * tiebreakerként zárja a rendezést — csonkolás esetén a jelentés ablaka
 * marad ép, és a lapozás determinisztikus.
 *
 * A `createdAt` és az `id` nem korlátozott olvasású mező; a hívások amúgy is
 * `overrideAccess: true`-val mennek (Local API), ahol a Payload 3.88
 * `validateSortQuery` mezőszintű access-ellenőrzése nem fut.
 */
const PAGED_ORDER_SORT: string[] = ['-createdAt', 'id']

/**
 * Csonkolt-e a beolvasás, amikor a felső korlátig eljutottunk.
 *
 * ═══ MIÉRT KELL EZ A SORREND (mérve, 2026-08-21) ═══
 * A korábbi szabály a `hasNextPage` hiányában a `pageDocs.length === pageSize`
 * tartalék-ágra esett vissza — az viszont a PONTOSAN a korláttal egyező,
 * TELJES halmazt is csonkoltnak jelölte: ha az utolsó lap történetesen tele
 * volt, a felület „a valóságnál kisebb számok" figyelmeztetést írt ki hiánytalan
 * adatra. A hamis riasztás ugyanolyan kár, mint az elhallgatott csonkolás: a
 * munkatárs a jó számban sem bízik meg többé.
 *
 * A sorrend ezért:
 *  1. `totalDocs` — a Payload a TALÁLATOK teljes számát adja, tehát ebből
 *     egyértelműen eldől a kérdés: több van-e, mint amennyit beolvashattunk.
 *  2. `hasNextPage` — szintén a szervertől jön, csak közvetve válaszol.
 *  3. TARTALÉK: „az utolsó lap tele volt". EZ CSAK BECSLÉS, és szándékosan a
 *     hamis pozitív irányába téved (inkább jelezzen csonkolást, mint hogy
 *     elhallgassa) — de csak akkor fut, ha a szerver EGYIK számot sem adta meg,
 *     ami valós Payload-válasznál nem fordul elő, mockolt tesztben viszont igen.
 */
export function isReadTruncated(input: {
  /** A Payload `totalDocs` mezője az utolsó lapról (ha adta). */
  totalDocs: number | null | undefined
  /** A Payload `hasNextPage` mezője az utolsó lapról (ha adta). */
  hasNextPage: boolean | null | undefined
  /** A felső korlát. */
  maxDocs: number
  /** Ennyi sort olvastunk be a levágás ELŐTT. */
  loaded: number
  /** Az utolsó lap sorainak száma és a kért lapméret. */
  pageDocsLength: number
  pageSize: number
}): boolean {
  const { totalDocs, hasNextPage, maxDocs, loaded, pageDocsLength, pageSize } = input
  if (typeof totalDocs === 'number' && Number.isFinite(totalDocs) && totalDocs >= 0) {
    return totalDocs > maxDocs
  }
  if (typeof hasNextPage === 'boolean') {
    return hasNextPage || loaded > maxDocs
  }
  return pageDocsLength === pageSize || loaded > maxDocs
}

/**
 * Lapozott beolvasás felső korláttal. A pontosan a korláttal egyező, teljes
 * halmaz NEM csonkolt — ugyanaz a szabály, mint a kurzus-haladás panelen
 * (a döntést a KÖZÖS `isReadTruncated` hozza, hogy a két olvasó ne csúszhasson
 * szét).
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
      return {
        docs: docs.slice(0, maxDocs),
        truncated: isReadTruncated({
          totalDocs: result.totalDocs,
          hasNextPage: result.hasNextPage,
          maxDocs,
          loaded: docs.length,
          pageDocsLength: pageDocs.length,
          pageSize,
        }),
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

/**
 * A termék MAI marketingcíme a populált relationshipből.
 *
 * A bevétel-tábla sorfejléce ez, nem a sku-snapshot (H7, 2026-08-21-i audit):
 * ugyanaz a kurzus nem futhat két néven egy lapon (WCAG 2.2 SC 3.2.4). Ha a
 * termék nincs populálva vagy időközben törölték, `null` jön vissza, és az
 * aggregátor a sku-ra esik vissza.
 */
function displayTitleFromProduct(product: unknown): string | null {
  if (typeof product !== 'object' || product === null) {
    return null
  }
  const value = (product as { displayTitle?: unknown }).displayTitle
  return typeof value === 'string' ? value : null
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Tétel-mennyiség a bevétel-számításhoz. Hiányzó / értelmezhetetlen /
 * nem pozitív érték = **1 db** (F3).
 *
 * ═══ MIÉRT 1 ÉS NEM 0 ═══
 * A 0-s alapértelmezés miatt egy `quantity` nélküli tétel 0 Ft bevételt adott,
 * miközben a vevő fizetett. Az 1-es default nem választás kérdése: pontosan
 * ezzel a szabállyal készült maga a beszedett összeg is.
 *  - `src/lib/order-integrity.ts` (a `totalHufSnapshot` forrása):
 *    `typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1`
 *  - `src/lib/checkout/start-checkout.ts` (a Barionnak küldött tételsor):
 *    `(item.quantity ?? 1)`
 * Az explicit 0 és a negatív érték ezért szintén 1: a rendelés végösszege
 * ezekben az esetekben is 1 db-bal képződött (a hook nem számol újra
 * update-kor), tehát a 0 kevesebbet, a negatív pedig levonást mutatna a
 * ténylegesen beszedett bevételből. A pénztár input-validációja amúgy is
 * 1..99 egészre szűkít, tehát a nem pozitív érték csak kézi adatszerkesztésből
 * vagy importból kerülhet a sorba.
 */
function quantityOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1
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
        displayTitle: displayTitleFromProduct(item.product),
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
 * Pótolni kell a termék mezőit, ha a product csak azonosító, vagy `{ id }` van
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

/**
 * A hiányzó termék-mezők (ág és marketingcím) pótlása EGYETLEN, batchelt
 * lekérdezéssel. A cím ugyanabban a körben jön, mint az ág: külön hívás
 * ugyanazokra a sorokra fölösleges kör lenne.
 */
async function hydrateProductFields(
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
    select: { id: true, audience: true, displayTitle: true },
    overrideAccess: true,
  })) as FindResultLike<{ id?: unknown; audience?: unknown; displayTitle?: unknown }>

  const audienceById = new Map<number, unknown>()
  const titleById = new Map<number, unknown>()
  for (const product of products.docs ?? []) {
    if (typeof product.id === 'number') {
      audienceById.set(product.id, product.audience)
      titleById.set(product.id, product.displayTitle)
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
            product: { id, audience: audienceById.get(id), displayTitle: titleById.get(id) },
          }
        })
      : doc.items,
  }))
}

export interface QueryRevenueReportDeps {
  /**
   * `find` a fizetett rendelések lapozott beolvasásához és a product-audience
   * pótlásához; `count` a tölcsérhez (F8 — a hat szám nem 20 000 sorból jön).
   */
  payload: Pick<Payload, 'count' | 'find'>
  now?: Date
  months?: number
}

/**
 * A rendelés-tölcsér hat száma + a teljes darabszám — SOR-BEOLVASÁS NÉLKÜL
 * (F8, 2026-08-21-i vizsgálat).
 *
 * ═══ MI VOLT ═══
 * A tölcsér 500-asával olvasta be az ÖSSZES rendelést a 20 000-es plafonig:
 * 40 lekérdezés és 20 000 dokumentum a memóriában — hat szám kedvéért. A
 * plafon fölött ráadásul csonkolt is: 25 000 rendelésnél a tölcsér a valóság
 * 80%-át mutatta, és a jelentés „csonka" feliratot kapott, holott a
 * bevétel-rész hiánytalan volt.
 *
 * ═══ MI VAN ═══
 * Hét `payload.count`: hat nevesített státuszra egy-egy, plusz a szűrés
 * nélküli összes (ebből lesz az `other`, lásd `buildOrderFunnelFromCounts`).
 * A Postgres COUNT-ot futtat, sor nem jön át a dróton, és nincs felső korlát —
 * a szám egymillió rendelésnél is pontos.
 *
 * ═══ MIÉRT PÁRHUZAMOSAN ═══
 * Hét rövid, csak-olvasó lekérdezés; egyszerre legfeljebb ennyi kapcsolatot
 * kér, tehát a `pg` pool alapértelmezett 10-es kerete alatt marad (a nézet a
 * bevétel- és a kurzus-hatás lekérdezést egymás UTÁN futtatja, lásd
 * `StatisticsView`). Sorosan is működne, csak lassabban.
 *
 * `overrideAccess: true` — ugyanaz a szerződés, mint a `find`-eknél: a
 * szerepkör-kaput a hívó adja (lásd a modul fejkommentjét).
 */
async function countOrderFunnel(payload: Pick<Payload, 'count'>): Promise<OrderFunnelCounts> {
  const [totalResult, statusResults] = await Promise.all([
    payload.count({ collection: 'orders', overrideAccess: true }),
    Promise.all(
      FUNNEL_STATUSES.map((status) =>
        payload.count({
          collection: 'orders',
          where: { status: { equals: status } },
          overrideAccess: true,
        }),
      ),
    ),
  ])

  const countByStatus = new Map<string, number>()
  FUNNEL_STATUSES.forEach((status, index) => {
    countByStatus.set(status, statusResults[index]?.totalDocs ?? 0)
  })
  return buildOrderFunnelFromCounts(countByStatus, totalResult.totalDocs)
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
        sort: PAGED_ORDER_SORT,
        select: ORDER_SELECT,
        overrideAccess: true,
      }) as Promise<FindResultLike<StatisticsOrderDoc>>,
    STATISTICS_ORDER_PAGE_SIZE,
    STATISTICS_ORDER_MAX,
  )

  const funnel = await countOrderFunnel(deps.payload)

  const hydrated = await hydrateProductFields(deps.payload, paidPage.docs)
  const orders = hydrated.map(mapOrderDocToRevenueInput)
  return buildRevenueReport(orders, funnel, {
    now: deps.now,
    months: deps.months,
    // Csak a fizetett rendelések lapozása csonkolhat: a tölcsér `count`-ból
    // jön, azon nincs plafon.
    truncated: paidPage.truncated,
  })
}
