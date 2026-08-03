import type { TaskConfig } from 'payload'

import { pollPendingOrders } from '../../lib/order-poll/service'
import { logger } from '../../lib/logger'

/**
 * order-poll task (W4-02): a payment_pending-ben ragadt rendelések
 * utánpollolása (a callback-másodvonal) + a kimaradt számlakiállítások
 * resweep-je. Az üzleti logika az src/lib/order-poll/service.ts-ben él,
 * egységtesztelhetően; a task csak vékony bekötés.
 *
 * Job-szintű retry: 1 — ha maga a futás is elhasal (pl. DB-kimaradás), a
 * queue még egyszer megpróbálja; egyébként a következő cron-futás úgyis jön.
 */

interface OrderPollJobIO {
  input: Record<string, never>
  output: {
    scanned: number
    transitionedPaid: number
    cancelled: number
    stillPending: number
    skipped: number
    failed: number
    orphaned: number
    invoiceRequeued: number
  }
}

export const orderPollTask: TaskConfig<OrderPollJobIO> = {
  slug: 'order-poll',
  retries: 1,
  outputSchema: [
    { name: 'scanned', type: 'number', required: true },
    { name: 'transitionedPaid', type: 'number', required: true },
    { name: 'cancelled', type: 'number', required: true },
    { name: 'stillPending', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
    { name: 'failed', type: 'number', required: true },
    { name: 'orphaned', type: 'number', required: true },
    { name: 'invoiceRequeued', type: 'number', required: true },
  ],
  handler: async ({ req }) => {
    const summary = await pollPendingOrders({ payload: req.payload })
    logger.info('order-poll task lefutott', { ...summary })
    return { output: { ...summary } }
  },
}
