import type { Payload } from 'payload'

import type { Order, User } from '../../payload-types'
import { withAdvisoryLock } from '../advisory-lock'
import { auditLogStore, writeAuditLog } from '../audit'
import { BarionApiError, fetchPaymentState, refundPayment } from '../barion'
import { logger, type Logger } from '../logger'
import { issueStornoForOrder, type IssueStornoForOrderDeps } from '../szamlazz'

/**
 * Owner-only rendelés-visszatérítés (refund) szolgáltatás.
 *
 * A POST /api/admin/orders/[orderNumber]/refund végpont üzleti logikája,
 * transportfüggetlenül (a Payload-példány injektálva, mockolt fetch-csel
 * egységtesztelhető — barion.test.ts / checkout-start.test.ts minta).
 *
 * Folyamat:
 *  1. rendelés-keresés orderNumber alapján (ismeretlen → 404),
 *  1/b. RACE-VÉDELEM: a 2–9. lépés Postgres advisory zár alatt fut,
 *     rendelésenként kulcsolva (refund:order:<id>). A zár belsejében a
 *     rendelés ÚJRAOLVASÁSRA kerül, így két párhuzamos refund kérés nem
 *     indulhat ugyanazzal a (lejárt) alreadyRefunded-állapottal — egyszerre
 *     legfeljebb egy refund folyamat dolgozik egy rendelésen.
 *     KOMPROMISSZUM (dokumentált): a zár tartománya átfogja a Barion
 *     GetState/Refund külső hívásokat is — a check-then-act (alreadyRefunded-
 *     ellenőrzés → Barion refund → nyilvántartás) csak így atomikus. A
 *     drizzle-tranzakció, ami a zárat tartja, NEM végez DB-írást (kizárólag
 *     zár-tartomány); a tényleges DB-írások a Payload-műveletek saját
 *     kapcsolatain, autocommitben történnek, miközben a zár még él.
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
 *  6. a RefundedTransactions tranzakció-státuszának mentése a rendelésre
 *     (refunds-nyom bejegyzésében),
 *  7. teljes refund → a rendelés státusza `refunded` + refundedAt; részrefund
 *     esetén a státusz paid MARAD, és csak refund-nyom keletkezik,
 *  8. purchases-levétel IDEMPOTENSEN, kizárólag teljes refundnál; részrefundnál
 *     a vevő hozzáférése megmarad,
 *  9. audit-logs bejegyzés (a collection létezik, best-effort writeAuditLog).
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

function userPurchaseIds(user: User): number[] {
  return (user.purchases ?? []).map((entry) => (typeof entry === 'object' ? entry.id : entry))
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

  const user = (await payload.findByID({
    collection: 'users',
    id: customerId,
    depth: 0,
    overrideAccess: true,
  })) as User

  const removable = new Set(productIds.filter((id) => !protectedIds.has(id)).map(String))
  const current = userPurchaseIds(user)
  const remaining = current.filter((id) => !removable.has(String(id)))

  if (remaining.length === current.length) {
    // Nincs eltávolítható jogosultság — idempotens no-op.
    return { revoked: 0 }
  }

  await payload.update({
    collection: 'users',
    id: customerId,
    data: { purchases: remaining },
    overrideAccess: true,
  })
  const revoked = current.length - remaining.length
  log.info('refund: purchases-jogosultság levéve', {
    userId: customerId,
    revokedCount: revoked,
    keptForOtherPaidOrders: [...protectedIds],
  })
  return { revoked }
}

/**
 * A teljes refund-folyamat belépési pontja: rendelés-keresés, majd a
 * tényleges folyamat a rendelés advisory zárja alatt (refundOrderLocked).
 */
export async function refundOrder(options: RefundOrderOptions): Promise<RefundOrderResult> {
  const { payload, orderNumber } = options
  const log = options.logger ?? logger

  // 1. Rendelés-keresés — ismeretlen orderNumber → 404 (a zár előtti gyors út).
  const orderQuery = {
    collection: 'orders',
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0]
  const found = await payload.find(orderQuery)
  const orderRef = found.docs[0] as Order | undefined
  if (!orderRef) {
    throw new RefundError(404, 'A megadott rendelés nem található.')
  }

  // 1/b. RACE-VÉDELEM: a teljes refund-folyamat a rendelésre kulcsolt advisory
  // zár alatt fut (a modulfejléc kompromisszuma szerint a zár a Barion-hívást
  // is átfogja — a check-then-act csak így atomikus). A zár BELSÉJÉBEN a
  // rendelés újraolvasódik: a zár megvárása alatt egy párhuzamos refund már
  // módosíthatta a státuszt vagy a refunds-nyomot.
  return withAdvisoryLock(
    payload,
    `refund:order:${orderRef.id}`,
    async () => {
      const locked = await payload.find(orderQuery)
      const order = locked.docs[0] as Order | undefined
      if (!order) {
        throw new RefundError(404, 'A megadott rendelés nem található.')
      }
      return refundOrderLocked(options, order, log)
    },
    log,
  )
}

/**
 * A refund tényleges folyamata (2–10. lépés) — KIZÁRÓLAG a rendelés advisory
 * zárjának belsejében, a zár alatt ÚJRAOLVASOTT rendelésen hívható.
 * Barion-hiba esetén a rendelés érintetlen marad — a BarionApiError
 * változatlanul propagálódik (a route-handler képezi válaszra).
 */
async function refundOrderLocked(
  options: RefundOrderOptions,
  order: Order,
  log: Logger,
): Promise<RefundOrderResult> {
  const { payload, orderNumber } = options
  const orderLog = log.child({ orderId: order.id, orderNumber: order.orderNumber })

  // 2. Állapotgép-validáció: dupla refund → 409; nem paid → 409.
  if (order.status === 'refunded') {
    throw new RefundError(409, 'Ez a rendelés már korábban teljes egészében visszatérítésre került.')
  }
  if (order.status !== 'paid') {
    throw new RefundError(
      409,
      'Csak fizetett (paid) státuszú rendelés téríthető vissza. A rendelés jelenlegi státusza nem teszi ezt lehetővé.',
    )
  }

  // 3. Összeg-feloldás és validáció.
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
    typeof options.input.reason === 'string' && options.input.reason.trim().length > 0
      ? options.input.reason.trim()
      : null

  let amountHuf = remainingHuf
  if (options.input.amountHuf !== undefined && options.input.amountHuf !== null) {
    const raw =
      typeof options.input.amountHuf === 'number'
        ? options.input.amountHuf
        : Number(options.input.amountHuf)
    if (!Number.isInteger(raw) || raw <= 0) {
      throw new RefundError(400, 'A visszatérítendő összeg (amountHuf) pozitív egész szám kell legyen.')
    }
    if (raw > remainingHuf) {
      throw new RefundError(
        400,
        `A visszatérítendő összeg nem haladhatja meg a még visszatéríthető összeget (${remainingHuf} Ft).`,
      )
    }
    amountHuf = raw
  }
  const type: 'full' | 'partial' = alreadyRefunded + amountHuf >= totalHuf ? 'full' : 'partial'

  if (!order.barionPaymentId) {
    orderLog.error('refund: a paid rendeléshez nem tartozik Barion PaymentId')
    throw new RefundError(
      409,
      'A rendeléshez nem tartozik Barion fizetésazonosító, így a visszatérítés nem végezhető el.',
    )
  }

  // 4. TransactionId-feloldás — REPÓ-TÉNY: az orderön nincs tárolt Barion
  // TransactionId (a T-021/T-022 csak barionPaymentId-t/barionPaymentRequestId-t
  // ment), ezért első refundnál a v4-es fetchPaymentState-tel kérdezzük újra.
  // A refunds-nyomba mentett transactionId-t a későbbi részrefundok már
  // újrahasználják (tárolt érték elsőbbsége, nincs felesleges GetState).
  const storedTransactionId = readRefundEntries(order)[0]?.transactionId
  let transactionId: string
  if (storedTransactionId) {
    transactionId = storedTransactionId
  } else {
    let state
    try {
      state = await fetchPaymentState(order.barionPaymentId)
    } catch (error) {
      orderLog.error('refund: a fizetésállapot újralekérdezése sikertelen (Barion GetState)', {
        kind: error instanceof BarionApiError ? error.kind : 'unknown',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
    // A visszatéríthető tranzakció kiválasztása: elsődlegesen a sikeres
    // kártyás fizetés (TransactionType 'CardPayment'), fallback az első
    // tranzakció — a Barion dokumentáció szerint a refund a
    // tranzakciószintű TransactionId-t várja.
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
        'A Barion fizetésállapot nem tartalmaz visszatéríthető tranzakciót. Kérjük, próbáld újra később.',
      )
    }
    transactionId = refundable.TransactionId
  }

  // 5. Barion-refund — ez az egyetlen pénzmozgató hívás. Hiba esetén (a
  // BarionApiError itt kibillen) a rendelésen SEMMI nem változik: a DB-írás
  // kizárólag a siker UTÁN következik.
  let refundResponse
  try {
    refundResponse = await refundPayment({
      paymentId: order.barionPaymentId,
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

  // 6. A RefundedTransactions státuszának mentése a refund-nyomba.
  const refundedTransaction = refundResponse.RefundedTransactions?.[0]
  const refundedTransactionStatus = refundedTransaction?.Status ?? 'Unknown'
  const nowIso = new Date().toISOString()
  const entries = readRefundEntries(order)
  const newEntry: OrderRefundEntry = {
    transactionId,
    amountHuf,
    status: refundedTransactionStatus,
    refundedAt: nowIso,
    type,
    ...(reason ? { reason } : {}),
  }
  const refunds = [...entries, newEntry]
  const totalRefundedHuf = alreadyRefunded + amountHuf

  // 7. Részrefund-döntés (kommentezett): részösszeges visszatérítésnél a
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
    // 8. Purchases-levétel idempotensen, kizárólag teljes refundnál.
    await revokePurchases(payload, order, orderLog)
  } else {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { refunds } as unknown as Record<string, unknown>,
      overrideAccess: true,
    })
  }

  // 9. Audit-bejegyzés (az audit-logs collection létezik — best-effort).
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

  // 10. Stornó-számla BEST-EFFORT — kizárólag TELJES refundnál (a stornó az
  // eredeti számla teljes érvénytelenítése; részrefundhoz helyesbítő számla
  // kellene, az külön fejlesztés). A stornó hibája (beleértve a retryable
  // Számlázz.hu-hibákat is) NEM billentheti ki a már sikeres refundot:
  // minden ág el van kapva és strukturáltan naplózva. A refund-folyamat
  // szinkron route-handler (nem job-alapú), ezért a stornó itt, inline,
  // best-effort módon fut; a duplikáció ellen a Számlázz.hu-oldali
  // szamlaKulsoAzon-horgony (`${orderNumber}-STORNO`) véd.
  if (type === 'full') {
    try {
      const issueStorno = options.issueStorno ?? issueStornoForOrder
      const stornoResult = await issueStorno(order, {
        logger: orderLog,
        ...(reason ? { reason } : {}),
      })
      if (stornoResult.outcome === 'failed') {
        orderLog.warn(
          'refund: a stornó-számla kiállítása sikertelen — a refund ettől függetlenül sikeres (emberi pótlás szükséges)',
          { reason: stornoResult.reason ?? null },
        )
      } else {
        orderLog.info('refund: stornó-számla feldolgozva', {
          outcome: stornoResult.outcome,
          stornoNumber: stornoResult.stornoNumber ?? null,
        })
      }
    } catch (error) {
      orderLog.error(
        'refund: a stornó-számla kiállítása hibával állt le (best-effort) — a refund eredménye ettől változatlan',
        {
          retryable: error instanceof Error && 'retryable' in error ? error.retryable : null,
          error: error instanceof Error ? error.message : String(error),
        },
      )
    }
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
  }
}
