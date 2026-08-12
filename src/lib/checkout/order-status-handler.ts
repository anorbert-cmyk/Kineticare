import { type NextRequest, NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'

/**
 * GET /api/orders/[orderNumber]/status — read-only rendelés-státusz (a
 * köszönőoldal polljához, T-022 callback utáni visszaigazolás).
 *
 * Szabályok (kötöttek):
 * - bejelentkezés kötelező (payload.auth); anon → 401;
 * - CSAK a saját rendelés: a lekérdezés customer=user.id szűrővel történik —
 *   más orderNumber esetén 404 (ne szivárogjon ki, létezik-e a rendelés);
 * - CSAK a { status, productId } mezők — a productId az ELSŐ tétel termék-id-je
 *   (null, ha nem feloldható): a köszönőoldal „Újrapróbálom" gombja ezzel tud
 *   a /penztar?termek={id} útvonalra mutatni. Nem érzékeny adat: a vásárló a
 *   SAJÁT rendelésének a termékét látja, amit a fiókja amúgy is megjelenít.
 *   Egyéb rendelésadat (customer, összegek, tételek) továbbra sem megy ki.
 */
export interface OrderStatusHandlerDeps {
  getPayload: () => Promise<Payload>
}

export function createOrderStatusHandler(
  deps: OrderStatusHandlerDeps,
): (request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) => Promise<NextResponse> {
  return async function GET(
    request: NextRequest,
    context: { params: Promise<{ orderNumber: string }> },
  ): Promise<NextResponse> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'order-status' })

    try {
      const payload = await deps.getPayload()

      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return NextResponse.json(
          { error: 'A rendelés állapotának lekérdezéséhez bejelentkezés szükséges.' },
          { status: 401 },
        )
      }

      const { orderNumber } = await context.params
      if (typeof orderNumber !== 'string' || orderNumber.trim().length === 0) {
        return NextResponse.json({ error: 'Hiányzó rendelésszám.' }, { status: 400 })
      }

      const { docs } = await payload.find({
        collection: 'orders',
        where: {
          and: [
            { orderNumber: { equals: orderNumber.trim() } },
            { customer: { equals: user.id } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      const order = docs[0]
      if (!order) {
        // 404 — nem áruljuk el, hogy a rendelés létezik-e máshol.
        return NextResponse.json({ error: 'A rendelés nem található.' }, { status: 404 })
      }

      // Az Újrapróbálom-útvonalhoz: az első tétel termék-id-je (a relationship
      // nyers id vagy populate-olt dokumentum lehet; feloldhatatlanul null).
      const firstProduct = Array.isArray(order.items) ? order.items[0]?.product : undefined
      const productId =
        typeof firstProduct === 'number'
          ? firstProduct
          : typeof firstProduct === 'object' && firstProduct !== null
            ? firstProduct.id
            : null

      return NextResponse.json({ status: order.status, productId }, { status: 200 })
    } catch (error) {
      log.error('order-status: váratlan technikai hiba', {
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        { error: 'Váratlan hiba történt. Kérjük, próbáld újra később.' },
        { status: 500 },
      )
    }
  }
}
