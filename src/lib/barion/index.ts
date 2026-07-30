/**
 * Barion Smart Gateway kliensmodul — nyilvános belépési pont.
 *
 * Saját, vékony, fetch-re épülő wrapper (külső fizetési npm-csomag nélkül),
 * mert a létező könyvtárak (pl. node-barion) elavult, v2-es állapotlekérdező
 * API-t használnak. Verziók: Payment/Start v2, fizetésállapot v4, Refund v2.
 *
 * Ebben a ticketben a modul tiszta, hívható lib: nincs API-route, nincs
 * plugin-adapter, nincs webhook-handler — ezek külön ticketben kötődnek be.
 */

export {
  BARION_DEFAULT_TIMEOUT_MS,
  barionGet,
  barionPost,
  getBarionConfig,
  type BarionClientConfig,
  type BarionEnvironment,
} from './client'
export {
  BARION_DEFAULT_PAYMENT_WINDOW,
  buildPaymentStartRequest,
  startPayment,
  type StartPaymentItemInput,
  type StartPaymentParams,
  type StartPaymentRecurringInput,
  type StartPaymentTransactionInput,
} from './start'
export {
  fetchPaymentState,
  mapBarionPaymentStatus,
  type OrderPaymentState,
} from './state'
export {
  buildRefundRequest,
  refundPayment,
  type RefundPaymentParams,
  type RefundTransactionInput,
} from './refund'
export {
  BarionApiError,
  type BarionDetailedTransaction,
  type BarionError,
  type BarionErrorKind,
  type BarionItem,
  type BarionPaymentStartRequest,
  type BarionPaymentStartResponse,
  type BarionPaymentStateResponse,
  type BarionPaymentStatus,
  type BarionPaymentTransaction,
  type BarionProcessedTransaction,
  type BarionRefundRequest,
  type BarionRefundResponse,
  type BarionRefundedTransaction,
  type BarionTransactionToRefund,
} from './types'
