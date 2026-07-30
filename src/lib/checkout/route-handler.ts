import { type NextRequest, NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { resolveClientIp } from '../audit'
import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import { CheckoutError, startCheckout, type CheckoutStartInput } from './start-checkout'

/**
 * POST /api/checkout/start route-handler factory (T-021).
 *
 * A függősségek (Payload-példány) injektálva vannak, így a handler maga is
 * egységtesztelhető; a tényleges route az src/app/(frontend)/api/checkout/start/route.ts
 * köti be a valódi configgal.
 *
 * Folyamat: auth (payload.auth) → JSON-parse → startCheckout szolgáltatás →
 * { orderNumber, gatewayUrl }. Hibaágak: magyar felhasználói üzenet +
 * technikai hiba naplózva requestId-vel.
 */
export interface CheckoutStartHandlerDeps {
  getPayload: () => Promise<Payload>
}

export function createCheckoutStartHandler(
  deps: CheckoutStartHandlerDeps,
): (request: NextRequest) => Promise<NextResponse> {
  return async function POST(request: NextRequest): Promise<NextResponse> {
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
