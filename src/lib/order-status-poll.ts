/**
 * Order-status poll — a köszönőoldal rendelés-státusz lekérdezése.
 *
 * API-szerződés (a W3-ban létrehozott végpont): GET /api/orders/[orderNumber]/status
 * - 200 { status, productId } — a rendelés aktuális állapota (created/
 *   payment_pending/paid/payment_failed/cancelled/refunded) és az első tétel
 *   termék-id-je (null, ha nem feloldható — a „Újrapróbálom" linkhez);
 * - 401 (nincs bejelentkezés), 404 (nem a saját/nem létezik), 400, 500.
 */

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'payment_failed'
  | 'cancelled'
  | 'refunded'

export type PollResult =
  | { kind: 'status'; status: OrderStatus; productId: number | null }
  | { kind: 'unauthorized' }
  | { kind: 'not-found' }
  | { kind: 'error' }

export async function pollOrderStatus(
  orderNumber: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PollResult> {
  try {
    const response = await fetchImpl(
      `/api/orders/${encodeURIComponent(orderNumber)}/status`,
      { credentials: 'include' },
    )
    if (response.status === 401) {
      return { kind: 'unauthorized' }
    }
    if (response.status === 404) {
      return { kind: 'not-found' }
    }
    if (!response.ok) {
      return { kind: 'error' }
    }
    const body = (await response.json()) as { status?: string; productId?: unknown }
    if (typeof body.status !== 'string') {
      return { kind: 'error' }
    }
    const productId =
      typeof body.productId === 'number' && Number.isInteger(body.productId) && body.productId > 0
        ? body.productId
        : null
    return { kind: 'status', status: body.status as OrderStatus, productId }
  } catch {
    return { kind: 'error' }
  }
}
