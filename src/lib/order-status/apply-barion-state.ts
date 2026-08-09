import type { Payload } from 'payload'

import type { Order, User } from '../../payload-types'
import type { BarionPaymentStateResponse, OrderPaymentState } from '../barion'
import type { Logger } from '../logger'

/**
 * Rendelés-állapotgép KÖZÖS MAGJA (T-022/T-0xx-W4-02, Stripe-bővítés).
 *
 * Hívók — a viselkedésük így definíció szerint azonos:
 *  1. a Barion-callback processzor (src/lib/barion-callback/process-callback.ts)
 *  2. az order-poll job (src/lib/order-poll/service.ts — elveszett/késői
 *     callback-ek utánpollolása)
 *  3. a Stripe-webhook processzor (src/lib/stripe-webhook/process-webhook.ts)
 *     — ő a provider-semleges applyPaidTransitiont hívja közvetlenül
 *
 * Átmenet-szabályok (mind idempotens):
 * - paid: order payment_pending/created → paid (már paid → no-op, NEM hiba),
 *   purchases-beírás a users-re (már megvan → no-op). Más kiinduló státuszból
 *   (cancelled/refunded/payment_failed) TILOS — 'rejected' + naplózott riasztás.
 *   ÖSSZEG/DEVIZA-ASSERT: a provider paid-jelzése ÖNMAGÁBAN nem elég — a
 *   friss paid-átmenet csak akkor történik meg, ha a provider által
 *   HITELESÍTETT végösszeg ≥ a rendelés totalHufSnapshot-ja ÉS a deviza
 *   egyezik (Barion: GetState Total/Currency; Stripe: sessions.retrieve
 *   amount_total/currency, fillérből forintra váltva). Eltérés (vagy nem
 *   ellenőrizhető/hiányzó érték) esetén NINCS paid-átmenet: 'rejected'
 *   (total-mismatch) + error-szintű riasztás.
 * - cancelled: payment_pending → cancelled; paid felé TILOS visszaállítani
 *   (állapotgép-védelem, riasztás); más kiindulóból figyelmeztetés, marad.
 *   (A Stripe-oldalon nincs hasonló jelzés: a checkout.session.completed
 *   csak fizetésről szól — a cancelled ág Barion-specifikus.)
 * - payment_pending: státusz marad (a poll-job ütemezzi az újrapollolást).
 *
 * A modul NEM végez esemény-lezárást (webhook-events) és NEM küld e-mailt/
 * számlázat — a mellékhatások (onOrderPaid) a HÍVÓ feladata, kizárólag
 * transitionedToPaid=true esetén.
 */

export interface BarionTransitionInput {
  payload: Payload
  order: Order
  /** A v4 GetState-ból leképezett rendelés-oldali állapot. */
  mapped: OrderPaymentState
  /** A teljes v4 GetState-válasz — a paid-átmenet Total/Currency-assertje ebből dolgozik. */
  state: BarionPaymentStateResponse
  log: Logger
}

export type BarionTransitionAction = 'paid' | 'cancelled' | 'pending' | 'rejected'

export interface BarionTransitionResult {
  action: BarionTransitionAction
  /** rejected akciónál az ok (paid-cancel-rejected / cancel-not-allowed / paid-not-allowed). */
  reason?: string
  /** true, ha a rendelés már a célállapotban volt (no-op átmenet). */
  duplicate?: boolean
  /** true KIZÁRÓLAG friss paid-átmenetnél — az onOrderPaid mellékhatás triggere. */
  transitionedToPaid?: boolean
  purchasesGranted?: number
}

/** Provider-semleges aliasok — a Stripe-ág ezekkel a nevekkel dolgozik. */
export type OrderTransitionAction = BarionTransitionAction
export type OrderTransitionResult = BarionTransitionResult

function orderProductIds(order: Order): number[] {
  const items = order.items ?? []
  const ids: number[] = []
  for (const item of items) {
    if (item.product === null || item.product === undefined) {
      continue
    }
    ids.push(typeof item.product === 'object' ? item.product.id : item.product)
  }
  return ids
}

function userPurchaseIds(user: User): number[] {
  const purchases = user.purchases ?? []
  return purchases.map((entry) => (typeof entry === 'object' ? entry.id : entry))
}

/**
 * A purchases-jogosultság idempotens beírása: csak a hiányzó termékek kerülnek
 * hozzá (már meglévő → no-op). Így a dupla callback és az újrapróbálás sem
 * hozhat létre dupla jogosultságot; részleges korábbi hiba esetén pedig
 * kijavítja a hiányt.
 */
export async function grantPurchases(
  payload: Payload,
  order: Order,
  log: Logger,
): Promise<{ granted: number; alreadyOwned: number }> {
  const customerRef = order.customer
  const customerId =
    typeof customerRef === 'object' && customerRef !== null ? customerRef.id : customerRef
  if (customerId === null || customerId === undefined) {
    // Rendelés vevő nélkül nem létezhet a checkout-folyamatban — ez adatinkonzisztencia.
    throw new Error('a rendeléshez nem tartozik vevő (customer) — jogosultság nem írható be')
  }

  const user = (await payload.findByID({
    collection: 'users',
    id: customerId,
    depth: 0,
    overrideAccess: true,
  })) as User

  const owned = new Set(userPurchaseIds(user).map(String))
  const missing = orderProductIds(order).filter((productId) => !owned.has(String(productId)))

  if (missing.length > 0) {
    await payload.update({
      collection: 'users',
      id: customerId,
      data: { purchases: [...userPurchaseIds(user), ...missing] },
      overrideAccess: true,
    })
    log.info('purchases-jogosultság beírva', {
      userId: customerId,
      grantedProductIds: missing,
    })
  }

  return { granted: missing.length, alreadyOwned: orderProductIds(order).length - missing.length }
}

/**
 * A paid-átmenet PROVIDER-SEMLEGES magja: a kiinduló-státusz védelme, az
 * összeg/deviza-assert, a paid update és a purchases-beírás. Ezt hívja a
 * Barion-ág (applyBarionStateTransition, GetState Total/Currency-bizonyítékkal)
 * és a Stripe-webhook processzor is (sessions.retrieve amount_total/currency-
 * bizonyítékkal, fillérből forintra váltva) — így a paid-átmenet szabályai a
 * két gatewaynél definíció szerint azonosak.
 *
 * A verifiedTotalHuf FORINTBAN értendő (a Stripe filléres amount_totalból a
 * hívó oszt 100-zal). null = nem ellenőrizhető → 'rejected' (total-mismatch):
 * ismeretlen helyzetben sosem jelölünk paid-et (konzervatív default).
 */
export interface ApplyPaidTransitionInput {
  payload: Payload
  order: Order
  /** A provider által HITELESÍTETT végösszeg forintban. */
  verifiedTotalHuf: number | null
  /** A provider által hitelesített deviza (a rendelés currency-jével vetjük össze). */
  verifiedCurrency: string | null | undefined
  /** A naplóba kerülő verifikációs forrásjelölő (pl. 'Barion v4', 'Stripe sessions.retrieve'). */
  verificationSource: string
  log: Logger
}

export async function applyPaidTransition(
  input: ApplyPaidTransitionInput,
): Promise<OrderTransitionResult> {
  const { payload, order, verifiedTotalHuf, verifiedCurrency, verificationSource, log } = input

  if (
    order.status === 'cancelled' ||
    order.status === 'refunded' ||
    order.status === 'payment_failed'
  ) {
    log.error(
      'RIASZTÁS: paid jelzés nem engedélyezett kiinduló státuszból — állapot változatlan, manuális ellenőrzés szükséges',
      { orderStatus: order.status },
    )
    return { action: 'rejected', reason: 'paid-not-allowed' }
  }

  const alreadyPaid = order.status === 'paid'
  if (!alreadyPaid) {
    // ÖSSZEG/DEVIZA-ASSERT a paid-átmenet előtt: a provider paid-jelzése
    // önmagában NEM bizonyíték — a hitelesített végösszegnek el kell érnie a
    // rendelés snapshot-végösszegét, és a devizának egyeznie kell.
    // Hiányzó/nem ellenőrizhető érték is elutasítás: ismeretlen helyzetben
    // sosem jelölünk paid-et (konzervatív default, riasztással).
    const expectedTotalHuf =
      typeof order.totalHufSnapshot === 'number' ? order.totalHufSnapshot : null
    const expectedCurrency = order.currency ?? 'HUF'
    if (
      expectedTotalHuf === null ||
      verifiedTotalHuf === null ||
      verifiedTotalHuf < expectedTotalHuf ||
      verifiedCurrency !== expectedCurrency
    ) {
      log.error(
        'RIASZTÁS: a hitelesített végösszeg/deviza nem felel meg a rendelés snapshotjának — paid-átmenet MEGTAGADVA, manuális ellenőrzés szükséges',
        {
          verificationSource,
          providerTotal: verifiedTotalHuf,
          providerCurrency: verifiedCurrency ?? null,
          expectedTotalHuf,
          expectedCurrency,
        },
      )
      return { action: 'rejected', reason: 'total-mismatch' }
    }
    if (order.status === 'created') {
      log.warn('created státuszú rendelés ugrik paid-re (payment_pending átugorva)')
    }
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'paid' },
      overrideAccess: true,
    })
    log.info(`rendelés paid-re állítva (${verificationSource} verifikációval)`)
  } else {
    log.info('a rendelés már paid — átmenet no-op, jogosultság-ellenőrzés fut')
  }

  // Purchases-beírás mindig idempotens (már paid rendelésnél is kijavítja az esetleges hiányt).
  const grant = await grantPurchases(payload, order, log)
  return {
    action: 'paid',
    duplicate: alreadyPaid,
    transitionedToPaid: !alreadyPaid,
    purchasesGranted: grant.granted,
  }
}

/**
 * Az állapotgép-átmenet végrehajtása a rendelésen. A visszaadott action
 * dönti el a hívó az esemény-lezárást / naplózást / mellékhatásokat.
 */
export async function applyBarionStateTransition(
  input: BarionTransitionInput,
): Promise<BarionTransitionResult> {
  const { payload, order, mapped, state, log } = input

  if (mapped === 'payment_pending') {
    if (order.status !== 'payment_pending' && order.status !== 'created') {
      log.warn('függő fizetésjelzés nem függő rendelésre — állapot változatlan', {
        orderStatus: order.status,
      })
    }
    return { action: 'pending' }
  }

  if (mapped === 'cancelled') {
    if (order.status === 'payment_pending') {
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'cancelled' },
        overrideAccess: true,
      })
      log.info('rendelés lemondva (Barion-státusz alapján)')
      return { action: 'cancelled' }
    }
    if (order.status === 'cancelled') {
      log.info('a rendelés már lemondott — duplikátum no-op')
      return { action: 'cancelled', duplicate: true }
    }
    if (order.status === 'paid') {
      // ÁLLAPOTGÉP-VÉDELEM: paid rendelést SOSEM állítunk vissza cancelledre.
      log.error(
        'RIASZTÁS: paid rendelésre cancelled Barion-jelzés érkezett — visszaállítás TILOS, állapot marad paid',
      )
      return { action: 'rejected', reason: 'paid-cancel-rejected' }
    }
    log.warn('cancelled jelzés nem lemondható kiinduló státuszból — állapot marad', {
      orderStatus: order.status,
    })
    return { action: 'rejected', reason: 'cancel-not-allowed' }
  }

  // mapped === 'paid' — a provider-semleges mag GetState-bizonyítékkal.
  return applyPaidTransition({
    payload,
    order,
    verifiedTotalHuf: typeof state.Total === 'number' ? state.Total : null,
    verifiedCurrency: state.Currency,
    verificationSource: 'Barion v4',
    log,
  })
}
