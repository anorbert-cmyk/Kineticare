import type { JobsConfig } from 'payload'

import { webhookRetryTask } from './tasks/webhook-retry'
import { WEBHOOK_RETRY_QUEUE } from './queues'

/**
 * Payload jobs-konfig (T-014).
 *
 * A workerek az ENABLE_JOB_WORKERS env ("true") mögött indulnak: dev-ben
 * alapértelmezés szerint KI vannak kapcsolva (nincs autoRun cron), staging/prod
 * környezetben "true" értékkel a webhook-retry percenként lefut. A taskok
 * konfigja ettől függetlenül be van kötve, így manuálisan (admin UI / local
 * API) bármikor lehet jobot sorba állítani és futtatni.
 */

function jobWorkersEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_JOB_WORKERS === 'true'
}

export const jobsConfig: JobsConfig = {
  tasks: [webhookRetryTask],
  ...(jobWorkersEnabled()
    ? {
        autoRun: [
          {
            cron: '* * * * *',
            limit: 25,
            queue: WEBHOOK_RETRY_QUEUE,
          },
        ],
      }
    : {}),
}

export { WEBHOOK_RETRY_QUEUE } from './queues'
export { webhookRetryTask } from './tasks/webhook-retry'
