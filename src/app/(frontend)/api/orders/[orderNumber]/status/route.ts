import { getPayload } from 'payload'

import { createOrderStatusHandler } from '@/lib/checkout/order-status-handler'
import config from '@payload-config'

/**
 * GET /api/orders/[orderNumber]/status — a köszönőoldal rendelés-státusz
 * pollja (T-022 callback utáni visszaigazolás).
 *
 * A handler a src/lib/checkout/order-status-handler.ts-ben él (függőség-
 * injekcióval); itt csak a valódi config bekötése történik.
 */
export const GET = createOrderStatusHandler({
  getPayload: () => getPayload({ config }),
})
