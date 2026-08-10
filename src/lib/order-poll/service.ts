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
/**
 * Ennyi EGYMÁST KÖVETŐ szállítási hiba (timeout / hálózat / 5xx) után szakítjuk
 * meg a futást. A számláló minden SIKERES GetState-re nullázódik, a rendelés-
 * szintű hibák (pl. 404) pedig se nem növelik, se nem nullázzák — így egyetlen
 * mérgezett rendelés (poison pill) nem tudja sorfejként befagyasztani a többit,
 * egy valódi szolgáltatói kimaradás viszont 3 kísérlet után megáll.
 */
export const MAX_CONSECUTIVE_TRANSPORT_FAILURES = 3
// Az árva-rendelés lejárata 24 óra: a Barion PaymentWindow (30 perc) és a
// banki késleltetések mellett a 2 órás türelem túl szűk volt — a 2 óra UTÁN
// befejeződő fizetés a 'paid-not-allowed' állapotgép-védelembe ütközött
// (pénz felvéve, kurzus nem). A 24 óra a késői banki feldolgozás is belefér.
export const ORPHAN_ORDER_GRACE_MS = 24 * 60 * 60 * 1000 // 24 óra
export const STUCK_ORDER_WARN_MS = 24 * 60 * 60 * 1000 // 24 óra
export const INVOICE_RESWEEP_BATCH_SIZE = 10
export const INVOICE_PENDING_STALE_MS = 10 * 60 * 1000 // 10 perc

/**
 * A számla-resweep kimenete — a job `output`-jában és a naplóban is látszik.
 * A „nem csináltunk semmit, mert nincs teendő" és a „nem is néztük meg" eset
 * így megkülönböztethető (korábban mindkettő `invoiceRequeued: 0` volt, a
 * kihagyás oka pedig csak debug-szinten látszott).
 *
 * - `done` — a resweep lefutott (a sorba állítások száma: invoiceRequeued)
 * - `skipped-disabled` — nincs SZAMLAZZ_AGENT_KEY, az integráció kikapcsolva
 * - `skipped-config-error` — a Számlázz.hu-konfiguráció hibás (RIASZTÁS a naplóban)
 */
export type InvoiceResweepStatus = 'done' | 'skipped-disabled' | 'skipped-config-error'

export interface OrderPollSummary {
  scanned: number
  transitionedPaid: number
  cancelled: number
  stillPending: number
  /**
   * Érdemi vizsgálat nélkül kihagyott rendelések: (1) még türelmi időn belüli
   * árva rendelés, (2) megszakított futásban a sorra már nem került maradék
   * (lásd classifyBarionFailure és MAX_CONSECUTIVE_TRANSPORT_FAILURES).
   */
  skipped: number
  failed: number
  orphaned: number
  invoiceRequeued: number
  /** Lefutott-e a számla-resweep, és ha nem, miért nem. */
  invoiceResweep: InvoiceResweepStatus
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
 * Barion-hibakódok, amelyeket HITELESÍTÉSI hibaként kezelünk akkor is, ha a
 * válasz HTTP 200 volt (a Barion a hibát az `Errors` tömbben is jelezheti).
 *
 * BIZONYOSSÁG — pontosan ennyi: a repóban NINCS hivatalos Barion-hibakódlista.
 * Ez a lista a saját teszt-fixtúráinkban rögzített megfigyelésre épül
 * (`AuthenticationFailed`, lásd src/__tests__/barion.test.ts és
 * checkout-start.test.ts). Ezért **pontos** (kis-nagybetűt nem néző) egyezésre
 * szűrünk, nem `/auth/i` mintára: a mintaillesztés bármely „auth"-ot tartalmazó
 * ismeretlen kódra azonnali megszakítást csinálna, azaz épp a sorfej-blokkolást
 * (poison pill) hozná vissza, amit el akarunk kerülni.
 *
 * A tévedés MINDKÉT iránya olcsó: ha egy valódi hitelesítési kód hiányzik a
 * listáról, a hiba `transport`-osztályba esik, és a 3 egymást követő hiba utáni
 * megszakítás úgyis elkapja — csak 3 hívással később. Ha ismeretlen kód kerülne
 * ide tévedésből, az egyetlen rendelés megállítaná az egész futást. Új kódot
 * tehát CSAK hivatkozott forrás alapján vegyél fel ide.
 */
export const BARION_AUTH_ERROR_CODES: readonly string[] = ['AuthenticationFailed']

/**
 * A GetState-hiba osztálya — ez dönti el, folytatható-e a futás.
 *
 * - `auth`: hitelesítési hiba (HTTP 401/403 vagy ismert auth-hibakód). Rossz
 *   POSKey / lejárt jogosultság: a maradék hívás GARANTÁLTAN ugyanígy elhasal,
 *   ezért AZONNAL megszakítunk.
 * - `transport`: az API nem érhető el vagy hibázik (timeout, hálózat, 5xx).
 *   Lehet szolgáltatói kimaradás, de lehet egyetlen szerencsétlen hívás is,
 *   ezért NEM szakítunk meg azonnal — csak N egymást követő ilyen hiba után.
 * - `order`: ehhez az EGY fizetéshez tartozó hiba (pl. 404 — nincs ilyen
 *   PaymentId, vagy értelmezhetetlen válasz). A többi rendelést tovább kell
 *   pollolni, különben egyetlen mérgezett rekord befagyasztaná a mentőhálót.
 *
 * ÉLES KOCKÁZAT, ami ezt kikényszerítette: ha a BARION_POSKEY_* ál-értékre van
 * állítva, az induláskori ENV-assert (src/env.ts) ÁTENGEDI (csak a kulcs
 * MEGLÉTÉT nézi, a helyességét nem) — a hiba először itt, az ütemezett
 * utánpollolásban jelentkezne, futásonként 25 hibás hívással és 25 error-sorral.
 */
export type BarionFailureClass = 'auth' | 'order' | 'transport'

export function classifyBarionFailure(error: unknown): BarionFailureClass {
  if (!(error instanceof BarionApiError)) {
    return 'order'
  }
  if (error.httpStatus === 401 || error.httpStatus === 403) {
    return 'auth'
  }
  if (
    error.providerErrors.some((providerError) =>
      BARION_AUTH_ERROR_CODES.some(
        (code) => code.toLowerCase() === providerError.ErrorCode.toLowerCase(),
      ),
    )
  ) {
    return 'auth'
  }
  if (error.kind === 'timeout' || error.kind === 'network') {
    return 'transport'
  }
  if ((error.httpStatus ?? 0) >= 500) {
    return 'transport'
  }
  return 'order'
}

/**
 * A Számlázz.hu-integráció állapota a poll szempontjából. A konfigfeloldás
 * DOBHAT (pl. elgépelt SZAMLAZZ_API_URL) — ezt itt elnyeljük: a poll fő
 * feladata a fizetések lezárása, azt egy számlázási konfighiba nem viheti el.
 * Hibás konfig esetén a számlázás úgysem működne, ezért a resweep kimarad — de
 * az ok RIASZTÁS-szintű naplósort kap, mert ez üzemeltetői beavatkozást kíván.
 */
function resolveInvoicingState(
  deps: OrderPollDeps,
  log: Logger,
): 'config-error' | 'disabled' | 'enabled' {
  try {
    const enabled = deps.invoicingEnabled ? deps.invoicingEnabled() : getSzamlazzConfig().enabled
    return enabled ? 'enabled' : 'disabled'
  } catch (error) {
    log.error(
      'RIASZTÁS: a Számlázz.hu-konfiguráció hibás — a számla-resweep kimarad, a kiesett ' +
        'számlák NEM állítódnak újra sorba. Ellenőrizd a Számlázz.hu környezeti változóit.',
      { error: error instanceof Error ? error.message : String(error) },
    )
    return 'config-error'
  }
}

async function resweepInvoices(
  deps: OrderPollDeps,
  log: Logger,
  summary: OrderPollSummary,
): Promise<void> {
  const invoicingState = resolveInvoicingState(deps, log)
  if (invoicingState !== 'enabled') {
    // Kikapcsolt integrációnál (nincs SZAMLAZZ_AGENT_KEY) az invoice-issue task
    // garantáltan 'disabled' kimenettel no-opol, az invoiceStatus tehát 'none'
    // marad — a resweep így MINDEN futásban újra sorba állítaná UGYANAZT a 10
    // rendelést. Élesben ez 5 percenként 10 fölösleges job-sor a payload_jobs
    // táblában (napi ~2900) és ugyanennyi félrevezető info-log. A kulcs
    // megérkezése után a resweep automatikusan behozza a lemaradást.
    // A kihagyás TÉNYE a summaryben (invoiceResweep) is látszik, tehát a
    // job-outputból megkülönböztethető a „nincs teendő" esettől.
    summary.invoiceResweep =
      invoicingState === 'disabled' ? 'skipped-disabled' : 'skipped-config-error'
    log.debug('order-poll: a számla-resweep kimarad', { invoiceResweep: summary.invoiceResweep })
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
    invoiceResweep: 'done',
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

  /**
   * Egymást követő szállítási hibák (timeout / hálózat / 5xx) száma. SIKERES
   * GetState-re nullázódik; a rendelés-szintű hibák (404 stb.) nem nyúlnak
   * hozzá, mert azok nem mondanak semmit a szolgáltatás egészségéről.
   */
  let consecutiveTransportFailures = 0

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
      consecutiveTransportFailures = 0
    } catch (error) {
      summary.failed += 1
      orderLog.warn('order-poll: GetState-hiba (a következő futás újrapollolja)', {
        error: error instanceof Error ? error.message : String(error),
      })

      const failureClass = classifyBarionFailure(error)
      const barionErrorKind = error instanceof BarionApiError ? error.kind : 'unknown'
      const httpStatus = error instanceof BarionApiError ? (error.httpStatus ?? null) : null
      const remaining = pendingOrders.length - (index + 1)

      if (failureClass === 'auth') {
        // Hitelesítési hiba: a maradék hívás garantáltan ugyanígy elhasal.
        summary.skipped += remaining
        log.error(
          'RIASZTÁS: Barion hitelesítési hiba (rossz vagy lejárt POSKey) — a futás azonnal ' +
            'megszakadt, a maradék függő rendelés érintetlen. Ellenőrizd a Barion-környezetet ' +
            'és a POSKey-t; a következő ütemezett futás újrapróbálja.',
          { barionErrorKind, httpStatus, skippedOrders: remaining },
        )
        break
      }

      if (failureClass === 'transport') {
        consecutiveTransportFailures += 1
        if (consecutiveTransportFailures >= MAX_CONSECUTIVE_TRANSPORT_FAILURES) {
          summary.skipped += remaining
          log.error(
            `RIASZTÁS: ${MAX_CONSECUTIVE_TRANSPORT_FAILURES} egymást követő Barion-hiba ` +
              '(timeout / hálózat / 5xx) — a futás megszakadt, a maradék függő rendelés ' +
              'érintetlen. Valószínűleg szolgáltatói kimaradás; a következő ütemezett futás ' +
              'újrapróbálja.',
            {
              barionErrorKind,
              httpStatus,
              consecutiveTransportFailures,
              skippedOrders: remaining,
            },
          )
          break
        }
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
