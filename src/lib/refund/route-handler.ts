import type { Payload } from 'payload'

import { hasOwnerRole } from '../../access/roles'
import { resolveClientIp } from '../audit'
import { BarionApiError } from '../barion'
import { logger } from '../logger'
import { checkRateLimit, getNamedRateLimiter, type RateLimiter } from '../rate-limit'
import { generateRequestId, getRequestId } from '../request-id'
import { RefundError, refundOrder, type RefundOrderInput } from './refund-order'

/**
 * POST /api/admin/orders/[orderNumber]/refund route-handler factory.
 *
 * A függőségek (Payload-példány) injektálva vannak, így a handler maga is
 * egységtesztelhető; a tényleges route az
 * src/app/(frontend)/api/admin/orders/[orderNumber]/refund/route.ts köti be a
 * valódi configgal (src/lib/stream/route-handler.ts és a checkout mintája).
 *
 * RBAC-szerződés (owner-only pénzügyi művelet):
 * - anon hívó → 401,
 * - staff (és minden nem-owner) → 403,
 * - kizárólag owner szerepkör hajthatja végre a visszatérítést. A meglévő
 *   hasOwnerRole predikátumot hívja (src/access/roles.ts) — RBAC-függvényt
 *   nem ír át.
 *
 * Válasz-szerződés:
 * - 200: { orderNumber, type: 'full' | 'partial', amountHuf, transactionId,
 *   refundedTransactionStatus, totalRefundedHuf, orderStatus }
 * - 400: érvénytelen összeg (0 < x ≤ visszatéríthető maradék szabály sérül)
 * - 401/403: RBAC (fent)
 * - 404: ismeretlen rendelésszám
 * - 409: nem paid státusz (magyar üzenettel) / dupla refund
 * - 502/504: Barion-hiba (kind szerint) — a rendelés ilyenkor érintetlen,
 *   a hiba naplózva requestId-vel.
 */
export interface RefundHandlerDeps {
  getPayload: () => Promise<Payload>
  /** Rate-limiter injektálható (teszt); alapból a megosztott refund singleton. */
  rateLimiter?: RateLimiter
}

/** Next 15 route-context (async params). */
export interface RefundRouteContext {
  params: Promise<{ orderNumber: string }>
}

/** BarionApiError → HTTP-státusz + magyar felhasználói üzenet. */
function mapBarionError(error: BarionApiError): { status: number; message: string } {
  if (error.kind === 'timeout') {
    return {
      status: 504,
      message: 'A Barion nem válaszolt időben a visszatérítésre. A rendelés nem változott — kérjük, próbáld újra.',
    }
  }
  return {
    status: 502,
    message:
      'A visszatérítés a Barion felé jelenleg nem sikerült. A rendelés nem változott — kérjük, próbáld újra később.',
  }
}

export function createRefundHandler(
  deps: RefundHandlerDeps,
): (request: Request, context: RefundRouteContext) => Promise<Response> {
  const rateLimiter = deps.rateLimiter ?? getNamedRateLimiter('refund')

  return async function POST(request: Request, context: RefundRouteContext): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'admin-order-refund' })

    try {
      const payload = await deps.getPayload()

      // RBAC: anon → 401; nem owner (staff is) → 403; csak owner mehet tovább.
      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return Response.json(
          { error: 'A visszatérítés indításához bejelentkezés szükséges.' },
          { status: 401 },
        )
      }
      if (!hasOwnerRole(user)) {
        log.warn('refund: jogosulatlan kísérlet (nem owner szerepkör)', {
          userId: user.id,
          role: user.role ?? null,
        })
        return Response.json(
          { error: 'A visszatérítés kizárólag owner szerepkörrel indítható.' },
          { status: 403 },
        )
      }

      // RATE-LIMIT (per-owner, 10/perc) — a refund Barion-hívást és pénzügyi
      // állapotátmenetet indít; a kézi admintempó jóval a limit alatt van.
      const limited = checkRateLimit({ limiter: rateLimiter, key: `owner:${user.id}`, log })
      if (limited) {
        return limited
      }

      const { orderNumber } = await context.params
      if (!orderNumber || orderNumber.trim().length === 0) {
        return Response.json({ error: 'Hiányzó rendelésszám.' }, { status: 400 })
      }

      let body: unknown = {}
      // A content-length fejléc hiányozhat (chunked átvitel, illetve a tesztekben
      // konstruált Requesteknél az undici nem tölti ki) — a törzs beolvasása ezért
      // NEM függhet a fejléctől: üres törzs = üres input, nem-JSON = 400.
      const rawBody = await request.text()
      if (rawBody.trim().length > 0) {
        try {
          body = JSON.parse(rawBody)
        } catch {
          return Response.json(
            { error: 'Érvénytelen kérés: a törzsnek JSON-nak kell lennie.' },
            { status: 400 },
          )
        }
      }

      const result = await refundOrder({
        payload,
        orderNumber,
        input: (body ?? {}) as RefundOrderInput,
        actor: user,
        headers: request.headers,
        ipAddress: resolveClientIp(request.headers),
        logger: log,
      })

      return Response.json(result, { status: 200 })
    } catch (error) {
      if (error instanceof RefundError) {
        log.warn('refund: üzleti hiba', { status: error.status, error: error.message })
        return Response.json({ error: error.message }, { status: error.status })
      }
      if (error instanceof BarionApiError) {
        const mapped = mapBarionError(error)
        log.error('refund: Barion-hiba — a rendelés változatlan maradt', {
          kind: error.kind,
          httpStatus: error.httpStatus ?? null,
          endpoint: error.endpoint,
          error: error.message,
        })
        return Response.json({ error: mapped.message }, { status: mapped.status })
      }
      log.error('refund: váratlan technikai hiba', {
        error: error instanceof Error ? error.message : String(error),
      })
      return Response.json(
        { error: 'Váratlan hiba történt a visszatérítés közben. Kérjük, próbáld újra később.' },
        { status: 500 },
      )
    }
  }
}
