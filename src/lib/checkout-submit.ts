/**
 * Checkout-submit — a /penztar beküldése a T-021 checkout-start végpontra.
 *
 * API-szerződés (T-021): POST /api/checkout/start
 * - Törzs: { productId, quantity?, consentWithdrawalWaiver: true }
 * - A kliens SOSEM küld árat — a végösszeg a szerver (T-021) számolja.
 * - Sikeres válasz: { orderNumber, gatewayUrl } → redirect a Barion fizetőfelületre.
 * - Hibák: 401 (nincs bejelentkezés), 400 (validáció/waiver/archived/draft),
 *   404 (termék), 409 (duplavásárlás), 502 (Barion-hiba), 500 (általános).
 */

export interface CheckoutProduct {
  id: number
  sku: string
  priceHuf: number | null
  isFree: boolean
}

export interface CheckoutUser {
  name: string | null
  email: string | null
  billingName?: string | null
  billingZip?: string | null
  billingCity?: string | null
  billingStreet?: string | null
  taxNumber?: string | null
}

export interface CheckoutSubmitInput {
  productId: number
  quantity: number
  consentWithdrawalWaiver: boolean
}

export type CheckoutSubmitResult =
  | { ok: true; orderNumber: string; gatewayUrl: string }
  | { ok: false; message: string }

/** Általános, felhasználóbarát hibaüzenet — a szerver-válasz felülírhatja. */
export const GENERIC_CHECKOUT_ERROR =
  'A fizetés indítása most nem sikerült. Próbáld újra néhány perc múlva, vagy írj nekünk a kapcsolatfelvételnél.'

export async function submitCheckout(
  input: CheckoutSubmitInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CheckoutSubmitResult> {
  try {
    const response = await fetchImpl('/api/checkout/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    })

    if (!response.ok) {
      let message = GENERIC_CHECKOUT_ERROR
      try {
        const body = (await response.json()) as { error?: string }
        if (typeof body.error === 'string' && body.error.length > 0) {
          message = body.error
        }
      } catch {
        // Nem JSON-válasz — marad az általános üzenet.
      }
      return { ok: false, message }
    }

    const body = (await response.json()) as { orderNumber?: string; gatewayUrl?: string }
    if (typeof body.orderNumber !== 'string' || typeof body.gatewayUrl !== 'string') {
      return { ok: false, message: GENERIC_CHECKOUT_ERROR }
    }
    return { ok: true, orderNumber: body.orderNumber, gatewayUrl: body.gatewayUrl }
  } catch {
    return { ok: false, message: GENERIC_CHECKOUT_ERROR }
  }
}
