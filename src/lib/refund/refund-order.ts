import type { Payload } from 'payload'

import type { Order, User } from '../../payload-types'
import { withAdvisoryLock } from '../advisory-lock'
import { updateUserPurchases } from '../user-purchases'
import { auditLogStore, writeAuditLog } from '../audit'
import { BarionApiError, fetchPaymentState, refundPayment } from '../barion'
import { logger, type Logger } from '../logger'
import {
  isRetryableCorrectiveError,
  isRetryableStornoError,
  issueCorrectiveInvoiceForOrder,
  issueStornoForOrder,
  queueCorrectiveInvoiceJob,
  queueStornoIssueJob,
  type IssueCorrectiveInvoiceDeps,
  type IssueStornoForOrderDeps,
} from '../szamlazz'

/**
 * Owner-only rendelés-visszatérítés (refund) szolgáltatás.
 *
 * A POST /api/admin/orders/[orderNumber]/refund végpont üzleti logikája,
 * transportfüggetlenül (a Payload-példány injektálva, mockolt fetch-csel
 * egységtesztelhető — barion.test.ts / checkout-start.test.ts minta).
 *
 * PÁRHUZAMOSSÁG (refund-zár). A folyamat „ellenőrzöm, majd írok" (check-then-act)
 * alakú: a maradvány-számítás a refunds-nyomból jön, a Barion-refund pénzt mozgat,
 * és csak UTÁNA íródik a nyom. Zár nélkül két párhuzamos owner-kérés (a #50 admin
 * RefundPanel óta valós út: dupla katt, két fül, két admin) MINDKETTŐ ellenőrzése
 * átmegy a régi állapoton — az eredmény DUPLA Barion-refund és ELVESZETT
 * refund-bejegyzés (a második írás a stale tömböt írja felül). Ezért a pénzt
 * mozgató szakasz Postgres advisory-zár alatt fut (`refund:order:<orderId>`,
 * src/lib/advisory-lock.ts), a záron belül ÚJRA olvasott rendeléssel — minden
 * döntés a friss példányból születik.
 *
 * ZÁR-TARTOMÁNY (tudatos döntés, CLAUDE.md 6–7. üzemeltetési tanulság).
 * A zár egy tétlen („idle in transaction") tranzakciót tart nyitva, amire a pool
 * `idle_in_transaction_session_timeout`-ja (60 000 ms, src/payload.config.ts)
 * vonatkozik. Ezért a záron BELÜL csak a feltétlenül szükséges szakasz fut:
 *  - a GetState (TransactionId-feloldás) a záron KÍVÜL történik: tiszta olvasás,
 *    nincs mellékhatása, tehát nem kell sorosítani — így a lassabbik HTTP-hívás
 *    nem terheli a zárat;
 *  - a záron belül egyetlen külső hívás van, a Payment/Refund, amit a Barion-
 *    kliens `AbortSignal.timeout`-ja keményen korlátoz (BARION_TIMEOUT_MS,
 *    alapértelmezés 15 000 ms — bőven a 60 mp-es tétlen-tranzakció-korlát alatt,
 *    a néhány DB-körrel együtt is);
 *  - a Számlázz.hu-bizonylat és az audit-írás a záron KÍVÜL fut (lassú, külső,
 *    és best-effort — a zárban semmi keresnivalója).
 * A zárra várakozást a `statement_timeout` (30 000 ms) korlátozza, tehát a
 * torlódás sem végtelen: időtúllépéssel, látható hibával zárul.
 *
 * MARADÉK KOCKÁZAT (dokumentálva). A védett szakasz írásai NEM a zár
 * tranzakciójában futnak (a zár külön kapcsolatot tart, lásd advisory-lock.ts),
 * ezért ha maga a zár-tranzakció bukik el MIUTÁN a refunds-nyom már beíródott, a
 * hívó hibát kap, miközben az adat helyesen rögzült. Ez a BIZTONSÁGOS irány: a
 * nyom pontos, tehát egy újrapróbálás már a maradékkal számol — dupla
 * visszatérítés így sem keletkezhet, legfeljebb egy fölösleges hibaüzenet.
 * Ha a BARION_TIMEOUT_MS-t valaha 55 000 ms fölé emelnénk, ezt a zár-tartományt
 * újra kell gondolni (akkor a Refund-hívás egymaga kimerítheti a tétlen-korlátot).
 *
 * Folyamat:
 *  1. rendelés-keresés orderNumber alapján (ismeretlen → 404),
 *  2. állapotgép-validáció: KIZÁRÓLAG paid státuszú rendelés téríthető;
 *     már refunded rendelésnél (dupla refund) → 409,
 *  3. összeg-validáció: a kérésben megadott részösszeg 0 < x ≤ (fizetett
 *     végösszeg − már visszatérített) kell legyen; megadás nélkül a maradék
 *     teljes összeg térül vissza,
 *  4. TransactionId-feloldás (REPÓ-TÉNY alapú döntés): az orders entitáson a
 *     T-021/T-022 folyamat NEM tárol Barion TransactionId-t — csak
 *     barionPaymentId-t és barionPaymentRequestId-t (lásd
 *     src/lib/checkout/start-checkout.ts és az ordersCollectionOverride
 *     mezőlistája). Ezért az első refund előtt a v4-es fetchPaymentState-tel
 *     újra lekérdezzük a fizetésállapotot, és a Transactions tömbből vesszük
 *     a tranzakció-szintű TransactionId-t. A refund-nyomba (orders.refunds)
 *     mentett transactionId-t az esetleges későbbi részrefundok már
 *     újrahasználják — a tárolt érték elsőbbséget élvez, nem kell újra
 *     GetState-et hívni.
 *  5. refundPayment (Payment/Refund v2) a teljes vagy a kért részösszeggel,
 *  6. a RefundedTransactions tranzakció-státuszának KIÉRTÉKELÉSE (M-11) és
 *     mentése a rendelésre (refunds-nyom bejegyzésében): `RefundFailed` esetén
 *     HIBAÁG (magyar üzenet, semmilyen írás, semmilyen bizonylat), ismeretlen
 *     státusznál dokumentált, konzervatív kezelés,
 *  7. teljes refund → a rendelés státusza `refunded` + refundedAt; részrefund
 *     esetén a státusz paid MARAD, és csak refund-nyom keletkezik,
 *  8. purchases-levétel IDEMPOTENSEN, kizárólag teljes refundnál; részrefundnál
 *     a vevő hozzáférése megmarad,
 *  9. audit-logs bejegyzés (a collection létezik, best-effort writeAuditLog).
 * 10. számlázási bizonylat a visszatérítéshez (best-effort, a refund
 *     eredményét nem befolyásolja): ELSŐ, teljes összegű refundnál STORNÓ
 *     (C4); RÉSZLEGES refundnál és a részrefundok utáni, maradékot LEZÁRÓ
 *     refundnál HELYESBÍTŐ (módosító) számla az eredeti számlára hivatkozva
 *     (C5) — a korábbi részrefundokhoz már helyesbítő készült, a teljes
 *     stornó a részösszeget másodszor is jóváírná. Újrapróbálható
 *     Számlázz.hu-hibánál a megfelelő job kerül sorba. Bizonylat KIZÁRÓLAG
 *     igazoltan megtörtént visszatérítéshez készül (M-11): ismeretlen
 *     tranzakció-státusznál kimarad, riasztással.
 *
 * Hibaág-szabály: BarionApiError (kind szerint naplózva requestId-vel) esetén
 * a rendelés NEM változik — a DB-írás kizárólag a sikeres Barion-refund UTÁN
 * történik; a hiba magyar üzenettel propagálódik a route-handler felé.
 */

/** Üzleti hiba HTTP-státusszal — a route-handler ezt képezi válaszra. */
export class RefundError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RefundError'
    this.status = status
  }
}

/** Egy refund-bejegyzés a rendelés refunds-nyomában (orders.refunds json). */
export interface OrderRefundEntry {
  /** A Barion TransactionId, amelyen a visszatérítés történt (későbbi részrefundok ezt újrahasználják). */
  transactionId: string
  /** A visszatérített összeg HUF-ban. */
  amountHuf: number
  /** A Barion RefundedTransactions tranzakció-státusza (pl. Refunded / PartiallyRefunded). */
  status: string
  refundedAt: string
  type: 'full' | 'partial'
  reason?: string | null
}

export interface RefundOrderInput {
  /** Opcionális részösszeg HUF-ban; hiányában a maradék teljes összeg térül vissza. */
  amountHuf?: unknown
  /** Opcionális, szöveges refund-indok (teljes refundnál a refundReason-be is bekerül). */
  reason?: unknown
}

export interface RefundOrderOptions {
  payload: Payload
  orderNumber: string
  input: RefundOrderInput
  /** A műveletet végző owner (audit actor). */
  actor: User
  headers?: Headers
  ipAddress?: string
  logger?: Logger
  /**
   * Injektálható stornó-hívó (teszteléshez); alapból a valódi
   * issueStornoForOrder. A stornó best-effort: a kimenetele a refund
   * eredményét SOHA nem befolyásolja.
   */
  issueStorno?: (
    order: Order,
    deps: IssueStornoForOrderDeps,
  ) => ReturnType<typeof issueStornoForOrder>
  /**
   * Injektálható helyesbítő-hívó (teszteléshez); alapból a valódi
   * issueCorrectiveInvoiceForOrder. Szintén best-effort.
   */
  issueCorrective?: (
    order: Order,
    deps: IssueCorrectiveInvoiceDeps,
  ) => ReturnType<typeof issueCorrectiveInvoiceForOrder>
}

export interface RefundOrderResult {
  orderNumber: string
  type: 'full' | 'partial'
  amountHuf: number
  transactionId: string
  refundedTransactionStatus: string
  alreadyRefundedHuf: number
  totalRefundedHuf: number
  orderStatus: 'refunded' | 'paid'
  /**
   * A Barion tranzakció-státuszának besorolása (M-11). `'succeeded'`: a
   * visszatérítés igazoltan megtörtént, a bizonylat automatikusan elindult.
   * `'unknown'`: a Barion nem adott értelmezhető tranzakció-státuszt — a
   * refund-nyom rögzült (a maradvány így nem téríthető vissza másodszor), de
   * bizonylat NEM készült, emberi ellenőrzés szükséges. A `'failed'` eset nem
   * jelenik meg itt: az hibaágon (RefundError) végződik.
   */
  refundStatusOutcome: 'succeeded' | 'unknown'
}

/** A rendelés refund-műveletének advisory-zár kulcsa (egy rendelés = egy zár). */
export function refundLockKey(orderId: number | string): string {
  return `refund:order:${orderId}`
}

/**
 * A Barion tranzakciószintű refund-státuszának besorolása (M-11).
 *
 * A Payment/Refund v2 válasza HTTP 200 és üres Errors mellett is jelezhet
 * TRANZAKCIÓ-SZINTŰ kudarcot a RefundedTransactions[].Status mezőben — ez
 * korábban csak eltárolódott, és a folyamat sikerként ment tovább (nyilvántartás
 * + stornó/helyesbítő számla indult egy meg nem történt visszatérítésre).
 */
export type RefundedTransactionOutcome = 'succeeded' | 'failed' | 'unknown'

/** Igazoltan megtörtént visszatérítést jelentő tranzakció-státuszok. */
const SUCCESSFUL_REFUND_STATUSES: ReadonlySet<string> = new Set([
  'Succeeded',
  'Refunded',
  'PartiallyRefunded',
])

/** Explicit, tranzakciószintű kudarc. */
const FAILED_REFUND_STATUS = 'RefundFailed'

export function classifyRefundedTransactionStatus(
  status: string | null | undefined,
): RefundedTransactionOutcome {
  if (typeof status !== 'string' || status.trim().length === 0) {
    return 'unknown'
  }
  if (status === FAILED_REFUND_STATUS) {
    return 'failed'
  }
  return SUCCESSFUL_REFUND_STATUSES.has(status) ? 'succeeded' : 'unknown'
}

/** A rendelés refunds-nyomának kiolvasása (típustalan json mező → validált bejegyzések). */
export function readRefundEntries(order: Order): OrderRefundEntry[] {
  const raw = (order as { refunds?: unknown }).refunds
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (entry): entry is OrderRefundEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as { transactionId?: unknown }).transactionId === 'string' &&
      typeof (entry as { amountHuf?: unknown }).amountHuf === 'number',
  )
}

/** A már visszatérített összeg a refunds-nyomból. */
export function alreadyRefundedHuf(order: Order): number {
  return readRefundEntries(order).reduce((sum, entry) => sum + entry.amountHuf, 0)
}

function orderProductIds(order: Order): number[] {
  const ids: number[] = []
  for (const item of order.items ?? []) {
    if (item.product === null || item.product === undefined) {
      continue
    }
    ids.push(typeof item.product === 'object' ? item.product.id : item.product)
  }
  return ids
}

/**
 * A purchases-jogosultság IDEMPOTENS levétele teljes refundnál.
 *
 * - Csak a ténylegesen eltávolítható termékeknél fut update: ami már nincs a
 *   felhasználó purchases-listájában, az no-op (dupla refund / részleges
 *   korábbi állapot esetén sem keletkezik felesleges írás).
 * - Védelem: ha a vevőnek UGYANAZRA a termékre van MÁS paid rendelése, az a
 *   jogosultság megmarad — a levétel kizárólag a visszatérített rendeléshez
 *   köthető hozzáférést szünteti meg.
 */
async function revokePurchases(
  payload: Payload,
  order: Order,
  log: Logger,
): Promise<{ revoked: number }> {
  const customerRef = order.customer
  const customerId =
    typeof customerRef === 'object' && customerRef !== null ? customerRef.id : customerRef
  if (customerId === null || customerId === undefined) {
    log.warn('refund: a rendeléshez nem tartozik vevő — purchases-levétel kihagyva', {
      orderId: order.id,
    })
    return { revoked: 0 }
  }

  const productIds = orderProductIds(order)
  if (productIds.length === 0) {
    return { revoked: 0 }
  }

  // Más paid rendelés ugyanerre a termékre → a hozzáférés megmarad.
  const protectedIds = new Set<number>()
  for (const productId of productIds) {
    const otherPaid = await payload.find({
      collection: 'orders',
      where: {
        and: [
          { customer: { equals: customerId } },
          { status: { equals: 'paid' } },
          { 'items.product': { equals: productId } },
          { id: { not_equals: order.id } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    } as unknown as Parameters<Payload['find']>[0])
    if (otherPaid.totalDocs > 0) {
      protectedIds.add(productId)
    }
  }

  const removable = new Set(productIds.filter((id) => !protectedIds.has(id)).map(String))

  // K1: a vevő olvasása + írása a vevő-zár alatt, FRISS listából.
  // A más-paid-rendelés védelem fentebb, a zár előtt is futhat (a döntés
  // a védelmen nem a purchases-tömbön múlik).
  const result = await updateUserPurchases(
    payload,
    customerId,
    (current) => current.filter((id) => !removable.has(String(id))),
    log,
  )

  if (!result.wrote) {
    // Nincs eltávolítható jogosultság — idempotens no-op.
    return { revoked: 0 }
  }

  const revoked = result.previous.length - result.next.length
  log.info('refund: purchases-jogosultság levéve', {
    userId: customerId,
    revokedCount: revoked,
    keptForOtherPaidOrders: [...protectedIds],
  })
  return { revoked }
}

/**
 * STORNÓ teljes visszatérítéshez — best-effort (C4).
 *
 * A kiállítás állapota a rendelésre kerül (stornoStatus/stornoNumber/…), így a
 * kimaradt bizonylat lekérdezhető. Újrapróbálható hibánál a storno-issue job
 * kerül sorba; a kimenetel a refund HTTP-válaszát SOSEM befolyásolja.
 */
async function issueStornoBestEffort(params: {
  options: RefundOrderOptions
  order: Order
  log: Logger
  reason: string | null
}): Promise<void> {
  const { options, order, log, reason } = params
  try {
    const issueStorno = options.issueStorno ?? issueStornoForOrder
    const result = await issueStorno(order, {
      payload: options.payload,
      logger: log,
      ...(reason ? { reason } : {}),
    })
    if (result.outcome === 'failed') {
      log.warn(
        'refund: a stornó-számla kiállítása sikertelen — a refund ettől függetlenül sikeres (emberi pótlás szükséges)',
        { reason: result.reason ?? null },
      )
    } else {
      log.info('refund: stornó-számla feldolgozva', {
        outcome: result.outcome,
        stornoNumber: result.stornoNumber ?? null,
      })
    }
  } catch (error) {
    const retryable = isRetryableStornoError(error)
    log.error(
      'refund: a stornó-számla kiállítása hibával állt le (best-effort) — a refund eredménye ettől változatlan',
      { retryable, error: error instanceof Error ? error.message : String(error) },
    )
    if (retryable) {
      // Újrapróbálható provider-hiba: a bizonylat nem veszhet el — a job
      // viszi tovább (a szamlaKulsoAzon-horgony véd a duplikáció ellen).
      await queueStornoIssueJob(options.payload, order.id, log)
    }
  }
}

/**
 * HELYESBÍTŐ (módosító) számla részleges visszatérítéshez — best-effort (C5).
 *
 * A refundSeq a refunds-nyom 1-alapú sorszáma: ez köti a bizonylatot a
 * konkrét visszatérítéshez (idempotencia-kulcs), és ezzel áll sorba a
 * corrective-invoice-issue job is újrapróbálható hiba esetén.
 */
async function issueCorrectiveBestEffort(params: {
  options: RefundOrderOptions
  order: Order
  log: Logger
  reason: string | null
  refundSeq: number
  amountHuf: number
}): Promise<void> {
  const { options, order, log, reason, refundSeq, amountHuf } = params
  try {
    const issueCorrective = options.issueCorrective ?? issueCorrectiveInvoiceForOrder
    const result = await issueCorrective(order, {
      payload: options.payload,
      logger: log,
      refundSeq,
      amountHuf,
      ...(reason ? { reason } : {}),
    })
    if (result.outcome === 'failed') {
      log.warn(
        'refund: a helyesbítő számla kiállítása sikertelen — a részleges refund ettől függetlenül sikeres (emberi pótlás szükséges)',
        { reason: result.reason ?? null },
      )
    } else {
      log.info('refund: helyesbítő számla feldolgozva', {
        outcome: result.outcome,
        correctiveInvoiceNumber: result.correctiveInvoiceNumber ?? null,
        refundSeq,
      })
    }
  } catch (error) {
    const retryable = isRetryableCorrectiveError(error)
    log.error(
      'refund: a helyesbítő számla kiállítása hibával állt le (best-effort) — a refund eredménye ettől változatlan',
      { retryable, refundSeq, error: error instanceof Error ? error.message : String(error) },
    )
    if (retryable) {
      await queueCorrectiveInvoiceJob(options.payload, order.id, refundSeq, log)
    }
  }
}

/** Rendelés-keresés orderNumber alapján (a zár előtt és a záron belül is ez fut). */
async function findOrderByNumber(
  payload: Payload,
  orderNumber: string,
): Promise<Order | undefined> {
  const found = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])
  return found.docs[0] as Order | undefined
}

/** Egy konkrét rendelés-példányból levezetett refund-döntés. */
interface RefundDecision {
  totalHuf: number
  alreadyRefunded: number
  remainingHuf: number
  amountHuf: number
  type: 'full' | 'partial'
  reason: string | null
  /** A rendelés meglévő refund-nyoma (az új bejegyzés ehhez fűződik). */
  entries: OrderRefundEntry[]
  /** A korábbi refundból ismert Barion TransactionId (ha van). */
  storedTransactionId?: string
  /** A rendelés Barion fizetésazonosítója (validálva, tehát biztosan van). */
  barionPaymentId: string
}

/**
 * Állapotgép- és összeg-validáció EGY rendelés-példányon, hibánál RefundError-ral.
 *
 * Szándékosan tiszta (a naplózáson kívül mellékhatás-mentes) függvény: ugyanez
 * fut a záron KÍVÜL (gyors 4xx visszajelzés fölösleges zárfoglalás nélkül) és a
 * záron BELÜL, a FRISSEN újraolvasott rendelésen — a végleges döntést mindig az
 * utóbbi hozza, tehát egy közben lefutott párhuzamos refund maradvány-hatása
 * biztosan beszámítódik.
 */
function decideRefund(order: Order, input: RefundOrderInput, orderLog: Logger): RefundDecision {
  // Állapotgép-validáció: dupla refund → 409; nem paid → 409.
  if (order.status === 'refunded') {
    throw new RefundError(
      409,
      'Ez a rendelés már korábban teljes egészében visszatérítésre került.',
    )
  }
  if (order.status !== 'paid') {
    throw new RefundError(
      409,
      'Csak fizetett (paid) státuszú rendelés téríthető vissza. A rendelés jelenlegi státusza nem teszi ezt lehetővé.',
    )
  }

  // Összeg-feloldás és validáció.
  const totalHuf =
    typeof order.totalHufSnapshot === 'number'
      ? order.totalHufSnapshot
      : typeof order.amount === 'number'
        ? order.amount
        : null
  if (totalHuf === null || totalHuf <= 0) {
    orderLog.error('refund: a paid rendeléshez nem tartozik érvényes végösszeg', {
      totalHufSnapshot: order.totalHufSnapshot ?? null,
      amount: order.amount ?? null,
    })
    throw new RefundError(
      409,
      'A rendeléshez nem tartozik érvényes végösszeg, így a visszatérítés nem végezhető el.',
    )
  }

  const entries = readRefundEntries(order)
  const alreadyRefunded = alreadyRefundedHuf(order)
  const remainingHuf = totalHuf - alreadyRefunded
  if (remainingHuf <= 0) {
    // Védelmi ág: a nyom szerint minden visszatérült, pedig a státusz nem refunded.
    orderLog.error('refund: a refund-nyom szerint a rendelés már teljesen visszatérült', {
      totalHuf,
      alreadyRefunded,
    })
    throw new RefundError(409, 'Ez a rendelés már teljes egészében visszatérítésre került.')
  }

  const reason =
    typeof input.reason === 'string' && input.reason.trim().length > 0 ? input.reason.trim() : null

  let amountHuf = remainingHuf
  if (input.amountHuf !== undefined && input.amountHuf !== null) {
    const raw = typeof input.amountHuf === 'number' ? input.amountHuf : Number(input.amountHuf)
    if (!Number.isInteger(raw) || raw <= 0) {
      throw new RefundError(
        400,
        'A visszatérítendő összeg (amountHuf) pozitív egész szám kell legyen.',
      )
    }
    if (raw > remainingHuf) {
      throw new RefundError(
        400,
        `A visszatérítendő összeg nem haladhatja meg a még visszatéríthető összeget (${remainingHuf} Ft).`,
      )
    }
    amountHuf = raw
  }

  if (!order.barionPaymentId) {
    orderLog.error('refund: a paid rendeléshez nem tartozik Barion PaymentId')
    throw new RefundError(
      409,
      'A rendeléshez nem tartozik Barion fizetésazonosító, így a visszatérítés nem végezhető el.',
    )
  }

  return {
    totalHuf,
    alreadyRefunded,
    remainingHuf,
    amountHuf,
    type: alreadyRefunded + amountHuf >= totalHuf ? 'full' : 'partial',
    reason,
    entries,
    ...(entries[0]?.transactionId ? { storedTransactionId: entries[0].transactionId } : {}),
    barionPaymentId: order.barionPaymentId,
  }
}

/**
 * TransactionId-feloldás a Barion v4 GetState-ből — REPÓ-TÉNY: az orderön nincs
 * tárolt Barion TransactionId (a T-021/T-022 csak barionPaymentId-t/
 * barionPaymentRequestId-t ment), ezért az első refund előtt újra le kell kérdezni.
 *
 * A hívás SZÁNDÉKOSAN a refund-záron KÍVÜL fut: tiszta olvasás, mellékhatás
 * nélkül, tehát nem kell sorosítani — és így a lassabbik HTTP-hívás nem tartja
 * nyitva a zár tranzakcióját (lásd a modul zár-tartomány szakaszát).
 */
async function resolveBarionTransactionId(
  barionPaymentId: string,
  orderLog: Logger,
): Promise<string> {
  let state
  try {
    state = await fetchPaymentState(barionPaymentId)
  } catch (error) {
    orderLog.error('refund: a fizetésállapot újralekérdezése sikertelen (Barion GetState)', {
      kind: error instanceof BarionApiError ? error.kind : 'unknown',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
  // A visszatéríthető tranzakció kiválasztása: elsődlegesen a sikeres kártyás
  // fizetés (TransactionType 'CardPayment'), fallback az első tranzakció — a
  // Barion dokumentáció szerint a refund a tranzakciószintű TransactionId-t várja.
  const transactions = state.Transactions ?? []
  const refundable =
    transactions.find((tx) => tx.TransactionType === 'CardPayment' && tx.Status === 'Succeeded') ??
    transactions.find((tx) => tx.TransactionType === 'CardPayment') ??
    transactions[0]
  if (!refundable || typeof refundable.TransactionId !== 'string') {
    orderLog.error('refund: a fizetésállapot nem tartalmaz visszatéríthető tranzakciót', {
      barionStatus: state.Status,
    })
    throw new RefundError(
      502,
      'A Barion oldalán most nincs visszatéríthető tranzakció ehhez a rendeléshez. Ellenőrizd a fizetést a Barionban, és ha ott rendben van, próbáld újra néhány perc múlva.',
    )
  }
  return refundable.TransactionId
}

/** A refund-zár alatt született, a záron kívüli lépésekhez továbbadott eredmény. */
interface LockedRefundOutcome {
  /** A záron BELÜL frissen olvasott rendelés — az audit és a bizonylat is ezt használja. */
  order: Order
  decision: RefundDecision
  transactionId: string
  refundedTransactionStatus: string
  statusOutcome: 'succeeded' | 'unknown'
  refunds: OrderRefundEntry[]
  before: {
    status: Order['status']
    refunds: OrderRefundEntry[]
    refundReason: string | null
    refundedAt: string | null
  }
}

/**
 * A teljes refund-folyamat. Barion-hiba esetén a rendelés érintetlen marad —
 * a BarionApiError változatlanul propagálódik (a route-handler képezi válaszra).
 */
export async function refundOrder(options: RefundOrderOptions): Promise<RefundOrderResult> {
  const { payload, orderNumber } = options
  const log = options.logger ?? logger

  // 1. Rendelés-keresés — ismeretlen orderNumber → 404.
  const preOrder = await findOrderByNumber(payload, orderNumber)
  if (!preOrder) {
    throw new RefundError(404, 'A megadott rendelés nem található.')
  }
  const orderLog = log.child({ orderId: preOrder.id, orderNumber: preOrder.orderNumber })

  // 2–3. Elő-validáció a záron KÍVÜL: a nyilvánvalóan érvénytelen kérés (404/409/400)
  // így zárfoglalás nélkül, azonnal elbukik. A DÖNTŐ validáció a záron belül,
  // a frissen olvasott rendelésen ismétlődik meg.
  const preDecision = decideRefund(preOrder, options.input, orderLog)

  // 4. TransactionId elő-feloldás — GetState a záron KÍVÜL (tiszta olvasás).
  const preResolvedTransactionId =
    preDecision.storedTransactionId ??
    (await resolveBarionTransactionId(preDecision.barionPaymentId, orderLog))

  // 5. PÉNZMOZGATÓ SZAKASZ ADVISORY-ZÁR ALATT: friss olvasás → újra-validálás →
  // Barion-refund → a refunds-nyom írása. A záron belül minden döntés a FRISS
  // példányból születik, így két párhuzamos kérés nem térít vissza kétszer, és a
  // refunds-tömb írása sem veszíthet el bejegyzést.
  const outcome = await withAdvisoryLock<LockedRefundOutcome>(
    payload,
    refundLockKey(preOrder.id),
    async () => {
      // 5a. FRISS olvasás — a zár megszerzése közben egy párhuzamos refund már
      // módosíthatta a rendelést.
      const order = await findOrderByNumber(payload, orderNumber)
      if (!order) {
        throw new RefundError(404, 'A megadott rendelés nem található.')
      }
      const decision = decideRefund(order, options.input, orderLog)
      const { amountHuf, type, reason, entries } = decision

      // 5b. A tárolt TransactionId elsőbbsége: ha közben egy párhuzamos refund
      // beírta a sajátját, azt használjuk a záron kívül feloldott helyett.
      const transactionId = decision.storedTransactionId ?? preResolvedTransactionId

      // 5c. Barion-refund — ez az egyetlen pénzmozgató hívás. Hiba esetén (a
      // BarionApiError itt kibillen) a rendelésen SEMMI nem változik: a DB-írás
      // kizárólag a siker UTÁN következik.
      let refundResponse
      try {
        refundResponse = await refundPayment({
          paymentId: decision.barionPaymentId,
          transactionsToRefund: [{ transactionId, amountToRefund: amountHuf }],
        })
      } catch (error) {
        orderLog.error('refund: a Barion visszatérítés sikertelen — a rendelés változatlan', {
          kind: error instanceof BarionApiError ? error.kind : 'unknown',
          httpStatus: error instanceof BarionApiError ? (error.httpStatus ?? null) : null,
          providerErrorCodes:
            error instanceof BarionApiError ? error.providerErrors.map((e) => e.ErrorCode) : [],
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }

      // 5d. M-11 — a TRANZAKCIÓ-SZINTŰ státusz kiértékelése.
      //
      // A Payment/Refund v2 HTTP 200-at és üres Errors tömböt ad akkor is, ha a
      // tranzakció maga nem térült vissza (RefundFailed). Korábban ez az érték
      // csak eltárolódott, és a folyamat sikerként futott tovább: refund-bejegyzés
      // keletkezett, a rendelés refundedre váltott, és stornó/helyesbítő számla
      // indult egy MEG NEM TÖRTÉNT visszatérítésre.
      const refundedTransaction = refundResponse.RefundedTransactions?.[0]
      const rawStatus = refundedTransaction?.Status
      const statusOutcome = classifyRefundedTransactionStatus(rawStatus)

      if (statusOutcome === 'failed') {
        // HIBAÁG: semmilyen írás. Szándékosan NEM írunk „sikertelen" refund-
        // bejegyzést sem: az alreadyRefundedHuf MINDEN bejegyzés összegét
        // beszámítja, tehát egy kudarc-bejegyzés hamisan csökkentené a még
        // visszatéríthető maradványt. A nyom így a strukturált napló.
        orderLog.error(
          'refund: a Barion tranzakciószintű státusza RefundFailed — a visszatérítés NEM történt meg, a rendelés változatlan, bizonylat nem készült',
          {
            transactionId,
            amountHuf,
            barionTransactionStatus: rawStatus ?? null,
          },
        )
        throw new RefundError(
          502,
          'A Barion elutasította a visszatérítést (a tranzakció státusza: RefundFailed). A rendelés nem változott, és bizonylat sem készült — ellenőrizd a Barion felületén, majd próbáld újra.',
        )
      }

      const refundedTransactionStatus = rawStatus ?? 'Unknown'
      if (statusOutcome === 'unknown') {
        // KONZERVATÍV, DOKUMENTÁLT KEZELÉS ismeretlen/hiányzó státuszra.
        // A Barion nem mondta ki, hogy a refund meghiúsult (azt a RefundFailed
        // jelentené), de azt sem, hogy sikerült. A két kockázat nem egyforma:
        //  - ha rögzítjük és mégsem történt meg → hiányzó visszatérítés, amit a
        //    napló-riasztás alapján ember pótol;
        //  - ha NEM rögzítjük és mégis megtörtént → a maradvány újra
        //    visszatéríthetőnek látszik, azaz DUPLA PÉNZKIFIZETÉS.
        // A pénzügyileg visszafordíthatatlan hibát kerüljük: a bejegyzés
        // rögzül (a nyom pontos marad), de bizonylat automatikusan NEM készül,
        // és error-szintű riasztás kéri az emberi ellenőrzést.
        orderLog.error(
          'RIASZTÁS: a Barion nem adott értelmezhető tranzakció-státuszt a visszatérítésre — a refund-nyom rögzült, de bizonylat NEM készült; emberi ellenőrzés szükséges a Barion felületén',
          {
            transactionId,
            amountHuf,
            barionTransactionStatus: rawStatus ?? null,
          },
        )
      }

      // 5e. A refunds-nyom írása a FRISS bejegyzésekre fűzve.
      const nowIso = new Date().toISOString()
      const newEntry: OrderRefundEntry = {
        transactionId,
        amountHuf,
        status: refundedTransactionStatus,
        refundedAt: nowIso,
        type,
        ...(reason ? { reason } : {}),
      }
      const refunds = [...entries, newEntry]

      // Részrefund-döntés (kommentezett): részösszeges visszatérítésnél a
      // rendelés státusza paid MARAD, és a vevő hozzáférése (purchases) is
      // MEGMARAD — a részrefund tipikusan kártérítés/kedvezmény, nem a vásárlás
      // felbontása; a digitális tartalomhoz való hozzáférés megszüntetése csak a
      // teljes refundhoz (a pénzügyi tranzakció teljes visszafordításához) kötődik.
      // A refunds-nyom mindkét esetben pontos pénzügyi auditot ad.
      const before = {
        status: order.status,
        refunds: entries,
        refundReason: order.refundReason ?? null,
        refundedAt: order.refundedAt ?? null,
      }

      if (type === 'full') {
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            status: 'refunded',
            refundedAt: nowIso,
            ...(reason ? { refundReason: reason } : {}),
            refunds,
          } as unknown as Record<string, unknown>,
          overrideAccess: true,
        })
        // Purchases-levétel idempotensen, kizárólag teljes refundnál. DB-only,
        // gyors művelet — a záron belül marad, hogy a „teljes refund ⇒ nincs
        // hozzáférés" invariáns egy párhuzamos kérés szemszögéből is egyben legyen.
        await revokePurchases(payload, order, orderLog)
      } else {
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: { refunds } as unknown as Record<string, unknown>,
          overrideAccess: true,
        })
      }

      return {
        order,
        decision,
        transactionId,
        refundedTransactionStatus,
        statusOutcome,
        refunds,
        before,
      }
    },
    orderLog,
  )

  const {
    order,
    decision,
    transactionId,
    refundedTransactionStatus,
    statusOutcome,
    refunds,
    before,
  } = outcome
  const { amountHuf, type, reason, alreadyRefunded } = decision
  const totalRefundedHuf = alreadyRefunded + amountHuf

  // 6. Audit-bejegyzés (az audit-logs collection létezik — best-effort).
  await writeAuditLog({
    store: auditLogStore(payload),
    actor: options.actor.id,
    action: type === 'full' ? 'order-refund' : 'order-partial-refund',
    entityType: 'orders',
    entityId: order.id,
    before,
    after: {
      status: type === 'full' ? 'refunded' : 'paid',
      refunds,
      amountHuf,
      transactionId,
      refundedTransactionStatus,
    },
    req: options.headers ? { headers: options.headers } : undefined,
    ipAddress: options.ipAddress,
  })

  orderLog.info('refund: visszatérítés rögzítve', {
    type,
    amountHuf,
    totalRefundedHuf,
    transactionId,
    refundedTransactionStatus,
  })

  // 7. Számlázási bizonylat a visszatérítéshez — BEST-EFFORT, a záron KÍVÜL
  // (lassú, külső hívás; a zár tranzakcióját nem tarthatja nyitva).
  //
  // M-11 ELŐFELTÉTEL: bizonylat KIZÁRÓLAG igazoltan megtörtént visszatérítéshez
  // készül. A `RefundFailed` ág fentebb, a záron belül hibával kiszállt (ide el
  // sem jut); ismeretlen tranzakció-státusznál pedig szándékosan KIMARAD a
  // kiállítás — stornó/helyesbítő számlát nem adunk ki olyan visszatérítésre,
  // amelynek a megtörténtét a Barion nem erősítette meg. Az emberi pótlást a
  // fenti error-szintű riasztás kéri.
  //
  // A bizonylat típusát NEM önmagában a refund összege, hanem a bizonylat-
  // TÖRTÉNET dönti el:
  //  - ELSŐ refundként TELJES összeg → STORNÓ: az eredeti számla teljes
  //    érvénytelenítése (C4);
  //  - RÉSZLEGES refund → HELYESBÍTŐ (módosító) számla: az eredetire hivatkozó
  //    bizonylat, amely csak a visszatérített összeget hordozza negatív
  //    korrekciós tételként (C5). Stornó itt NEM készülhet, mert az a teljes
  //    számlát érvénytelenítené, miközben a vásárlás nagyobb része érvényben
  //    marad (a vevő hozzáférése is megmarad);
  //  - a MARADÉKOT LEZÁRÓ refund (type='full', de volt már korábbi részrefund)
  //    → SZINTÉN HELYESBÍTŐ, a most visszatérített záró összegre. Stornó itt
  //    TILOS: a korábbi részrefund(ok)hoz már helyesbítő számla készült, és a
  //    teljes eredeti számla stornója a részösszeget MÁSODSZOR is jóváírná —
  //    a bizonylatok a ténylegesen visszatérítettnél többet dokumentálnának.
  //    A rendelés-státusz (refunded) és a purchases-levétel ettől független:
  //    azt a fenti, összeg-alapú `type` vezérli.
  //
  // A bizonylat hibája (a retryable Számlázz.hu-hibákat is beleértve) NEM
  // billentheti ki a már sikeres refundot: minden ág elkapva és strukturáltan
  // naplózva. A refund szinkron route-handler, ezért a kiállítás itt, inline
  // fut; ÚJRAPRÓBÁLHATÓ hibánál a megfelelő job kerül sorba (storno-issue /
  // corrective-invoice-issue), így a bizonylat nem veszhet el.
  if (statusOutcome !== 'succeeded') {
    orderLog.warn(
      'refund: a bizonylat automatikus kiállítása kimaradt, mert a Barion nem igazolta vissza a tranzakció sikerét — emberi pótlás szükséges',
      { refundedTransactionStatus, type, amountHuf },
    )
  } else if (type === 'full' && alreadyRefunded === 0) {
    await issueStornoBestEffort({ options, order, log: orderLog, reason })
  } else {
    await issueCorrectiveBestEffort({
      options,
      order,
      log: orderLog,
      reason,
      refundSeq: refunds.length,
      amountHuf,
    })
  }

  return {
    orderNumber: order.orderNumber ?? orderNumber,
    type,
    amountHuf,
    transactionId,
    refundedTransactionStatus,
    alreadyRefundedHuf: alreadyRefunded,
    totalRefundedHuf,
    orderStatus: type === 'full' ? 'refunded' : 'paid',
    refundStatusOutcome: statusOutcome,
  }
}
