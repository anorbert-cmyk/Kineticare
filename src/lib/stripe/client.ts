import Stripe from 'stripe'

import { createLogger } from '../logger'
import { StripeApiError, type StripeClientConfig, type StripeEnv, type StripeGatewayClient } from './types'

/**
 * Stripe kliensmag: OPCIONÁLIS-enabled környezetfeloldás envből (a Számlázz.hu-
 * mintára — NEM a Barion kötelező-assertje), lusta SDK-példányosítás és a SDK
 * hibáinak strukturált StripeApiError-é fordítása.
 *
 * Környezeti változók (mind OPCIONÁLIS):
 * - STRIPE_SECRET_KEY: Stripe secret key (sk_test_... / sk_live_...). Hiányában
 *   enabled=false: a Stripe-gateway kikapcsolva — a checkout paymentMethod:
 *   'stripe' ága ilyenkor 503-at ad, a Barion (alapértelmezett) ettől
 *   változatlanul működik. Ezért a kulcs NINCS az src/env.ts kötelező
 *   listájában sem.
 * - STRIPE_WEBHOOK_SECRET: a /api/stripe/webhook aláírás-ellenőrzéséhez
 *   (whsec_...). Hiányában a webhook-végpont nem tud eseményt verifikálni
 *   (503-at ad, a Stripe retry-lépcsője újra kézbesít).
 *
 * API-verzió: explicit pinelve a telepített stripe@22.4.0 csomag által használt
 * verzióra (node_modules/stripe esm/apiVersion.d.ts: '2026-07-29.dahlia') — így
 * a kód és a SDK sosem csúszhat szét a webhook-események sémájától.
 *
 * Titokvédelem: a kulcsok kizárólag a SDK-példányba kerülnek; a naplóba sem
 * kérés-, sem válasz-body, sem kulcs nem kerül (a logger redact-listája a
 * 'secret' kulcsot amúgy is maszkolja). FIGYELEM: a 'session'/'sessionId'
 * log-mezőnevek szintén a redact-listán vannak — a checkout session azonosítót
 * ezért 'checkoutSessionId' mezőnéven naplózzuk.
 */

/**
 * A pinelt Stripe API-verzió — a telepített stripe csomag DEFAULT_API_VERSION-je
 * (stripe@22.4.0 → '2026-07-29.dahlia'). Csomagfrissítéskor ezt is frissíteni kell
 * (a stripe/esm/apiVersion.d.ts adja az aktuálisat).
 */
export const STRIPE_API_VERSION = '2026-07-29.dahlia'

const logger = createLogger({ module: 'stripe' })

function readEnv(env: StripeEnv, key: string): string | undefined {
  const value = env[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/**
 * Környezetfeloldás. STRIPE_SECRET_KEY nélkül enabled=false (a Stripe-gateway
 * kikapcsolva — NEM hiba, a Barion az alapértelmezett fizetési út). Tiszta
 * függvény (teszteléshez env-paraméteres).
 */
export function getStripeConfig(env: StripeEnv = process.env): StripeClientConfig {
  const secretKey = readEnv(env, 'STRIPE_SECRET_KEY')
  const webhookSecret = readEnv(env, 'STRIPE_WEBHOOK_SECRET')
  return {
    enabled: secretKey !== undefined,
    ...(secretKey ? { secretKey } : {}),
    ...(webhookSecret ? { webhookSecret } : {}),
  }
}

/**
 * Valódi stripe SDK-példány (lustán, hívásonként — a Barion-kliens
 * config-per-call mintájára; a példányosítás olcsó, hálózati hívás nélküli).
 * Kikapcsolt konfigurációval StripeApiError('not_configured') hibát dob.
 */
export function getStripeClient(config?: StripeClientConfig): Stripe {
  const resolved = config ?? getStripeConfig()
  if (!resolved.enabled || !resolved.secretKey) {
    throw new StripeApiError({
      message: 'A Stripe-integráció nincs beállítva (STRIPE_SECRET_KEY hiányzik).',
      kind: 'not_configured',
      endpoint: 'stripe-client',
    })
  }
  return new Stripe(resolved.secretKey, { apiVersion: STRIPE_API_VERSION })
}

/** A stripe SDK hibaobjektumának strukturális szelete (instanceof nélkül, a fake-kliens miatt). */
interface StripeErrorShape {
  type?: unknown
  code?: unknown
  statusCode?: unknown
  message?: unknown
}

function isStripeSdkError(error: unknown): error is StripeErrorShape & { type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as StripeErrorShape).type === 'string' &&
    (error as StripeErrorShape & { type: string }).type.startsWith('Stripe')
  )
}

/**
 * Tetszőleges (jellemzően SDK-) hiba fordítása StripeApiError-é, a Barion-
 * kliens kind-jaihoz igazítva. A StripeApiError változatlanul továbbmegy.
 */
export function wrapStripeError(error: unknown, endpoint: string): StripeApiError {
  if (error instanceof StripeApiError) {
    return error
  }
  const message = error instanceof Error ? error.message : String(error)

  if (isStripeSdkError(error)) {
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : undefined
    const code = typeof error.code === 'string' ? error.code : null
    const kind =
      error.type === 'StripeConnectionError'
        ? 'network'
        : error.type === 'StripeAPIError'
          ? 'http'
          : 'provider'
    logger.error('Stripe SDK-hiba', { endpoint, stripeErrorType: error.type, httpStatus: statusCode ?? null, stripeErrorCode: code })
    return new StripeApiError({
      message: `Stripe API hiba (${endpoint}): ${message}`,
      kind,
      endpoint,
      ...(statusCode !== undefined ? { httpStatus: statusCode } : {}),
      stripeErrorType: error.type,
      stripeErrorCode: code,
    })
  }

  // Időtúllépés-felismerés SDK nélküli (pl. fetch-szintű) hibákon is.
  if (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError' || message.toLowerCase().includes('timeout'))
  ) {
    logger.error('Stripe hívás timeout', { endpoint })
    return new StripeApiError({
      message: `A Stripe API nem válaszolt időben (${endpoint}).`,
      kind: 'timeout',
      endpoint,
    })
  }

  logger.error('Stripe hívás ismeretlen hibája', { endpoint, errorMessage: message })
  return new StripeApiError({
    message: `A Stripe API hívása sikertelen (${endpoint}): ${message}`,
    kind: 'network',
    endpoint,
  })
}

/**
 * A használandó kliens feloldása: injektált (teszt) vagy valódi SDK-példány.
 * A wrapperök ezen keresztül kapják a StripeGatewayClientet.
 */
export function resolveStripeClient(
  injected: StripeGatewayClient | undefined,
  config?: StripeClientConfig,
): StripeGatewayClient {
  if (injected) {
    return injected
  }
  const client = getStripeClient(config)
  // Dokumentált határpont: a valódi SDK típusai (Response<T> = T & { lastResponse })
  // strukturálisan szűkebbek a lib felületénél — a runtime viselkedés azonos.
  return client as unknown as StripeGatewayClient
}
