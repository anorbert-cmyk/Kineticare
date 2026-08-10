import type { TaskConfig } from 'payload'

import { pollPendingOrders } from '../../lib/order-poll/service'
import { logger } from '../../lib/logger'
import { ORDER_MAINTENANCE_CRON, ORDER_MAINTENANCE_QUEUE } from '../queues'

/**
 * order-poll task (W4-02): a payment_pending-ben ragadt rendelések
 * utánpollolása (a callback-másodvonal) + a kimaradt számlakiállítások
 * resweep-je. Az üzleti logika az src/lib/order-poll/service.ts-ben él,
 * egységtesztelhetően; a task csak vékony bekötés.
 *
 * Job-szintű retry: 1 — ha maga a futás is elhasal (pl. DB-kimaradás), a
 * queue még egyszer megpróbálja; egyébként a következő cron-futás úgyis jön.
 *
 * ÜTEMEZÉS (schedule): ez az egyetlen dolog, ami ezt a jobot valaha SORBA
 * ÁLLÍTJA — a kódban semmi nem hívja rá a `payload.jobs.queue`-t, az
 * `autoRun` pedig a Payload saját dokumentációja szerint csak a MÁR SORBAN
 * ÁLLÓ jobokat futtatja. Enélkül az elveszett Barion-callback sosem pótlódik:
 * a fizető vevő rendelése örökre payment_pending marad (pénz levonva, kurzus
 * nincs). A cron és a queue az autoRun-nal KÖZÖS konstansból jön (../queues),
 * mert a `handleSchedules` csak azonos queue-név mellett fut le rá.
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
  schedule: [
    {
      cron: ORDER_MAINTENANCE_CRON,
      queue: ORDER_MAINTENANCE_QUEUE,
    },
  ],
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
