import type { Payload } from 'payload'

import type { Order, User } from '../../payload-types'
import { withAdvisoryLock } from '../advisory-lock'
import type { BarionPaymentStateResponse, OrderPaymentState } from '../barion'
import type { Logger } from '../logger'
import { resolveOrderCustomer, type OrderCustomerResolution } from './resolve-order-customer'

/**
 * Barion-állapot → rendelés-állapotgép KÖZÖS MAGJA (T-022/T-0xx-W4-02).
 *
 * Ezt a modult KÉT hívó osztja meg — a viselkedésük így definíció szerint
 * azonos:
 *  1. a Barion-callback processzor (src/lib/barion-callback/process-callback.ts)
 *  2. az order-poll job (src/lib/order-poll/service.ts — elveszett/késői
 *     callback-ek utánpollolása)
 *
 * Átmenet-szabályok (mind idempotens):
 * - paid: FIÓK-FELOLDÁS (vendég-vásárlásnál: az e-mail alapján megtalált vagy
 *   létrehozott fiók a rendeléshez kötve — resolve-order-customer.ts), majd
 *   purchases-beírás a users-re (már megvan → no-op), és CSAK EZUTÁN
 *   order payment_pending/created → paid (már paid → no-op, NEM hiba). A
 *   sorrend indoklása a paid-ágnál (K1). Más kiinduló státuszból
 *   (cancelled/refunded/payment_failed) TILOS — 'rejected' + naplózott riasztás.
 *   ELŐFELTÉTEL: az ÖSSZEG-ASSERT (lásd lentebb) is teljesül.
 * - cancelled: payment_pending → cancelled; paid felé TILOS visszaállítani
 *   (állapotgép-védelem, riasztás); más kiindulóból figyelmeztetés, marad.
 * - payment_pending: státusz marad (a poll-job ütemezzi az újrapollolást).
 *
 * PÁRHUZAMOSSÁG (M5 — paid-átmenet advisory-zár). Az átmenet „ellenőriz-majd-ír"
 * (check-then-act) alakú: zár nélkül két párhuzamos szál (Barion-callback ×
 * order-poll) MINDKETTŐ transitionedToPaid=true-t kaphatna, és az onOrderPaid-
 * lánc (jogosultság-grant, számla-queue, e-mail) KÉTSZER futna; a poll ráadásul
 * a futás elején beolvasott, esetleg ELAVULT rendelés-példányból indul. Ezért az
 * írást hordozó ágak (paid/cancelled) rendelés-szintű Postgres advisory-zár
 * alatt futnak (`order-transition:order:<id>`, src/lib/advisory-lock.ts — a
 * refund-order.ts `refund:order:<id>` mintáját követve), és a záron BELÜL a
 * rendelés FRISSEN ÚJRAOLVASOTT: minden döntés (állapotgép-ág + összeg-assert) a
 * friss példányból születik. Így a második szál már a végleges státuszt látja —
 * transitionedToPaid PONTOSAN EGYSZER igaz, a paid → cancelled visszaállítás
 * pedig a friss állapoton is elakad az állapotgép-védelemen. A `payment_pending`
 * ág nem ír, ezért zárfoglalás nélkül, azonnal visszatér.
 *
 * ZÁR-TARTOMANY (a advisory-lock.ts üzemeltetési korlátja miatt): a záron belül
 * KIZÁRÓLAG gyors DB-műveletek futnak (rendelés-újraolvasás, státusz-írás,
 * purchases-grant). A GetState (külső HTTP) a HÍVÓNÁL, a záron kívül történik;
 * az onOrderPaid mellékhatásai (számla-queue + e-mail, szintén külső hívás)
 * szintén a zár elengedése UTÁN futnak a hívónál — az egyszeri lefutást a
 * atomikusan dőlt transitionedToPaid jelző garantálja, nem az, hogy a zár alatt
 * futnának.
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
  /**
   * A v4 GetState NYERS válasza — a paid-átmenet ÖSSZEG-ASSERTJÉNEK forrása.
   * Szándékosan kötelező: a leképezett státusz önmagában nem elég bizonyíték,
   * a kifizetett összeget és devizát is a rendeléshez kell mérni.
   */
  state: BarionPaymentStateResponse
  log: Logger
}

export type BarionTransitionAction = 'paid' | 'cancelled' | 'pending' | 'rejected'

export interface BarionTransitionResult {
  action: BarionTransitionAction
  /**
   * rejected akciónál az ok (paid-cancel-rejected / cancel-not-allowed /
   * paid-not-allowed / total-mismatch / duplicate-paid-order).
   */
  reason?: string
  /** true, ha a rendelés már a célállapotban volt (no-op átmenet). */
  duplicate?: boolean
  /** true KIZÁRÓLAG friss paid-átmenetnél — az onOrderPaid mellékhatás triggere. */
  transitionedToPaid?: boolean
  purchasesGranted?: number
  /**
   * A rendeléshez feloldott fiók (paid ágon). Ebből dől el a visszaigazoló
   * levél változata: jelszó-beállító link (most létrehozott / még jelszó
   * nélküli fiók) vagy belépés-hivatkozás (meglévő, működő fiók).
   */
  customer?: OrderCustomerResolution
}

/** A rendelés végösszege a szerver-oldali snapshotból (más forrás nem elfogadható). */
function orderExpectedTotal(order: Order): number | null {
  return typeof order.totalHufSnapshot === 'number' && Number.isFinite(order.totalHufSnapshot)
    ? order.totalHufSnapshot
    : null
}

/** A rendelés devizája; hiányzó érték esetén null (= assert-bukás). */
function orderExpectedCurrency(order: Order): string | null {
  return typeof order.currency === 'string' && order.currency.trim().length > 0
    ? order.currency.trim().toUpperCase()
    : null
}

export interface PaymentAmountAssertResult {
  ok: boolean
  /** Bukásnál a gépileg feldolgozható ok — a naplóba és a hívó felé is ez megy. */
  detail?:
    | 'order-total-missing'
    | 'order-currency-missing'
    | 'state-total-missing'
    | 'state-currency-missing'
    | 'total-differs'
    | 'currency-differs'
  expectedTotal?: number | null
  actualTotal?: number | null
  expectedCurrency?: string | null
  actualCurrency?: string | null
}

/**
 * ÖSSZEG-ASSERT: a Barion GetState-válasz Total/Currency mezője megegyezik-e a
 * rendelés SZERVER-OLDALI snapshotjával (totalHufSnapshot + currency).
 *
 * MIÉRT KELL: a leképezett `Succeeded` státusz csak azt mondja meg, hogy
 * „valamilyen fizetés sikerült" — azt nem, hogy MENNYI. A PaymentId-t a vevő
 * ismeri (a redirect URL-jében is ott van), a callback-payload pedig önmagában
 * nem bizonyíték: egy másik, kisebb összegű saját fizetés azonosítójával a
 * rendelést jóvá lehetne hagyatni. A Total/Currency összevetése köti a fizetést
 * a konkrét rendeléshez.
 *
 * KONZERVATÍV: minden hiányzó vagy nem értelmezhető érték BUKÁS. Inkább maradjon
 * függőben egy rendelés (riasztással, kézzel rendezhetően), mint hogy fedezet
 * nélkül aktiváljon hozzáférést.
 */
export function assertPaymentAmountMatches(
  order: Order,
  state: BarionPaymentStateResponse,
): PaymentAmountAssertResult {
  const expectedTotal = orderExpectedTotal(order)
  const expectedCurrency = orderExpectedCurrency(order)
  const actualTotal =
    typeof state.Total === 'number' && Number.isFinite(state.Total) ? state.Total : null
  const actualCurrency =
    typeof state.Currency === 'string' && state.Currency.trim().length > 0
      ? state.Currency.trim().toUpperCase()
      : null

  const base = { expectedTotal, actualTotal, expectedCurrency, actualCurrency }

  if (expectedTotal === null) {
    return { ok: false, detail: 'order-total-missing', ...base }
  }
  if (expectedCurrency === null) {
    return { ok: false, detail: 'order-currency-missing', ...base }
  }
  if (actualTotal === null) {
    return { ok: false, detail: 'state-total-missing', ...base }
  }
  if (actualCurrency === null) {
    return { ok: false, detail: 'state-currency-missing', ...base }
  }
  if (actualCurrency !== expectedCurrency) {
    return { ok: false, detail: 'currency-differs', ...base }
  }
  // A HUF deviza decimals: 0 (src/plugins/ecommerce.ts), tehát egész értékek —
  // a pontos egyezés a helyes és egyben a legszigorúbb szabály.
  if (actualTotal !== expectedTotal) {
    return { ok: false, detail: 'total-differs', ...base }
  }
  return { ok: true, ...base }
}

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
 * K5 — DUPLA-FIZETÉS felismerése: létezik-e ugyanannak a vevő+termék párnak
 * MÁS, már paid státuszú rendelése.
 *
 * MIÉRT KELL: a checkout-start duplavásárlás-blokkja (start-checkout.ts
 * assertNoDuplicatePurchase) csak SZŰK ABLAKBAN véd — a paid rendelést és az
 * AKTÍV (Barion-ablakon belüli) payment_pending-et látja. Elveszett callback +
 * lejárt fizetési ablak után a vevő MÁSODIK rendelést is indíthat, és ha
 * mindkét fizetés a Barionnál sikeres, a két rendelés egymástól függetlenül
 * mehetne paid-re (dupla terhelés). Ez a segéd a paid-ÁTMENET közös pontján
 * ad utolsó védelmi vonalat: a második paid-átmenet blokkolva + riasztva lesz
 * (manuális ellenőrzés/visszatérítés), a jogosultság-beírás nem fut le rá.
 *
 * Jól körülhatárolt, önállóan tesztelt segéd — a harvest-összefésülés miatt
 * SZÁNDÉKOSAN külön függvény (ebben a fájlban a D-csomag változása CSAK ez a
 * blokk: ez a segéd + a paid-ágban az őrt hívó pár sor).
 */
export async function hasPaidOrderFor(
  payload: Payload,
  input: { customerId: number | string; productIds: number[]; excludeOrderId: number | string },
): Promise<boolean> {
  const { customerId, productIds, excludeOrderId } = input
  if (productIds.length === 0) {
    return false
  }
  const result = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { customer: { equals: customerId } },
        { 'items.product': { in: productIds } },
        { status: { equals: 'paid' } },
        { id: { not_equals: excludeOrderId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    // A where-alak a generált Where-típusnál szűkebben igazolt (a
    // start-checkout.ts duplavásárlás-ellenőrzésének mintája).
  } as unknown as Parameters<Payload['find']>[0])
  return result.totalDocs > 0
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

/** A rendelés Barion-átmenetének advisory-zár kulcsa (egy rendelés = egy zár). */
export function orderTransitionLockKey(orderId: number | string): string {
  return `order-transition:order:${orderId}`
}

/**
 * Az állapotgép-átmenet végrehajtása a rendelésen. A visszaadott action
 * dönti el a hívó az esemény-lezárást / naplózást / mellékhatásokat.
 *
 * Az írást hordozó ágak (paid/cancelled) advisory-zár alatt, a rendelés
 * FRISSEN ÚJRAOLVASOTT példányán futnak (lásd a modul fejlécét — M5).
 */
export async function applyBarionStateTransition(
  input: BarionTransitionInput,
): Promise<BarionTransitionResult> {
  const { payload, order, mapped, log } = input

  if (mapped === 'payment_pending') {
    // Nincs írás — zárfoglalás sem kell (a friss példány itt nem hordoz döntést).
    if (order.status !== 'payment_pending' && order.status !== 'created') {
      log.warn('függő fizetésjelzés nem függő rendelésre — állapot változatlan', {
        orderStatus: order.status,
      })
    }
    return { action: 'pending' }
  }

  return withAdvisoryLock(
    payload,
    orderTransitionLockKey(order.id),
    async () => {
      // FRISS ÚJRAOLVASÁS a záron BELÜL: a hívó példánya elavult lehet (a poll a
      // futás elején olvasta be; a zárra várakozás közben egy párhuzamos szál —
      // callback vagy poll — már átállíthatta). Minden döntés ebből születik.
      const fresh = (await payload.findByID({
        collection: 'orders',
        id: order.id,
        depth: 0,
        overrideAccess: true,
      })) as Order
      return applyBarionStateTransitionLocked({ ...input, order: fresh })
    },
    log,
  )
}

/**
 * A tényleges átmenet-logika — KIZÁRÓLAG a zár alatt, friss rendelés-példányon
 * szabad futnia (a publikus applyBarionStateTransition gondoskodik róla).
 */
async function applyBarionStateTransitionLocked(
  input: BarionTransitionInput,
): Promise<BarionTransitionResult> {
  const { payload, order, mapped, state, log } = input

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

  // mapped === 'paid'
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

  // ÖSSZEG-ASSERT: a paid-átmenet (és a már paid rendelésen a jogosultság-
  // ellenőrzés) KIZÁRÓLAG akkor futhat, ha a Barion által visszaadott
  // Total/Currency egyezik a rendelés szerver-oldali snapshotjával.
  const amountCheck = assertPaymentAmountMatches(order, state)
  if (!amountCheck.ok) {
    log.error(
      'RIASZTÁS: a Barion-fizetés összege/devizája NEM egyezik a rendelés snapshotjával — paid-átmenet elutasítva, manuális ellenőrzés szükséges',
      {
        detail: amountCheck.detail,
        expectedTotal: amountCheck.expectedTotal ?? null,
        actualTotal: amountCheck.actualTotal ?? null,
        expectedCurrency: amountCheck.expectedCurrency ?? null,
        actualCurrency: amountCheck.actualCurrency ?? null,
        barionStatus: state.Status,
        orderStatus: order.status,
      },
    )
    return { action: 'rejected', reason: 'total-mismatch' }
  }

  /**
   * FIÓK-FELOLDÁS — a hozzáférés-beírás előfeltétele. Vendég-vásárlásnál a
   * rendelés `customer` nélkül jött létre: itt dől el (az e-mail alapján,
   * idempotensen), melyik fiók kapja a kurzust, és a rendelés is ekkor
   * kötődik hozzá. Bejelentkezett vásárlásnál ez csak a fiók beolvasása.
   *
   * A SORREND szándékos: az ÖSSZEG-ASSERT UTÁN fut, tehát fedezet nélküli vagy
   * hamis fizetésre fiók sem jön létre. A K5 dupla-fizetés-őr viszont már a
   * feloldott fiókkal dolgozik — vendég-rendelésre is érvényes marad.
   */
  const customer = await resolveOrderCustomer({ payload, order, log })
  // A helyi példány elavult (a customer mezőt épp most írtuk ki), a
  // jogosultság-beírás viszont ebből olvassa a vevőt.
  const orderWithCustomer: Order = { ...order, customer: customer.userId }

  const alreadyPaid = order.status === 'paid'
  if (!alreadyPaid) {
    // K5 DUPLA-FIZETÉS BLOKK: ha ugyanannak a vevő+termék párnak MÁS rendelése
    // már paid, ez a második fizetés NEM állhat paid-re (dupla terhelés) —
    // blokkolás + riasztás, manuális rendezés (visszatérítés) szükséges. A
    // segéd és az indoklás: hasPaidOrderFor (lásd fentebb). A MÁR paid
    // rendelés no-op ága szándékosan NEM érintett: az idempotens
    // jogosultság-javítás továbbra is futhat. A vevő a FELOLDOTT fiók —
    // vendég-vásárlásnál is (a rendelésen ott még nem volt customer, tehát az
    // őr enélkül némán kimaradna éppen az új, vendég-úton).
    //
    // A BLOKK HELYE KÖTÖTT: MINDEN íráson (jogosultság-beírás ÉS státusz)
    // ELŐTT kell futnia — utána már nem lenne mit megvédeni.
    const customerId = customer.userId
    if (
      await hasPaidOrderFor(payload, {
        customerId,
        productIds: orderProductIds(order),
        excludeOrderId: order.id,
      })
    ) {
      log.error(
        'RIASZTÁS: a vevő+termék párhoz már létezik MÁS paid rendelés — a második paid-átmenet BLOKKOLVA, manuális ellenőrzés/visszatérítés szükséges',
        { customerId, orderStatus: order.status },
      )
      return { action: 'rejected', reason: 'duplicate-paid-order' }
    }
  }

  /**
   * K1 — ÍRÁSI SORREND: a JOGOSULTSÁG ELŐBB, a `status: 'paid'` UTÁNA.
   *
   * ═══ A HIBA, AMIT BEZÁR ═══
   * Fordított sorrendben egy megszakadás (grant-hiba, process-crash a két írás
   * között) VÉGLEGESEN elnyelte a paid-átmenet mellékhatásait: a rendelés már
   * `paid` volt, tehát az újrapróbáláskor `alreadyPaid === true` →
   * `transitionedToPaid: false` → az onOrderPaid (számla + visszaigazoló/
   * aktiváló e-mail) SOHA nem futott le. Vendég-vásárlónál ez azt jelentette:
   * fizetett, van hozzáférése, de sosem kapott jelszó-beállító linket.
   *
   * Így viszont a megszakadás a rendelést `payment_pending`-ben hagyja, és az
   * újrapróbálás (callback-retry vagy order-poll) FRISS paid-átmenetként
   * pontosan egyszer küldi el a levelet. A jogosultság-beírás idempotens
   * (grantPurchases: csak a hiányzó termékek), tehát az ismétlés ártalmatlan —
   * a legrosszabb köztes állapot az, hogy a vevő hamarabb jut hozzáféréshez,
   * mint ahogy a rendelés paid-re vált.
   *
   * Az ÖSSZEG-ASSERT és a K5 dupla-fizetés-őr továbbra is MINDEN írás ELŐTT fut.
   */
  const grant = await grantPurchases(payload, orderWithCustomer, log)

  if (alreadyPaid) {
    log.info('a rendelés már paid — átmenet no-op, jogosultság-ellenőrzés fut')
  } else {
    if (order.status === 'created') {
      log.warn('created státuszú rendelés ugrik paid-re (payment_pending átugorva)')
    }
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'paid' },
      overrideAccess: true,
    })
    log.info('rendelés paid-re állítva (Barion v4 verifikációval)')
  }

  return {
    action: 'paid',
    duplicate: alreadyPaid,
    transitionedToPaid: !alreadyPaid,
    purchasesGranted: grant.granted,
    customer,
  }
}
