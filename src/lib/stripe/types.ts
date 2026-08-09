import type Stripe from 'stripe'

/**
 * Stripe gateway — típusok és a strukturált hibaosztály (a Barion-mintára).
 *
 * A Stripe NEM a @payloadcms/plugin-ecommerce adaptere: saját modulként épül,
 * a Barionnal azonos elvekkel (szerver-oldali snapshot-árak, webhook-payload
 * önmagában nem bizonyíték, közös állapotgép).
 *
 * A stripe SDK hibáit a wrapStripeError (client.ts) képezi StripeApiError-é —
 * a provider-hiba mezői (type, code, statusCode) elvesztés nélkül megőrződnek.
 */

/** A Stripe-hívás hibafajtái — a BarionErrorKind Stripe-megfelelői + konfig/aláírás. */
export type StripeErrorKind =
  /** A kérés timeoutba ütközött (a SDK connection-timeoutja). */
  | 'timeout'
  /** Hálózati hiba (StripeConnectionError — a szerver nem érhető el). */
  | 'network'
  /** A Stripe API HTTP-hibát adott (StripeAPIError / 5xx). */
  | 'http'
  /** Üzleti/provider-hiba (StripeInvalidRequestError, StripeCardError stb.). */
  | 'provider'
  /** A válasz nem értelmezhető / hiányos (pl. nincs session.url). */
  | 'invalid_response'
  /** A Stripe-integráció nincs beállítva (STRIPE_SECRET_KEY hiányzik). */
  | 'not_configured'
  /** A webhook-aláírás ellenőrzése sikertelen (vagy a webhook-secret hiányzik). */
  | 'signature'

export class StripeApiError extends Error {
  readonly kind: StripeErrorKind
  /** Emberi olvasású végpont-azonosító (pl. 'POST /v1/checkout/sessions'). */
  readonly endpoint: string
  readonly httpStatus?: number
  /** A Stripe SDK hiba type mezője (pl. 'StripeInvalidRequestError'). */
  readonly stripeErrorType?: string
  /** A Stripe hibakódja (pl. 'resource_missing'). */
  readonly stripeErrorCode?: string | null

  constructor(args: {
    message: string
    kind: StripeErrorKind
    endpoint: string
    httpStatus?: number
    stripeErrorType?: string
    stripeErrorCode?: string | null
  }) {
    super(args.message)
    this.name = 'StripeApiError'
    this.kind = args.kind
    this.endpoint = args.endpoint
    this.httpStatus = args.httpStatus
    this.stripeErrorType = args.stripeErrorType
    this.stripeErrorCode = args.stripeErrorCode
  }
}

export interface StripeClientConfig {
  /** false, ha STRIPE_SECRET_KEY nincs beállítva — a Stripe-gateway kikapcsolva (NEM indulási hiba, a Barion marad az alapértelmezett). */
  enabled: boolean
  /** Stripe secret key (sk_test_... / sk_live_...) — SOHA ne naplózd! (enabled=false esetén undefined). */
  secretKey?: string
  /** Webhook-aláíró titok (whsec_...) — enélkül a /api/stripe/webhook nem tud aláírást ellenőrizni. */
  webhookSecret?: string
}

/** A Stripe-config env-felülete (mind opcionális) — teszteléshez paraméterezhető. */
export interface StripeEnv {
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  [key: string]: string | undefined
}

/**
 * A stripe SDK vékony, strukturális szelete — a lib-wrapperök ezen a felületen
 * dolgoznak, így a tesztek valódi SDK-példány (és hálózat) nélkül injektálhatják.
 * A valódi `Stripe` példány strukturálisan kielégíti (a SDK Response<T> típusa
 * T-kompatibilis).
 */
export interface StripeGatewayClient {
  checkout: {
    sessions: {
      create: (
        params: Stripe.Checkout.SessionCreateParams,
        options?: { idempotencyKey?: string },
      ) => Promise<Stripe.Checkout.Session>
      retrieve: (id: string) => Promise<Stripe.Checkout.Session>
    }
  }
  webhooks: {
    constructEvent: (payload: string, header: string, secret: string) => Stripe.Event
  }
}
