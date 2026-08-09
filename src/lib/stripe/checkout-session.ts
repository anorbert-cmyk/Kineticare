import type Stripe from 'stripe'

import { createLogger } from '../logger'
import { getStripeConfig, resolveStripeClient, wrapStripeError } from './client'
import { StripeApiError, type StripeClientConfig, type StripeGatewayClient } from './types'

/**
 * Stripe Checkout Session wrapper (a Barion start.ts / state.ts tükreképe).
 *
 * Üzleti szabályok (a lib állítja, a hívó nem írhatja felül):
 * - mode: 'payment' (egyszeri fizetés, nincs előleg/részlet)
 * - currency: 'huf'
 * - idempotencyKey = client_reference_id = a rendelés orderNumber-e (a Barion
 *   PaymentRequestId-megfelelője: ugyanazzal a kulccsal a Stripe nem hoz létre
 *   új sessiont az újrapróbálkozáskor, a client_reference_id pedig a webhook-
 *   oldali rendelés-fallback-azonosító).
 *
 * HUF-FIGYELEM (fillér!): a Stripe a HUF-t a TERHELÉSEKNÉL KÉTTIZEDES devizaként
 * kezeli — az API-amountok a legkisebb egységben, azaz FILLÉRBEN értendők
 * (5000 Ft → 500000). A HUF csak a KIFIZETÉSEKNÉL (payout) zero-decimal.
 * Forrás: https://docs.stripe.com/currencies#zero-decimal — „Stripe treats HUF
 * as a zero-decimal currency for payouts, even though you can charge
 * two-decimal amounts." Ezért a lib minden Ft-értéket ×100-zal ad át, és a
 * webhook-oldali assertnél a hívó szintén fillérben vet össze
 * (amount_total >= totalHufSnapshot * 100).
 *
 * Összegszámítás NINCS a libben: a Ft-értékek a hívótól jönnek, szerver-oldalon
 * validálva (az orders snapshot-árai a forrás — a Barion-mintával azonosan).
 */

const logger = createLogger({ module: 'stripe' })

/** Ft → fillér konverzió a Stripe API-amountokhoz (lásd a fejléc HUF-megjegyzését). */
export function hufToFiller(amountHuf: number): number {
  return Math.round(amountHuf * 100)
}

/** Egy tétel a Checkout Session line_items-ében (Ft-ban, a lib képezi fillérre). */
export interface StripeCheckoutItemInput {
  name: string
  quantity: number
  /** Egységár FORINTBAN (a rendelés priceHufSnapshot-jából). */
  unitPriceHuf: number
}

export interface CreateCheckoutSessionParams {
  /** A rendelés orderNumber-e (KH-YYYY-NNNNNN) — idempotencyKey + client_reference_id. */
  orderNumber: string
  items: StripeCheckoutItemInput[]
  /** Sikeres fizetés utáni visszairányítás (a Barion redirectUrl megfelelője). */
  successUrl: string
  /** Megszakítás esetén ide viszi vissza a Stripe a vevőt. */
  cancelUrl: string
  /** A Stripe Checkout e-mail-előtöltése (a Barion PayerHint megfelelője). */
  customerEmail?: string
}

export interface CreateCheckoutSessionDeps {
  client?: StripeGatewayClient
  config?: StripeClientConfig
}

export interface StripeCheckoutSessionResult {
  /** A Checkout Session azonosítója (cs_...) — az orders.stripeSessionId-be mentjük. */
  sessionId: string
  /** A Stripe-hosted fizetőoldal URL-je — ide irányítjuk a vevőt (gatewayUrl). */
  url: string
}

/**
 * Checkout Session létrehozása (a Barion Payment/Start megfelelője). A válasz
 * url-jére kell a vevőt irányítani; a sessionId-t a rendelésen rögzíti a hívó.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
  deps: CreateCheckoutSessionDeps = {},
): Promise<StripeCheckoutSessionResult> {
  const endpoint = 'POST /v1/checkout/sessions'
  const client = resolveStripeClient(deps.client, deps.config)

  if (params.items.length === 0) {
    throw new StripeApiError({
      message: 'Stripe Checkout Session: legalább egy tétel kötelező.',
      kind: 'invalid_response',
      endpoint,
    })
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = params.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'huf',
      // Ft → fillér: a HUF terhelésnél kéttizedes (lásd a fejlécet).
      unit_amount: hufToFiller(item.unitPriceHuf),
      product_data: { name: item.name },
    },
  }))

  let session: Stripe.Checkout.Session
  try {
    session = await client.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        client_reference_id: params.orderNumber,
        locale: 'hu',
        ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
      },
      // Stripe-oldali idempotencia: ugyanazzal az orderNumber-rel nem jöhet
      // létre dupla session az újrapróbálkozáskor (a Barion PaymentRequestId mintája).
      { idempotencyKey: params.orderNumber },
    )
  } catch (error) {
    throw wrapStripeError(error, endpoint)
  }

  if (typeof session.url !== 'string' || session.url.length === 0) {
    throw new StripeApiError({
      message: 'A Stripe Checkout Session válasz nem tartalmaz fizetőoldal-URL-t (url).',
      kind: 'invalid_response',
      endpoint,
    })
  }

  logger.info('Stripe Checkout Session létrehozva', {
    endpoint,
    checkoutSessionId: session.id,
    orderNumber: params.orderNumber,
  })
  return { sessionId: session.id, url: session.url }
}

export interface RetrieveCheckoutSessionDeps {
  client?: StripeGatewayClient
  config?: StripeClientConfig
}

/**
 * Checkout Session újra-lekérdezése a Stripe-tól (a Barion GetState v4
 * megfelelője): a webhook-payload ÖNMAGÁBAN NEM bizonyíték — a paid-jóváhagyás
 * kizárólag ezzel a szerver-szerver lekérdezéssel történhet.
 */
export async function retrieveCheckoutSession(
  sessionId: string,
  deps: RetrieveCheckoutSessionDeps = {},
): Promise<Stripe.Checkout.Session> {
  const endpoint = 'GET /v1/checkout/sessions/{id}'
  const client = resolveStripeClient(deps.client, deps.config)
  try {
    return await client.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    throw wrapStripeError(error, endpoint)
  }
}

export interface ConstructWebhookEventDeps {
  client?: StripeGatewayClient
  config?: StripeClientConfig
}

/**
 * Webhook-esemény aláírás-ellenőrzése és feloldása. A NYERS body kell hozzá
 * (a JSON-újraszerializálás érvénytelenítené az aláírást — a hívó ezért
 * request.text()-et használ, NEM request.json-t).
 *
 * Hibák: hiányzó webhook-secret vagy érvénytelen aláírás → StripeApiError
 * kind 'signature' (a route-handler ezekre 400-at ad, és NEM ír webhook-events
 * sort — a verifikálatlan esemény sosem kerülhet a feldolgozási láncba).
 */
export function constructWebhookEvent(
  rawBody: string,
  signatureHeader: string,
  deps: ConstructWebhookEventDeps = {},
): Stripe.Event {
  const endpoint = 'webhooks.constructEvent'
  // A webhook-secret az injektált klienstől függetlenül a konfigból kell —
  // config-hiányban az envből oldódik (enabled=false esetén is itt dől el).
  const resolvedConfig = deps.config ?? getStripeConfig()
  const webhookSecret = resolvedConfig.webhookSecret
  if (!webhookSecret) {
    throw new StripeApiError({
      message: 'A Stripe webhook-aláírás nem ellenőrizhető (STRIPE_WEBHOOK_SECRET hiányzik).',
      kind: 'signature',
      endpoint,
    })
  }
  const client = resolveStripeClient(deps.client, resolvedConfig)
  try {
    return client.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('Stripe webhook aláírás-ellenőrzés sikertelen', { endpoint, errorMessage: message })
    throw new StripeApiError({
      message: `A Stripe webhook aláírása érvénytelen: ${message}`,
      kind: 'signature',
      endpoint,
    })
  }
}
