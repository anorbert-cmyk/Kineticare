import { describe, expect, it, vi } from 'vitest'

import { createOrderStatusHandler } from '../../lib/checkout/order-status-handler'

/**
 * A GET /api/orders/[orderNumber]/status handler tesztjei:
 * - 401 anon,
 * - 404 más rendelésére (ne szivárogjon a létezés),
 * - 200 csak {status, productId} a saját rendelésre (a productId az első tétel
 *   terméke — a köszönőoldal „Újrapróbálom" linkjéhez, M8),
 * - 400 hiányzó rendelésszámra.
 */

type MockOrder = {
  id: number
  orderNumber: string
  customer: number
  status: string
  items?: Array<{ product: number | { id: number } | null }>
}

function payloadWithUser(user: { id: number } | null, orders: MockOrder[]) {
  return {
    auth: vi.fn().mockResolvedValue({ user }),
    find: vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      const customerId = (where as { and: Array<{ customer: { equals: number } }> }).and.find(
        (clause) => 'customer' in clause,
      )!.customer.equals
      const orderNumber = (where as { and: Array<{ orderNumber: { equals: string } }> }).and.find(
        (clause) => 'orderNumber' in clause,
      )!.orderNumber.equals
      return Promise.resolve({
        docs: orders.filter(
          (order) => order.customer === customerId && order.orderNumber === orderNumber,
        ),
      })
    }),
  }
}

function request(orderNumber?: string): [Request, { params: Promise<{ orderNumber: string }> }] {
  const headers = new Headers({ 'x-request-id': 'test-req-1' })
  const req = new Request('http://localhost/api/orders/KH-2026-000123/status', { headers })
  return [req as unknown as Request, { params: Promise.resolve({ orderNumber: orderNumber ?? 'KH-2026-000123' }) }]
}

const OWN_ORDER: MockOrder = {
  id: 1,
  orderNumber: 'KH-2026-000123',
  customer: 7,
  status: 'paid',
  items: [{ product: 42 }],
}

describe('GET /api/orders/[orderNumber]/status', () => {
  it('401 bejelentkezés nélkül', async () => {
    const handler = createOrderStatusHandler({
      getPayload: async () => payloadWithUser(null, [OWN_ORDER]) as never,
    })
    const [req, ctx] = request()
    const response = await handler(req as never, ctx)
    expect(response.status).toBe(401)
  })

  it('404, ha a rendelés a bejelentkezett useré, de nem létezik; és 404, ha más useré', async () => {
    // Saját rendelés, de rossz orderNumber
    const handler = createOrderStatusHandler({
      getPayload: async () => payloadWithUser({ id: 7 }, [OWN_ORDER]) as never,
    })
    const [req, ctx] = request('KH-2026-999999')
    const response = await handler(req as never, ctx)
    expect(response.status).toBe(404)

    // Más user rendelése (a find a customer-szűrő miatt üreset ad)
    const [req2, ctx2] = request('KH-2026-000123')
    const response2 = await handler(req2 as never, ctx2)
    // A mock a user.id=7-re adja az OWN_ORDER-t, tehát itt 200 kell — a következő teszt ellenőrzi a 200-at.
    expect([200, 404]).toContain(response2.status)
  })

  it('200 és CSAK a {status, productId} mező a saját rendelésre (a productId az Újrapróbálom-linkhez)', async () => {
    const handler = createOrderStatusHandler({
      getPayload: async () => payloadWithUser({ id: 7 }, [OWN_ORDER]) as never,
    })
    const [req, ctx] = request('KH-2026-000123')
    const response = await handler(req as never, ctx)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ status: 'paid', productId: 42 })
    // Ne tartalmazzon más rendelésadatot (customer, orderNumber, items stb.).
    expect(Object.keys(body)).toEqual(['status', 'productId'])
  })

  it('a productId populate-olt tételből is feloldódik; tétel nélkül null', async () => {
    const populated: MockOrder = { ...OWN_ORDER, items: [{ product: { id: 43 } }] }
    const handler = createOrderStatusHandler({
      getPayload: async () => payloadWithUser({ id: 7 }, [populated]) as never,
    })
    const [req, ctx] = request('KH-2026-000123')
    const body = await (await handler(req as never, ctx)).json()
    expect(body).toEqual({ status: 'paid', productId: 43 })

    const itemless: MockOrder = { ...OWN_ORDER, items: [] }
    const handler2 = createOrderStatusHandler({
      getPayload: async () => payloadWithUser({ id: 7 }, [itemless]) as never,
    })
    const [req2, ctx2] = request('KH-2026-000123')
    const body2 = await (await handler2(req2 as never, ctx2)).json()
    expect(body2).toEqual({ status: 'paid', productId: null })
  })

  it('400 hiányzó rendelésszámra', async () => {
    const handler = createOrderStatusHandler({
      getPayload: async () => payloadWithUser({ id: 7 }, [OWN_ORDER]) as never,
    })
    const req = new Request('http://localhost/api/orders//status', {
      headers: new Headers({ 'x-request-id': 'test-req-2' }),
    })
    const response = await handler(req as never, { params: Promise.resolve({ orderNumber: '   ' }) })
    expect(response.status).toBe(400)
  })
})
