import { barionGet, getBarionConfig, type BarionClientConfig } from './client'
import type { BarionPaymentStateResponse } from './types'

/**
 * Fizetésállapot-lekérdezés V4 — GET /v4/Payment/{PaymentId}/PaymentState.
 *
 * A régi, v2-es állapotlekérdező eljárás a Barionban deprecated, ezért a
 * modulban kizárólag a v4-es útvonal létezik (a Barion-callback-vezérelt
 * állapotgép is ezt fogja hívni a jóváhagyáskor — külön ticket).
 *
 * A hívás GET, a POSKey az x-pos-key headerben utazik (lásd client.ts).
 */

/**
 * Rendelés-oldali fizetési állapot — a későbbi Barion-callback-vezérelt
 * állapotgép ezekre az értékekre képezi le a Barion-státuszokat.
 */
export type OrderPaymentState = 'paid' | 'cancelled' | 'payment_pending'

/**
 * Barion paymentStatus → rendelés-oldali állapot leképezés.
 *
 * Szabály (a ticket által rögzített 5 ág):
 * - Succeeded → paid
 * - Canceled → cancelled
 * - Expired → cancelled
 * - Prepared / Started → payment_pending
 *
 * Minden más (InProgress, Waiting, Reserved, Authorized, Failed,
 * PartiallySucceeded, ismeretlen/jövőbeli státusz) szintén payment_pending:
 * konzervatív default — ismeretlen státuszra sosem jelölünk paid-et, a
 * callback-vezérelt állapotgép újrapollolhatja.
 */
export function mapBarionPaymentStatus(status: string): OrderPaymentState {
  switch (status) {
    case 'Succeeded':
      return 'paid'
    case 'Canceled':
    case 'Expired':
      return 'cancelled'
    case 'Prepared':
    case 'Started':
      return 'payment_pending'
    default:
      return 'payment_pending'
  }
}

/**
 * A fizetés aktuális állapotának lekérdezése a Bariontól (v4).
 * A válasz Transactions tömbje tartalmazza a tranzakciószintű TransactionId-kat
 * (ezek kellenek pl. a tranzakció-szintű refundhoz — lásd refund.ts).
 */
export async function fetchPaymentState(
  paymentId: string,
  config?: BarionClientConfig,
): Promise<BarionPaymentStateResponse> {
  const resolvedConfig = config ?? getBarionConfig()
  return barionGet<BarionPaymentStateResponse>(
    `/v4/Payment/${encodeURIComponent(paymentId)}/PaymentState`,
    resolvedConfig,
  )
}
