import type { JobsConfig } from 'payload'

import { invoiceIssueTask } from './tasks/invoice-issue'
import { orderPollTask } from './tasks/order-poll'
import { webhookRetryTask } from './tasks/webhook-retry'
import { ORDER_MAINTENANCE_QUEUE, WEBHOOK_RETRY_QUEUE } from './queues'

/**
 * Payload jobs-konfig (T-014, W4-bővítés).
 *
 * Taskok:
 * - webhook-retry (webhook-maintenance queue): elhasalt webhook-események
 *   újrafuttatása exponenciális backoff-fal.
 * - order-poll (order-maintenance queue): payment_pending-ben ragadt rendelések
 *   utánpollolása a Barion v4-gyel + számla-resweep (W4-02).
 * - invoice-issue (order-maintenance queue): Számlázz.hu számlakiállítás egy
 *   rendeléshez, saját retry-val (T-024/W4-01).
 *
 * A workerek az ENABLE_JOB_WORKERS env ("true") mögött indulnak: dev-ben
 * alapértelmezés szerint KI vannak kapcsolva (nincs autoRun cron), staging/prod
 * környezetben "true" értékkel a webhook-retry percenként, az order-poll
 * 5 percenként lefut. A taskok konfigja ettől függetlenül be van kötve, így
 * manuálisan (admin UI / local API) bármikor lehet jobot sorba állítani.
 */

function jobWorkersEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_JOB_WORKERS === 'true'
}

export const jobsConfig: JobsConfig = {
  tasks: [webhookRetryTask, orderPollTask, invoiceIssueTask],
  ...(jobWorkersEnabled()
    ? {
        autoRun: [
          {
            cron: '* * * * *',
            limit: 25,
            queue: WEBHOOK_RETRY_QUEUE,
          },
          {
            cron: '*/5 * * * *',
            limit: 25,
            queue: ORDER_MAINTENANCE_QUEUE,
          },
        ],
      }
    : {}),
}

export { ORDER_MAINTENANCE_QUEUE, WEBHOOK_RETRY_QUEUE } from './queues'
export { webhookRetryTask } from './tasks/webhook-retry'
export { orderPollTask } from './tasks/order-poll'
export { invoiceIssueTask } from './tasks/invoice-issue'
