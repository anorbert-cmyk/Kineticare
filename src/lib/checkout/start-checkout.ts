import type { Payload } from 'payload'

import type { Order, Product, User } from '../../payload-types'
import { withAdvisoryLock } from '../advisory-lock'
import { BARION_DEFAULT_PAYMENT_WINDOW, BarionApiError, startPayment } from '../barion'
import { logger, type Logger } from '../logger'

/**
 * Checkout-start szolgáltatás (T-021) — a POST /api/checkout/start végpont
 * üzleti logikája, transportfüggetlenül (a Payload-példány és a felhasználó
 * injektálva, így mockolt fetch-csel egységtesztelhető).
 *
 * A pénzügyi főlánc első láncszeme:
 *  1. input-validáció (productId, quantity, opcionális kliens-ár, waiver),
 *  2. termék- és státuszellenőrzés (archived/draft nem megvásárolható),
 *  3. ADVISORY-ZÁR alatt (S2): duplavásárlás-blokk (paid vagy aktív
 *     payment_pending → 409) ÉS a rendelés létrehozása — a kettő együtt egy
 *     „check-then-act" pár, zár nélkül két párhuzamos kérés MINDKETTŐ
 *     ellenőrzése átmegy, és két aktív rendelés jön létre ugyanarra a kurzusra,
 *  4. a rendelés `payment_pending` státusszal jön létre — az árakat KIZÁRÓLAG
 *     szerver-oldalon olvassuk és az orders beforeChange-hookja SNAPSHOTOLJA
 *     (orderIntegrityBeforeChange); a kliens által küldött ár sosem forrás,
 *  5. Barion Payment/Start a tesztelt src/lib/barion klienssel
 *     (PaymentRequestId = orderNumber → Barion-oldali idempotencia) — ez a
 *     hálózati hívás SZÁNDÉKOSAN a záron KÍVÜL fut,
 *  6. barionPaymentId + barionPaymentRequestId mentése a rendelésre.
 *
 * A rendelés `paid`-re állítása NEM itt történik: az kizárólag a
 * Barion-callback-útvonal (T-022) joga (T-063).
 */

/** Üzleti hiba HTTP-státusszal — a route-handler ezt képezi válaszra. */
export class CheckoutError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CheckoutError'
    this.status = status
  }
}

export interface CheckoutStartInput {
  productId?: unknown
  quantity?: unknown
  /** Opcionális kliens-oldali ár (Ft) — eltérés esetén 400; sosem a végösszeg forrása. */
  priceHuf?: unknown
  /** Az elállási jogról való lemondás elfogadása — kötelező (true). */
  consentWithdrawalWaiver?: unknown
}

export interface CheckoutStartOptions {
  payload: Payload
  user: User
  input: CheckoutStartInput
  /** A kliens IP-címe (proxy-fejlécekből feloldva) — a rendelésen rögzítjük. */
  ipAddress?: string
  /** Publikus szerver-URL a Barion Redirect/Callback URL-ekhez; alapból NEXT_PUBLIC_SERVER_URL. */
  serverUrl?: string
  logger?: Logger
}

export interface CheckoutStartResult {
  orderNumber: string
  gatewayUrl: string
}

/** 'hh:mm:ss' → ezredmásodperc (a Barion PaymentWindow formátuma). */
export function paymentWindowToMs(window: string = BARION_DEFAULT_PAYMENT_WINDOW): number {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(window)
  if (!match) {
    return 30 * 60 * 1000
  }
  const [, hours, minutes, seconds] = match
  return (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000
}

interface ParsedInput {
  productId: number
  quantity: number
  priceHuf?: number
}

function parseInput(input: CheckoutStartInput): ParsedInput {
  const rawId = input.productId
  const productId =
    typeof rawId === 'number' ? rawId : typeof rawId === 'string' ? Number(rawId) : Number.NaN
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new CheckoutError(400, 'Érvénytelen vagy hiányzó termékazonosító (productId).')
  }

  let quantity = 1
  if (input.quantity !== undefined) {
    const rawQuantity = typeof input.quantity === 'number' ? input.quantity : Number(input.quantity)
    if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > 99) {
      throw new CheckoutError(400, 'A mennyiség (quantity) 1 és 99 közötti egész szám lehet.')
    }
    quantity = rawQuantity
  }

  let priceHuf: number | undefined
  if (input.priceHuf !== undefined) {
    const rawPrice = typeof input.priceHuf === 'number' ? input.priceHuf : Number(input.priceHuf)
    if (!Number.isFinite(rawPrice) || rawPrice < 0) {
      throw new CheckoutError(400, 'Érvénytelen ár (priceHuf).')
    }
    priceHuf = rawPrice
  }

  // Az elállási-jog-lemondás (waiver) rögzítése API-szinten kötelező — a
  // kétlépcsős waiver-UX a storefront-ticketé, itt a mező biztos rögzítése a cél.
  if (input.consentWithdrawalWaiver !== true) {
    throw new CheckoutError(
      400,
      'A vásárláshoz el kell fogadnod, hogy a tartalom azonnali megnyitásával lemondasz az elállási jogodról (consentWithdrawalWaiver).',
    )
  }

  return { productId, quantity, ...(priceHuf !== undefined ? { priceHuf } : {}) }
}

/** A termék megvásárolhatóságának ellenőrzése (státusz + ár), magyar üzenetekkel. */
function assertPurchasable(product: Product, priceHuf?: number): void {
  if (product.status === 'archived') {
    throw new CheckoutError(400, 'Ez a termék már nem megvásárolható (archivált).')
  }
  if (product.status !== 'published') {
    throw new CheckoutError(400, 'Ez a termék jelenleg nem megvásárolható.')
  }
  if (product.priceInHUFEnabled !== true || typeof product.priceInHUF !== 'number') {
    throw new CheckoutError(400, 'A termékhez nem tartozik érvényes ár, így nem vásárolható meg.')
  }
  // Szerver-oldali ár-kikényszerítés: a kliens ára sosem forrás — ha eltér a
  // szerveren tárolt ártól, a kérést elutasítjuk (eltérés = 400).
  if (priceHuf !== undefined && priceHuf !== product.priceInHUF) {
    throw new CheckoutError(
      400,
      'A megadott ár eltér a termék aktuális árától. Frissítsd az oldalt, és próbáld újra.',
    )
  }
}

/** Duplavásárlás-blokk: paid rendelés vagy AKTÍV (nem lejárt) payment_pending → 409. */
async function assertNoDuplicatePurchase(
  payload: Payload,
  userId: number,
  productId: number,
): Promise<void> {
  const baseWhere = {
    customer: { equals: userId },
    'items.product': { equals: productId },
  }

  const paidOrders = await payload.find({
    collection: 'orders',
    where: { and: [baseWhere, { status: { equals: 'paid' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])
  if (paidOrders.totalDocs > 0) {
    throw new CheckoutError(409, 'Ezt a terméket már megvásároltad — a kurzust a fiókodban éred el.')
  }

  // Csak a Barion-fizetési ablakban (default 30 perc) lévő payment_pending
  // számít aktívnak; a lejárt, befejezetlen fizetések nem blokkolják az új próbálkozást.
  const windowCutoff = new Date(Date.now() - paymentWindowToMs()).toISOString()
  const pendingOrders = await payload.find({
    collection: 'orders',
    where: {
      and: [
        baseWhere,
        { status: { equals: 'payment_pending' } },
        { createdAt: { greaterThan: windowCutoff } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])
  if (pendingOrders.totalDocs > 0) {
    throw new CheckoutError(
      409,
      'Ehhez a termékhez már folyamatban van egy fizetés. Fejezd be azt, vagy várd meg a fizetési ablak lejártát.',
    )
  }
}

/**
 * Rendelésszám-ütközés (23505) felismerése.
 *
 * A rendelésszámot az orders beforeChange-hookja a „legnagyobb meglévő + 1"
 * mintával képzi (src/lib/order-number.ts), ami két egyidejű create esetén
 * ugyanazt az értéket adhatja. A végső garancia az orderNumber UNIQUE indexe:
 * a vesztes ág 23505-tel bukik. Ez NEM technikai hiba (500), hanem egy
 * újrapróbálható ütközés.
 *
 * ELSŐDLEGES jel a `pg` hibaobjektum strukturált `constraint` mezője (ez
 * pontosan megmondja, MELYIK kényszer sérült); FALLBACK a 23505-ös kód +
 * a hibaszövegben szereplő oszlopnév — így egy másik unique-ütközést (pl.
 * barionPaymentId) nem próbálunk vaktában újra.
 */
const ORDER_NUMBER_CONFLICT_MAX_ATTEMPTS = 4

function isOrderNumberConflict(error: unknown): boolean {
  let current: unknown = error
  const seen = new Set<unknown>()
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current)
    const candidate = current as {
      code?: unknown
      constraint?: unknown
      detail?: unknown
      message?: unknown
      cause?: unknown
    }
    if (typeof candidate.constraint === 'string' && candidate.constraint.includes('order_number')) {
      return true
    }
    if (candidate.code === '23505') {
      const text = [candidate.detail, candidate.message]
        .filter((part): part is string => typeof part === 'string')
        .join(' ')
      if (text.includes('order_number') || text.includes('orderNumber')) {
        return true
      }
    }
    current = candidate.cause
  }
  return false
}

/** Vevő-snapshot a rendelésre (számlázási/audit célokra, szerver-oldali adatokból). */
function buildCustomerSnapshot(user: User): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    billingName: user.billingName ?? null,
    billingZip: user.billingZip ?? null,
    billingCity: user.billingCity ?? null,
    billingStreet: user.billingStreet ?? null,
    taxNumber: user.taxNumber ?? null,
    snapshotAt: new Date().toISOString(),
  }
}

/**
 * A checkout-start teljes folyamata. Hiba esetén CheckoutError-t dob
 * (a Barion-hibaágakban a rendelést `payment_failed`-re állítja).
 */
export async function startCheckout(options: CheckoutStartOptions): Promise<CheckoutStartResult> {
  const { payload, user } = options
  const log = options.logger ?? logger
  const { productId, quantity, priceHuf } = parseInput(options.input)

  // A terméket a legfrissebb (draft) verzióval olvassuk — a vásárlási
  // jogosultságot a szerkesztői `status` mező dönti el, nem a drafts _status.
  const product = (await payload
    .findByID({
      collection: 'products',
      id: productId,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)) as Product | null
  if (!product) {
    throw new CheckoutError(404, 'A megadott termék nem található.')
  }
  assertPurchasable(product, priceHuf)

  // Rendelés létrehozása: az árakat és a rendelésszámot az orders
  // beforeChange-hookja tölti szerver-oldali (DB) forrásból — a kliens
  // sem árat, sem snapshotot nem adhat meg (a mezők access-e is zárt).
  const nowIso = new Date().toISOString()
  const createOrderOnce = async (): Promise<Order> =>
    (await payload.create({
      collection: 'orders',
      data: {
        customer: user.id,
        customerEmail: user.email ?? null,
        status: 'payment_pending',
        currency: 'HUF',
        items: [{ product: productId, quantity }],
        consentWithdrawalWaiver: true,
        consentWithdrawalWaiverAt: nowIso,
        customerSnapshot: buildCustomerSnapshot(user),
        ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
      },
      overrideAccess: true,
      depth: 0,
    })) as Order

  /**
   * A KRITIKUS SZAKASZ: duplavásárlás-ellenőrzés + rendelés-létrehozás egyben,
   * felhasználó–termék páronkénti advisory-zár alatt (processzek között is
   * soros). A zár a legszűkebb hatókörre szól, hogy a párhuzamos, MÁS terméket
   * vagy MÁS vevőt érintő checkout ne várakozzon.
   */
  const order = await withAdvisoryLock(
    payload,
    `checkout:${user.id}:${productId}`,
    async () => {
      await assertNoDuplicatePurchase(payload, user.id, productId)

      let lastConflict: unknown
      for (let attempt = 1; attempt <= ORDER_NUMBER_CONFLICT_MAX_ATTEMPTS; attempt += 1) {
        try {
          return await createOrderOnce()
        } catch (error) {
          if (!isOrderNumberConflict(error)) {
            throw error
          }
          lastConflict = error
          log.warn('checkout-start: rendelésszám-ütközés (23505) — újrapróbálás', {
            attempt,
            maxAttempts: ORDER_NUMBER_CONFLICT_MAX_ATTEMPTS,
            userId: user.id,
            productId,
          })
        }
      }

      log.error('checkout-start: a rendelésszám-ütközés újrapróbálásai kimerültek', {
        attempts: ORDER_NUMBER_CONFLICT_MAX_ATTEMPTS,
        userId: user.id,
        productId,
        error: lastConflict instanceof Error ? lastConflict.message : String(lastConflict),
      })
      throw new CheckoutError(
        503,
        'A rendelés létrehozása most nem sikerült a nagy terhelés miatt. Kérjük, próbáld újra néhány másodperc múlva.',
      )
    },
    log,
  )

  const orderNumber = order.orderNumber
  if (!orderNumber) {
    log.error('checkout-start: a rendelés rendelésszám nélkül jött létre', { orderId: order.id })
    throw new CheckoutError(500, 'A rendelés létrehozása nem sikerült. Kérjük, próbáld újra.')
  }

  // A végösszeg KIZÁRÓLAG a szerver-oldali snapshot: az orderIntegrity-hook
  // által a DB-árakból képzett totalHufSnapshot (fallback: item-snapshotok).
  const snapshotItems = (order.items ?? []) as Array<{
    titleSnapshot?: string | null
    priceHufSnapshot?: number | null
    quantity?: number | null
  }>
  const totalHuf =
    typeof order.totalHufSnapshot === 'number'
      ? order.totalHufSnapshot
      : snapshotItems.reduce(
          (sum, item) => sum + (item.priceHufSnapshot ?? 0) * (item.quantity ?? 1),
          0,
        )

  const serverUrl = (options.serverUrl ?? process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(
    /\/+$/,
    '',
  )

  /** Barion Start-hiba esetén a rendelést payment_failed-re állítjuk (best-effort). */
  const markPaymentFailed = async (): Promise<void> => {
    await payload
      .update({
        collection: 'orders',
        id: order.id,
        data: { status: 'payment_failed' },
        overrideAccess: true,
      })
      .catch((updateError) =>
        log.warn('checkout-start: a rendelés payment_failed-re állítása sikertelen', {
          orderId: order.id,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        }),
      )
  }

  let gatewayUrl: string
  let barionPaymentId: string
  let barionPaymentRequestId: string
  try {
    const startResponse = await startPayment({
      // PaymentRequestId = orderNumber → Barion-oldali idempotencia.
      paymentRequestId: orderNumber,
      redirectUrl: `${serverUrl}/fizetes/koszonom`,
      callbackUrl: `${serverUrl}/api/barion/callback`,
      payerHint: user.email ?? undefined,
      cardHolderNameHint: user.name ?? undefined,
      transactions: [
        {
          posTransactionId: `${orderNumber}-1`,
          total: totalHuf,
          comment: `Kineticare rendelés ${orderNumber}`,
          items: snapshotItems.map((item) => {
            const itemQuantity = item.quantity ?? 1
            const unitPrice = item.priceHufSnapshot ?? 0
            return {
              name: item.titleSnapshot ?? product.sku ?? `Termék #${productId}`,
              description: product.shortDescription ?? '',
              quantity: itemQuantity,
              unit: 'db',
              unitPrice,
              itemTotal: unitPrice * itemQuantity,
              ...(product.sku ? { sku: product.sku } : {}),
            }
          }),
        },
      ],
    })
    if (!startResponse.GatewayUrl) {
      throw new BarionApiError({
        message: 'A Barion Start-válasz nem tartalmaz GatewayUrl-t.',
        kind: 'invalid_response',
        endpoint: 'POST /v2/Payment/Start',
      })
    }
    gatewayUrl = startResponse.GatewayUrl
    barionPaymentId = startResponse.PaymentId
    barionPaymentRequestId = startResponse.PaymentRequestId ?? orderNumber
  } catch (error) {
    await markPaymentFailed()
    log.error('checkout-start: Barion fizetésindítás sikertelen', {
      orderId: order.id,
      orderNumber,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new CheckoutError(
      502,
      'A fizetés indítása jelenleg nem sikerült. Kérjük, próbáld újra néhány perc múlva.',
    )
  }

  await payload.update({
    collection: 'orders',
    id: order.id,
    data: {
      barionPaymentId,
      barionPaymentRequestId,
    },
    overrideAccess: true,
  })

  log.info('checkout-start: fizetés elindítva', {
    orderId: order.id,
    orderNumber,
    userId: user.id,
    productId,
    totalHuf,
  })

  return { orderNumber, gatewayUrl }
}
