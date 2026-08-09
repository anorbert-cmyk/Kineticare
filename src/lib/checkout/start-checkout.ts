import type { Payload } from 'payload'

import type { Order, Product, User } from '../../payload-types'
import { withAdvisoryLock } from '../advisory-lock'
import { BARION_DEFAULT_PAYMENT_WINDOW, BarionApiError, startPayment } from '../barion'
import { isUniqueViolation } from '../idempotency'
import { logger, type Logger } from '../logger'
import {
  createCheckoutSession,
  getStripeConfig,
  type StripeClientConfig,
  type StripeGatewayClient,
} from '../stripe'

/**
 * Checkout-start szolgáltatás (T-021, Stripe-bővítés) — a POST /api/checkout/start
 * végpont üzleti logikája, transportfüggetlenül (a Payload-példány és a felhasználó
 * injektálva, így mockolt fetch-csel egységtesztelhető).
 *
 * A pénzügyi főlánc első láncszeme:
 *  1. input-validáció (productId, quantity, opcionális kliens-ár, waiver,
 *     opcionális paymentMethod: 'barion' (default) | 'stripe'),
 *  2. termék- és státuszellenőrzés (archived/draft nem megvásárolható),
 *  3. duplavásárlás-blokk (paid vagy aktív payment_pending → 409) — a
 *     kritikus szakasz (ellenőrzés + rendelés-létrehozás) Postgres advisory
 *     zár alatt fut (user, product) kulccsal, így párhuzamos kéréseknél sem
 *     csúszhat át két aktív fizetés (TOCTOU-védelem),
 *  4. rendelés létrehozása `payment_pending` státusszal — az árakat KIZÁRÓLAG
 *     szerver-oldalon olvassuk és az orders beforeChange-hookja SNAPSHOTOLJA
 *     (orderIntegrityBeforeChange); a kliens által küldött ár sosem forrás.
 *     A hook minden create-kísérletnél friss rendelésszámot generál; a
 *     max+1 alapú sorszám párhuzamos checkoutnál ütközhet (unique 23505 az
 *     orders_order_number_idx indexen) — ezért a create ilyen hibára
 *     újrapróbálkozik (más hiba azonnal továbbmegy),
 *  5. gateway-indítás a zár feloldása UTÁN (a külső hívás nem tartozik a
 *     kritikus szakaszba) — ez az EGYETLEN provider-függő lépés:
 *     - barion (default): Barion Payment/Start a tesztelt src/lib/barion
 *       klienssel (PaymentRequestId = orderNumber → Barion-oldali
 *       idempotencia), majd barionPaymentId + barionPaymentRequestId mentése;
 *     - stripe: Stripe Checkout Session a src/lib/stripe wrapperrel
 *       (idempotencyKey = client_reference_id = orderNumber), majd
 *       stripeSessionId mentése; a session.url a gatewayUrl. Kikapcsolt
 *       Stripe-konfiguráció (STRIPE_SECRET_KEY nélkül) → a rendelés
 *       payment_failed + 503 magyar üzenet.
 *
 * A rendelés `paid`-re állítása NEM itt történik: az kizárólag a
 * Barion-callback (T-022) / a Stripe-webhook útvonal joga (T-063).
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

/** A választható fizetési gatewayk — a Barion az alapértelmezett. */
export type CheckoutPaymentMethod = 'barion' | 'stripe'

export interface CheckoutStartInput {
  productId?: unknown
  quantity?: unknown
  /** Opcionális kliens-oldali ár (Ft) — eltérés esetén 400; sosem a végösszeg forrása. */
  priceHuf?: unknown
  /** Az elállási jogról való lemondás elfogadása — kötelező (true). */
  consentWithdrawalWaiver?: unknown
  /** Fizetési gateway — opcionális, alapértelmezés 'barion'. */
  paymentMethod?: unknown
}

export interface CheckoutStartOptions {
  payload: Payload
  user: User
  input: CheckoutStartInput
  /** A kliens IP-címe (proxy-fejlécekből feloldva) — a rendelésen rögzítjük. */
  ipAddress?: string
  /** Publikus szerver-URL a gateway visszairányítás/callback URL-ekhez; alapból NEXT_PUBLIC_SERVER_URL. */
  serverUrl?: string
  logger?: Logger
  /** Injektálható Stripe-kliens (teszteléshez); alapból a valódi SDK-példány. */
  stripeClient?: StripeGatewayClient
  /** Injektálható Stripe-konfig (teszteléshez); alapból az envből oldódik. */
  stripeConfig?: StripeClientConfig
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
  paymentMethod: CheckoutPaymentMethod
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

  // A fizetési gateway választható, de alapértelmezésben a Barion marad — a
  // meglévő viselkedés változatlan, ha a kliens nem küldi a mezőt.
  let paymentMethod: CheckoutPaymentMethod = 'barion'
  if (input.paymentMethod !== undefined) {
    if (input.paymentMethod !== 'barion' && input.paymentMethod !== 'stripe') {
      throw new CheckoutError(
        400,
        'Érvénytelen fizetési mód (paymentMethod): csak „barion" vagy „stripe" adható meg.',
      )
    }
    paymentMethod = input.paymentMethod
  }

  // Az elállási-jog-lemondás (waiver) rögzítése API-szinten kötelező — a
  // kétlépcsős waiver-UX a storefront-ticketé, itt a mező biztos rögzítése a cél.
  if (input.consentWithdrawalWaiver !== true) {
    throw new CheckoutError(
      400,
      'A vásárláshoz el kell fogadnod, hogy a tartalom azonnali megnyitásával lemondasz az elállási jogodról (consentWithdrawalWaiver).',
    )
  }

  return { productId, quantity, paymentMethod, ...(priceHuf !== undefined ? { priceHuf } : {}) }
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
 * A create-kísérletek száma orderNumber-ütközésnél: 1 eredeti + max 3
 * újrapróbálkozás. Minden kísérletnél az orderIntegrityBeforeChange hook
 * ÚJRA lefut, így friss sorszám generálódik — az ütközés csak extrém
 * párhuzamosságnál marad fenn minden kísérleten át.
 */
const MAX_ORDER_CREATE_ATTEMPTS = 4

/**
 * Postgres unique-violation (23505) az orders_order_number_idx indexen?
 * A hibalánc (cause-ok) message-ei között keressük az index nevét — MÁS
 * unique-megszorítás hibája NEM újrapróbálandó, azonnal továbbdobjuk.
 */
function isOrderNumberUniqueViolation(error: unknown): boolean {
  if (!isUniqueViolation(error)) {
    return false
  }
  let current: unknown = error
  const seen = new Set<unknown>()
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const candidate = current as { message?: unknown; cause?: unknown }
    if (typeof candidate.message === 'string' && candidate.message.includes('order_number')) {
      return true
    }
    current = candidate.cause
  }
  return false
}

/** Vevő-snapshot a rendelésre (számlázási/audit célokra, szerver-oldali adatokból). */function buildCustomerSnapshot(user: User): Record<string, unknown> {
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
  const { productId, quantity, priceHuf, paymentMethod } = parseInput(options.input)

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

  // KRITIKUS SZAKASZ advisory zár alatt (TOCTOU-védelem): a duplavásárlás-
  // ellenőrzés és a rendelés-létrehozás ugyanarra a (user, product) párra
  // párhuzamos kéréseknél is sorosítva fut. A Barion-hívás a zár UTÁN, kívül
  // történik — a külső hívás nem tartozik a kritikus szakaszba.
  const order = await withAdvisoryLock(
    payload,
    `checkout:${user.id}:${productId}`,
    async () => {
      await assertNoDuplicatePurchase(payload, user.id, productId)

      // Rendelés létrehozása: az árakat és a rendelésszámot az orders
      // beforeChange-hookja tölti szerver-oldali (DB) forrásból — a kliens
      // sem árat, sem snapshotot nem adhat meg (a mezők access-e is zárt).
      // orderNumber-ütközésnél (unique 23505) újrapróbálkozás: a hook minden
      // kísérletnél friss sorszámot generál; MÁS hiba azonnal továbbmegy.
      const nowIso = new Date().toISOString()
      for (let attempt = 1; ; attempt += 1) {
        try {
          return (await payload.create({
            collection: 'orders',
            data: {
              customer: user.id,
              customerEmail: user.email ?? null,
              status: 'payment_pending',
              currency: 'HUF',
              paymentProvider: paymentMethod,
              items: [{ product: productId, quantity }],
              consentWithdrawalWaiver: true,
              consentWithdrawalWaiverAt: nowIso,
              customerSnapshot: buildCustomerSnapshot(user),
              ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
            },
            overrideAccess: true,
            depth: 0,
          })) as Order
        } catch (error) {
          if (!isOrderNumberUniqueViolation(error)) {
            throw error
          }
          if (attempt >= MAX_ORDER_CREATE_ATTEMPTS) {
            log.error(
              'checkout-start: a rendelésszám-ütközés az újrapróbálkozások ellenére fennáll',
              { userId: user.id, productId, attempts: attempt },
            )
            throw new CheckoutError(
              500,
              'A rendelés létrehozása nem sikerült. Kérjük, próbáld újra.',
            )
          }
          log.warn(
            'checkout-start: rendelésszám-ütközés (unique 23505) — újrapróbálkozás friss sorszámmal',
            { userId: user.id, productId, attempt },
          )
        }
      }
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

  /** Gateway Start-hiba esetén a rendelést payment_failed-re állítjuk (best-effort). */
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

  // A rendelés-létrehozás eddig KÖZÖS volt — innentől ágazik a két gateway.
  const gatewayUrl =
    paymentMethod === 'stripe'
      ? await startStripeGateway({
          payload,
          order,
          orderNumber,
          snapshotItems,
          totalHuf,
          serverUrl,
          user,
          product,
          productId,
          stripeClient: options.stripeClient,
          stripeConfig: options.stripeConfig,
          markPaymentFailed,
          log,
        })
      : await startBarionGateway({
          payload,
          order,
          orderNumber,
          snapshotItems,
          totalHuf,
          serverUrl,
          user,
          product,
          productId,
          markPaymentFailed,
          log,
        })

  log.info('checkout-start: fizetés elindítva', {
    orderId: order.id,
    orderNumber,
    userId: user.id,
    productId,
    totalHuf,
    paymentMethod,
  })

  return { orderNumber, gatewayUrl }
}

/** A rendelés item-snapshotjainak közös alakja (a hook által írt mezők szelete). */
interface OrderSnapshotItem {
  titleSnapshot?: string | null
  priceHufSnapshot?: number | null
  quantity?: number | null
}

interface GatewayStartCommonArgs {
  payload: Payload
  order: Order
  orderNumber: string
  snapshotItems: OrderSnapshotItem[]
  /** A szerver-oldali snapshot-végösszeg Ft-ban (totalHufSnapshot, fallback: item-összeg). */
  totalHuf: number
  serverUrl: string
  user: User
  product: Product
  productId: number
  /** Gateway Start-hiba esetén payment_failed-re állítja a rendelést (best-effort). */
  markPaymentFailed: () => Promise<void>
  log: Logger
}

/**
 * Barion-gateway indítása (T-021 eredeti ága, változatlan viselkedés):
 * Payment/Start (PaymentRequestId = orderNumber → Barion-oldali idempotencia),
 * majd barionPaymentId + barionPaymentRequestId mentése a rendelésre.
 */
async function startBarionGateway(args: GatewayStartCommonArgs): Promise<string> {
  const { payload, order, orderNumber, snapshotItems, totalHuf, serverUrl, user, product, productId } =
    args
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
    await args.markPaymentFailed()
    args.log.error('checkout-start: Barion fizetésindítás sikertelen', {
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

  return gatewayUrl
}

/**
 * Stripe-gateway indítása (a Barion-ág tükreképe): Checkout Session létrehozása
 * (idempotencyKey = client_reference_id = orderNumber → Stripe-oldali
 * idempotencia és webhook-oldali fallback-azonosító), majd stripeSessionId
 * mentése a rendelésre. A vevőt a session.url-re irányítjuk.
 *
 * Kikapcsolt Stripe-konfiguráció (STRIPE_SECRET_KEY nélkül): a Barion
 * Start-hibaág mintájára a rendelés payment_failed + 503 magyar üzenet.
 */
async function startStripeGateway(
  args: GatewayStartCommonArgs & {
    stripeClient?: StripeGatewayClient
    stripeConfig?: StripeClientConfig
  },
): Promise<string> {
  const { payload, order, orderNumber, snapshotItems, totalHuf, serverUrl, user, product, productId } =
    args
  const stripeConfig = args.stripeConfig ?? getStripeConfig()
  if (!stripeConfig.enabled) {
    await args.markPaymentFailed()
    args.log.warn(
      'checkout-start: Stripe fizetést kért a vevő, de az integráció ki van kapcsolva (STRIPE_SECRET_KEY hiányzik)',
      { orderId: order.id, orderNumber },
    )
    throw new CheckoutError(
      503,
      'A Stripe fizetés jelenleg nem érhető el. Kérjük, válaszd a Barion fizetést, vagy próbáld újra később.',
    )
  }

  let session: { sessionId: string; url: string }
  try {
    session = await createCheckoutSession(
      {
        orderNumber,
        successUrl: `${serverUrl}/fizetes/koszonom`,
        cancelUrl: `${serverUrl}/sikertelen`,
        customerEmail: user.email ?? undefined,
        // Fallback-tétel: ha valamiért üres lenne a snapshot-lista, a végösszeg
        // akkor is pontosan egy sorban megy át (a Stripe line_items nem lehet üres).
        items:
          snapshotItems.length > 0
            ? snapshotItems.map((item) => ({
                name: item.titleSnapshot ?? product.sku ?? `Termék #${productId}`,
                quantity: item.quantity ?? 1,
                unitPriceHuf: item.priceHufSnapshot ?? 0,
              }))
            : [
                {
                  name: `Kineticare rendelés ${orderNumber}`,
                  quantity: 1,
                  unitPriceHuf: totalHuf,
                },
              ],
      },
      { client: args.stripeClient, config: stripeConfig },
    )
  } catch (error) {
    await args.markPaymentFailed()
    args.log.error('checkout-start: Stripe fizetésindítás sikertelen', {
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
    data: { stripeSessionId: session.sessionId },
    overrideAccess: true,
  })

  return session.url
}
