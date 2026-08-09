import { type NextRequest, NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { resolveClientIp } from '../audit'
import { logger } from '../logger'
import {
  checkRateLimit,
  getNamedRateLimiter,
  ipRateLimitKey,
  type RateLimiter,
} from '../rate-limit'
import { generateRequestId, getRequestId } from '../request-id'
import { CheckoutError, startCheckout, type CheckoutStartInput } from './start-checkout'

/**
 * POST /api/checkout/start route-handler factory (T-021).
 *
 * A függősségek (Payload-példány) injektálva vannak, így a handler maga is
 * egységtesztelhető; a tényleges route az src/app/(frontend)/api/checkout/start/route.ts
 * köti be a valódi configgal.
 *
 * Folyamat: auth (payload.auth) → rate-limit (per-user + per-IP, 10/perc) →
 * JSON-parse → startCheckout szolgáltatás → { orderNumber, gatewayUrl }.
 * Hibaágak: magyar felhasználói üzenet + technikai hiba naplózva requestId-vel.
 */
export interface CheckoutStartHandlerDeps {
  getPayload: () => Promise<Payload>
  /** Rate-limiter injektálható (teszt); alapból a megosztott checkoutStart singleton. */
  rateLimiter?: RateLimiter
}

export function createCheckoutStartHandler(
  deps: CheckoutStartHandlerDeps,
): (request: NextRequest) => Promise<Response> {
  const rateLimiter = deps.rateLimiter ?? getNamedRateLimiter('checkoutStart')

  return async function POST(request: NextRequest): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'checkout-start' })

    try {
      const payload = await deps.getPayload()

      // Nincs guest checkout: a végpont bejelentkezett (customer/staff/owner)
      // felhasználóhoz kötött.
      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return NextResponse.json(
          { error: 'A fizetés indításához bejelentkezés szükséges.' },
          { status: 401 },
        )
      }

      // RATE-LIMIT (per-user + per-IP) — a Barion Start-hívás költséges; a
      // korlát a checkout-flood (Barion API DoS) ellen véd. Az első elutasítás
      // nyer; a másik kulcson esetleg elfogyasztott részlet elvész (dokumentált).
      const limited =
        checkRateLimit({ limiter: rateLimiter, key: `user:${user.id}`, log }) ??
        checkRateLimit({ limiter: rateLimiter, key: ipRateLimitKey(request.headers), log })
      if (limited) {
        return limited
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          { error: 'Érvénytelen kérés: a törzsnek JSON-nak kell lennie.' },
          { status: 400 },
        )
      }

      const result = await startCheckout({
        payload,
        user,
        input: (body ?? {}) as CheckoutStartInput,
        ipAddress: resolveClientIp(request.headers),
        logger: log,
      })

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      if (error instanceof CheckoutError) {
        log.warn('checkout-start: üzleti hiba', {
          status: error.status,
          error: error.message,
        })
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      log.error('checkout-start: váratlan technikai hiba', {
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        { error: 'Váratlan hiba történt a fizetés indítása közben. Kérjük, próbáld újra később.' },
        { status: 500 },
      )
    }
  }
}
