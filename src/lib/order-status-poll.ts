/**
 * Order-status poll — a köszönőoldal rendelés-státusz lekérdezése.
 *
 * API-szerződés (a W3-ban létrehozott végpont): GET /api/orders/[orderNumber]/status
 * - 200 { status } — a rendelés aktuális állapota (created/payment_pending/paid/
 *   payment_failed/cancelled/refunded);
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
  | { kind: 'status'; status: OrderStatus }
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
    const body = (await response.json()) as { status?: string }
    if (typeof body.status !== 'string') {
      return { kind: 'error' }
    }
    return { kind: 'status', status: body.status as OrderStatus }
  } catch {
    return { kind: 'error' }
  }
}
