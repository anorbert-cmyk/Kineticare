import type { TaskConfig } from 'payload'

import {
  getWebhookProcessor,
  isRetryDue,
  MAX_WEBHOOK_ATTEMPTS,
  processWebhook,
  webhookEventStore,
} from '../../lib/idempotency'
import { logger } from '../../lib/logger'
import { WEBHOOK_RETRY_CRON, WEBHOOK_RETRY_QUEUE } from '../queues'
import { createStaleAwareBeforeSchedule } from '../schedule-guard'

/**
 * webhook-retry task (T-014): a feldolgozatlan (received) és elhasalt (failed)
 * webhook-events rekordok újrafuttatása.
 *
 * - Csak regisztrált feldolgozóval (registerWebhookProcessor) rendelkező
 *   providerek eseményei futnak újra — a többi (még nem bekötött provider)
 *   érintetlen marad.
 * - Exponenciális backoff: a retryDelayMs szerinti várakozás letelte előtt az
 *   esemény kimarad (isRetryDue).
 * - KIMERÜLÉS (attempts >= MAX_WEBHOOK_ATTEMPTS): az esemény failed marad, és a
 *   riasztás A KIMERÜLÉS PILLANATÁBAN megy (az utolsó kísérlet failed+
 *   retryable:false kimenetelénél, error-szintű owner-jelzés).
 *
 * ABLAK-VÉDELEM (K3): a scan-szűrő KIZÁRI a kimerült rekordokat
 * (`attempts < MAX`). Ez azért kell, mert a 25-ös, legrégebbit-előnyben-
 * részesítő (`updatedAt` növekvő) ablakot a kimerült sorok véglegesen
 * eltömhetnék — az updatedAt-jük befagy, mindig az ablak elején maradnának, és
 * az ÚJ failed események sosem kerülnének sorra. A kimerülés ettől még nem
 * néma: a riasztás a kimerülés pillanatában kimegy (fent), a rekord pedig
 * failed státusszal, attempts=MAX-szal lekérdezhető marad.
 *
 * ÜTEMEZÉS (schedule): ez az egyetlen dolog, ami ezt a jobot valaha SORBA
 * ÁLLÍTJA — a kódban semmi nem hívja rá a `payload.jobs.queue`-t, az `autoRun`
 * pedig a Payload saját dokumentációja szerint csak a MÁR SORBAN ÁLLÓ jobokat
 * futtatja. Enélkül az elhasalt webhook-események sosem próbálódnak újra. A
 * cron és a queue az autoRun-nal KÖZÖS konstansból jön (../queues), mert a
 * `handleSchedules` csak azonos queue-név mellett fut le rá.
 *
 * A `beforeSchedule` hook a Payload alapértelmezett duplikátum-védelmét váltja
 * ki: az alapértelmezés egyetlen beragadt (`processing: true`) sortól VÉGLEGESEN
 * és NÉMÁN kikapcsolna — lásd ../schedule-guard.ts.
 */
const RETRY_BATCH_SIZE = 25

/** A task input/outputja (a TypedJobs a payload-types frissüléséig nem ismeri). */
interface WebhookRetryJobIO {
  input: Record<string, never>
  output: {
    scanned: number
    retried: number
    succeeded: number
    failed: number
    skipped: number
    exhausted: number
  }
}

export const webhookRetryTask: TaskConfig<WebhookRetryJobIO> = {
  slug: 'webhook-retry',
  // Job-szintű újrapróbálás: ha maga a task is elhasal (pl. DB-kimaradás),
  // a queue még egyszer megpróbálja, utána failed job + log.
  retries: 1,
  schedule: [
    {
      cron: WEBHOOK_RETRY_CRON,
      queue: WEBHOOK_RETRY_QUEUE,
      hooks: { beforeSchedule: createStaleAwareBeforeSchedule({ taskSlug: 'webhook-retry' }) },
    },
  ],
  outputSchema: [
    { name: 'scanned', type: 'number', required: true },
    { name: 'retried', type: 'number', required: true },
    { name: 'succeeded', type: 'number', required: true },
    { name: 'failed', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
    { name: 'exhausted', type: 'number', required: true },
  ],
  handler: async ({ req }) => {
    const store = webhookEventStore(req.payload)
    const nowMs = Date.now()

    const candidates = await store.find({
      collection: 'webhook-events',
      where: {
        and: [
          { status: { in: ['received', 'failed'] } },
          // K3 ablak-védelem: a kimerült (attempts >= MAX) rekordok KIZÁRVA —
          // különben a legrégebbit-előnyben-részesítő, 25-ös ablakot véglegesen
          // eltömik (az updatedAt-jük befagy), és az új failed események sosem
          // kerülnének sorra. A hiányzó attempts (régi/NULL sor) újrapróbálható,
          // azt az isRetryDue úgyis 0-ként kezeli.
          {
            or: [
              { attempts: { less_than: MAX_WEBHOOK_ATTEMPTS } },
              { attempts: { exists: false } },
            ],
          },
        ],
      },
      sort: 'updatedAt',
      limit: RETRY_BATCH_SIZE,
      overrideAccess: true,
    })

    let retried = 0
    let succeeded = 0
    let failed = 0
    let skipped = 0
    let exhausted = 0

    for (const event of candidates.docs) {
      const processor = getWebhookProcessor(event.provider)
      if (!processor) {
        skipped += 1
        continue
      }
      if (!isRetryDue(event, nowMs)) {
        skipped += 1
        continue
      }

      retried += 1
      const outcome = await processWebhook({
        store,
        provider: event.provider,
        externalId: event.externalId,
        handler: processor,
      })
      if (outcome.kind === 'processed' || outcome.kind === 'already-processed') {
        succeeded += 1
      } else if (outcome.kind === 'failed') {
        if (!outcome.retryable) {
          // A kimerülés PILLANATA: ez volt az utolsó megengedett kísérlet — a
          // scan-szűrő (K3) többé nem adja vissza ezt a rekordot, tehát az
          // owner-riasztás ITT, egyszer, error-szinten megy ki.
          exhausted += 1
          failed += 1
          logger.error('webhook-esemény újrapróbálásai kimerültek — owner beavatkozás szükséges', {
            provider: event.provider,
            externalId: event.externalId,
            eventId: event.id,
            attempts: outcome.attempts,
            error: outcome.error,
          })
        } else {
          failed += 1
          logger.warn('webhook-esemény újrapróbálása sikertelen', {
            provider: event.provider,
            externalId: event.externalId,
            eventId: event.id,
            attempts: outcome.attempts,
            retryable: outcome.retryable,
            error: outcome.error,
          })
        }
      }
    }

    logger.info('webhook-retry task lefutott', {
      queue: WEBHOOK_RETRY_QUEUE,
      scanned: candidates.docs.length,
      retried,
      succeeded,
      failed,
      skipped,
      exhausted,
    })

    return {
      output: {
        scanned: candidates.docs.length,
        retried,
        succeeded,
        failed,
        skipped,
        exhausted,
      },
    }
  },
}
