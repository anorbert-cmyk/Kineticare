import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import {
  BarionApiError,
  fetchPaymentState,
  mapBarionPaymentStatus,
  type BarionPaymentStateResponse,
} from '../barion'
import { logger as rootLogger, type Logger } from '../logger'
import { onOrderPaid, queueInvoiceIssueJob } from '../order-paid'
import { applyBarionStateTransition } from '../order-status/apply-barion-state'
import { getSzamlazzConfig } from '../szamlazz'

/**
 * order-poll szolgáltatás (W4-02) — a payment_pending-ben ragadt rendelések
 * utánpollolása a Barion v4 GetState-tel. Ez a "második védővonal": ha egy
 * callback elveszik (hálózati hiba, deploy, Barion-késés), a fizetés akkor is
 * lezárul — a v4 válasz a végső igazság, a callback csak gyorsító.
 */

export const ORDER_POLL_BATCH_SIZE = 25
// Az árva-rendelés lejárata 24 óra: a Barion PaymentWindow (30 perc) és a
// banki késleltetések mellett a 2 órás türelem túl szűk volt — a 2 óra UTÁN
// befejeződő fizetés a 'paid-not-allowed' állapotgép-védelembe ütközött
// (pénz felvéve, kurzus nem). A 24 óra a késői banki feldolgozás is belefér.
export const ORPHAN_ORDER_GRACE_MS = 24 * 60 * 60 * 1000 // 24 óra
export const STUCK_ORDER_WARN_MS = 24 * 60 * 60 * 1000 // 24 óra
export const INVOICE_RESWEEP_BATCH_SIZE = 10
export const INVOICE_PENDING_STALE_MS = 10 * 60 * 1000 // 10 perc

export interface OrderPollSummary {
  scanned: number
  transitionedPaid: number
  cancelled: number
  stillPending: number
  /**
   * Érdemi vizsgálat nélkül kihagyott rendelések: (1) még türelmi időn belüli
   * árva rendelés, (2) rendszerszintű Barion-hiba miatt megszakított futásban a
   * sorra már nem került maradék (lásd isSystemicBarionFailure).
   */
  skipped: number
  failed: number
  orphaned: number
  invoiceRequeued: number
}

export interface OrderPollDeps {
  payload: Payload
  logger?: Logger
  /** Injektálható (teszteléshez); alapból a valódi fetchPaymentState. */
  fetchState?: (paymentId: string) => Promise<BarionPaymentStateResponse>
  /** Injektálható (teszteléshez); alapból a valódi onOrderPaid. */
  onPaid?: (order: Order) => Promise<void>
  /** Injektálható (teszteléshez); alapból a valódi queueInvoiceIssueJob-hívás. */
  queueInvoice?: (orderId: number) => Promise<boolean>
  /**
   * Be van-e kapcsolva a Számlázz.hu-integráció? Injektálható (teszteléshez);
   * alapból a `getSzamlazzConfig().enabled` (azaz: van-e SZAMLAZZ_AGENT_KEY).
   */
  invoicingEnabled?: () => boolean
  now?: number
}

/**
 * RENDSZERSZINTŰ-e a Barion-hiba, azaz értelmetlen-e ugyanabban a futásban a
 * többi rendelést is lekérdezni?
 *
 * Miért kell ez: a poll futásonként max. 25 függő rendelést pörget végig, és
 * mindegyikre külön GetState-et hív. Ha a hiba oka NEM az adott fizetés
 * (hanem hibás POSKey, elérhetetlen vagy leállt Barion API), akkor a maradék
 * 24 hívás garantáltan ugyanúgy elhasal — csak fölösleges terhelés a
 * szolgáltatón, és 24 további error-sor a naplóban. Ilyenkor a futás egyetlen
 * aggregált riasztással megáll, és 5 perc múlva a következő futás újrapróbálja.
 *
 * ÉLES KOCKÁZAT, ami ezt kikényszerítette: ha a BARION_POSKEY_* ál-értékre van
 * állítva, az induláskori ENV-assert (src/env.ts) ÁTENGEDI (csak a kulcs
 * MEGLÉTÉT nézi, a helyességét nem) — a hiba először itt, a percenkénti/5
 * percenkénti utánpollolásban jelentkezne, futásonként 25 hibás hívással.
 *
 * A hibafajtákat a strukturált BarionApiError hordozza (src/lib/barion/types.ts):
 * - `timeout` / `network`: az API nem érhető el — mindenkire ugyanaz.
 * - HTTP 401/403: hitelesítési hiba, tehát rossz POSKey — mindenkire ugyanaz.
 * - HTTP 5xx: szolgáltatói kimaradás — mindenkire ugyanaz.
 * - provider-hiba `Auth…` hibakóddal: a Barion HTTP 200-zal is jelezhet
 *   hitelesítési hibát (Errors tömb), ezért a hibakódra is szűrünk.
 * NEM rendszerszintű pl. a 404 (ez a fizetés nem található) — ott a többi
 * rendelést tovább kell pollolni.
 */
export function isSystemicBarionFailure(error: unknown): boolean {
  if (!(error instanceof BarionApiError)) {
    return false
  }
  if (error.kind === 'timeout' || error.kind === 'network') {
    return true
  }
  if (error.httpStatus === 401 || error.httpStatus === 403 || (error.httpStatus ?? 0) >= 500) {
    return true
  }
  return error.providerErrors.some((providerError) => /auth/i.test(providerError.ErrorCode))
}

/**
 * A Számlázz.hu-integráció állapota a poll szempontjából. A konfigfeloldás
 * DOBHAT (pl. elgépelt SZAMLAZZ_API_URL) — ezt itt elnyeljük: a poll fő
 * feladata a fizetések lezárása, azt egy számlázási konfighiba nem viheti el.
 * Hibás konfig esetén a számlázás úgysem működne, ezért a resweep kimarad.
 */
function resolveInvoicingEnabled(deps: OrderPollDeps, log: Logger): boolean {
  if (deps.invoicingEnabled) {
    return deps.invoicingEnabled()
  }
  try {
    return getSzamlazzConfig().enabled
  } catch (error) {
    log.warn('order-poll: a Számlázz.hu-konfiguráció hibás — a számla-resweep kimarad', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

async function resweepInvoices(deps: OrderPollDeps, log: Logger, summary: OrderPollSummary): Promise<void> {
  if (!resolveInvoicingEnabled(deps, log)) {
    // Kikapcsolt integrációnál (nincs SZAMLAZZ_AGENT_KEY) az invoice-issue task
    // garantáltan 'disabled' kimenettel no-opol, az invoiceStatus tehát 'none'
    // marad — a resweep így MINDEN futásban újra sorba állítaná UGYANAZT a 10
    // rendelést. Élesben ez 5 percenként 10 fölösleges job-sor a payload_jobs
    // táblában (napi ~2900) és ugyanennyi félrevezető info-log. A kulcs
    // megérkezése után a resweep automatikusan behozza a lemaradást.
    log.debug('order-poll: a Számlázz.hu-integráció kikapcsolva — a számla-resweep kimarad')
    return
  }
  const now = deps.now ?? Date.now()
  const candidates = await deps.payload.find({
    collection: 'orders',
    where: {
      and: [{ status: { equals: 'paid' } }, { invoiceStatus: { in: ['none', 'pending'] } }],
    },
    sort: 'updatedAt',
    limit: INVOICE_RESWEEP_BATCH_SIZE,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])

  const queueInvoice =
    deps.queueInvoice ?? ((orderId: number) => queueInvoiceIssueJob(deps.payload, orderId, log))

  for (const order of candidates.docs as Order[]) {
    if (order.invoiceStatus === 'pending') {
      const updatedAtMs = Date.parse(order.updatedAt ?? '')
      if (Number.isFinite(updatedAtMs) && now - updatedAtMs < INVOICE_PENDING_STALE_MS) {
        continue // friss pending — valószínűleg most dolgozik rajta egy worker
      }
    }
    const queued = await queueInvoice(order.id)
    if (queued) {
      summary.invoiceRequeued += 1
    }
  }
}

/** A poll-job egy futása. A visszaadott summary a job-output (és a napló). */
export async function pollPendingOrders(deps: OrderPollDeps): Promise<OrderPollSummary> {
  const log = (deps.logger ?? rootLogger).child({ module: 'order-poll' })
  const now = deps.now ?? Date.now()
  const fetchState = deps.fetchState ?? fetchPaymentState
  const onPaid = deps.onPaid ?? ((order: Order) => onOrderPaid({ payload: deps.payload, order, logger: log }))

  const summary: OrderPollSummary = {
    scanned: 0,
    transitionedPaid: 0,
    cancelled: 0,
    stillPending: 0,
    skipped: 0,
    failed: 0,
    orphaned: 0,
    invoiceRequeued: 0,
  }

  const pending = await deps.payload.find({
    collection: 'orders',
    where: { status: { equals: 'payment_pending' } },
    sort: 'createdAt',
    limit: ORDER_POLL_BATCH_SIZE,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])

  const pendingOrders = pending.docs as Order[]
  summary.scanned = pendingOrders.length

  for (let index = 0; index < pendingOrders.length; index += 1) {
    const order = pendingOrders[index]
    const orderLog = log.child({ orderId: order.id, orderNumber: order.orderNumber ?? null })

    if (!order.barionPaymentId) {
      // Árva rendelés: a Barion Payment/Start sosem jött létre (a checkout a
      // rendelés létrehozása után, a paymentId mentése előtt állt le).
      const createdAtMs = Date.parse(order.createdAt ?? '')
      if (Number.isFinite(createdAtMs) && now - createdAtMs >= ORPHAN_ORDER_GRACE_MS) {
        await deps.payload.update({
          collection: 'orders',
          id: order.id,
          data: { status: 'cancelled' },
          overrideAccess: true,
        })
        summary.orphaned += 1
        orderLog.warn(
          'árva rendelés (barionPaymentId nélkül) lejárt — cancelled; a vevő újrakezdheti a vásárlást',
          { ageMs: now - createdAtMs },
        )
      } else {
        summary.skipped += 1
      }
      continue
    }

    let state: BarionPaymentStateResponse
    try {
      state = await fetchState(order.barionPaymentId)
    } catch (error) {
      summary.failed += 1
      orderLog.warn('order-poll: GetState-hiba (a következő futás újrapollolja)', {
        error: error instanceof Error ? error.message : String(error),
      })
      if (isSystemicBarionFailure(error)) {
        const remaining = pendingOrders.length - (index + 1)
        summary.skipped += remaining
        log.error(
          'RIASZTÁS: rendszerszintű Barion-hiba (hitelesítés vagy elérhetetlen API) — a futás megszakadt, ' +
            'a maradék függő rendelés érintetlen. Ellenőrizd a Barion-környezetet és a POSKey-t; ' +
            'a következő ütemezett futás újrapróbálja.',
          {
            barionErrorKind: error instanceof BarionApiError ? error.kind : 'unknown',
            httpStatus: error instanceof BarionApiError ? (error.httpStatus ?? null) : null,
            skippedOrders: remaining,
          },
        )
        break
      }
      continue
    }

    const mapped = mapBarionPaymentStatus(state.Status)
    if (mapped === 'payment_pending') {
      summary.stillPending += 1
      const createdAtMs = Date.parse(order.createdAt ?? '')
      if (Number.isFinite(createdAtMs) && now - createdAtMs >= STUCK_ORDER_WARN_MS) {
        orderLog.error(
          'RIASZTÁS: a rendelés 24 órája payment_pending — manuális ellenőrzés szükséges (Barion-státusz még mindig függő)',
          { barionStatus: state.Status, ageMs: now - createdAtMs },
        )
      }
      continue
    }

    // A NYERS state a maggal utazik: a paid-átmenet előtt a Total/Currency
    // mezőt a rendelés szerver-oldali snapshotjához méri (S2 összeg-assert).
    const transition = await applyBarionStateTransition({
      payload: deps.payload,
      order,
      mapped,
      state,
      log: orderLog,
    })

    if (transition.transitionedToPaid) {
      await onPaid(order)
      summary.transitionedPaid += 1
      orderLog.info('order-poll: elveszett callback pótolva — a rendelés paid (utánpollolással zárult)')
    } else if (transition.action === 'paid') {
      summary.transitionedPaid += 1
    } else if (transition.action === 'cancelled') {
      summary.cancelled += 1
      orderLog.info('order-poll: a fizetés lejárt/megszakadt — a rendelés cancelled')
    } else if (transition.action === 'rejected') {
      summary.failed += 1
      orderLog.warn('order-poll: az átmenet visszautasítva (állapotgép-védelem)', {
        reason: transition.reason ?? null,
      })
    }
  }

  await resweepInvoices(deps, log, summary)

  log.info('order-poll futás kész', { ...summary })
  return summary
}
