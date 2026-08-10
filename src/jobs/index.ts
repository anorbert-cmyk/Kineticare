import type { JobsConfig } from 'payload'

import { correctiveInvoiceIssueTask } from './tasks/corrective-invoice-issue'
import { invoiceIssueTask } from './tasks/invoice-issue'
import { orderPollTask } from './tasks/order-poll'
import { stornoIssueTask } from './tasks/storno-issue'
import { webhookRetryTask } from './tasks/webhook-retry'
import {
  ORDER_MAINTENANCE_CRON,
  ORDER_MAINTENANCE_QUEUE,
  WEBHOOK_RETRY_CRON,
  WEBHOOK_RETRY_QUEUE,
} from './queues'

/**
 * Payload jobs-konfig (T-014, W4-bővítés).
 *
 * Taskok:
 * - webhook-retry (webhook-maintenance queue): elhasalt webhook-események
 *   újrafuttatása exponenciális backoff-fal. ÜTEMEZETT (schedule).
 * - order-poll (order-maintenance queue): payment_pending-ben ragadt rendelések
 *   utánpollolása a Barion v4-gyel + számla-resweep (W4-02). ÜTEMEZETT (schedule).
 * - invoice-issue (order-maintenance queue): Számlázz.hu számlakiállítás egy
 *   rendeléshez, saját retry-val (T-024/W4-01). ESEMÉNY-vezérelt.
 * - storno-issue (order-maintenance queue): stornó-számla kiállítása teljes
 *   visszatérítéshez, saját retry-val (C4). ESEMÉNY-vezérelt.
 * - corrective-invoice-issue (order-maintenance queue): helyesbítő számla
 *   kiállítása részleges visszatérítéshez, saját retry-val (C5). ESEMÉNY-vezérelt.
 *
 * ÜTEMEZETT vs. ESEMÉNY-vezérelt — a KRITIKUS különbség. Az `autoRun` ÖNMAGÁBAN
 * nem elég: a Payload saját típusdokumentációja szerint (JobsConfig.autoRun,
 * payload/dist/queues/config/types/index.d.ts) az autoRun „does not _queue_ new
 * jobs - only _runs_ jobs that are already in the specified queue". Az
 * esemény-vezérelt taskokat a kód állítja sorba (`payload.jobs.queue`, lásd
 * src/lib/order-paid.ts és src/lib/szamlazz/queue.ts), a periodikus taskokat
 * viszont SENKI — ezekhez a `TaskConfig.schedule` mező kell. Ha bármelyik
 * tasknak van `schedule`-je, a szanitizálás `config.jobs.scheduling`-et true-ra
 * állítja (payload/dist/config/sanitize.js), és az autoRun-cron minden tickjén
 * lefut a `handleSchedules`, ami ténylegesen SORBA ÁLLÍTJA a jobot.
 *
 * Ez a hiba élesben azt jelentette, hogy a fizető vevő elveszett Barion-
 * callbackje SOSEM pótlódott (a rendelés örökre payment_pending maradt), és az
 * elhasalt webhook-események sem próbálódtak újra. A regressziót az
 * src/__tests__/jobs/scheduling.test.ts őrzi.
 *
 * SÉMA-VONZAT (üzemeltetési tudnivaló). A `scheduling` bekapcsolása a Payload
 * oldalán KÉT sémaelemet is behoz — mindkettőt a Payload generálja, nem mi:
 * - `payload-jobs-stats` GLOBAL (payload/dist/queues/config/global.js): ebben
 *   tárolódik queue-nként és taskonként a `lastScheduledRun`, ebből számol a
 *   `handleSchedules` következő futásidőt;
 * - `meta` (json) mező a `payload-jobs` collectionön
 *   (payload/dist/queues/config/collection.js, `if (jobsConfig.stats)`): ide
 *   kerül a `scheduled: true` jelölés, erre épül a duplikátum-védelem.
 * Postgresen ez egy új tábla + egy új oszlop, tehát MIGRÁCIÓ szükséges — a
 * Payload migrációs eszközével generálva (CLAUDE.md 3. tilos zóna). A deploy
 * `npx payload migrate && npm start` sorrendje miatt a migrációnak ugyanabban
 * a változáskörben kell mennie, mint ennek a confignak.
 *
 * A workerek az ENABLE_JOB_WORKERS env ("true") mögött indulnak: dev-ben
 * alapértelmezés szerint KI vannak kapcsolva (nincs autoRun cron), staging/prod
 * környezetben "true" értékkel a webhook-retry percenként, az order-poll
 * 5 percenként lefut. A taskok konfigja ettől függetlenül be van kötve, így
 * manuálisan (admin UI / local API) bármikor lehet jobot sorba állítani.
 *
 * FIGYELEM: autoRun NÉLKÜL a `schedule` sem ér semmit — a `handleSchedules`-t
 * kizárólag az autoRun-cron tickje hívja meg. A két beállítás PÁRBAN érvényes.
 */

function jobWorkersEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.ENABLE_JOB_WORKERS === 'true'
}

/**
 * A jobs-konfig felépítése az env függvényében. Tiszta függvény, hogy a
 * teszt a bekapcsolt worker-ág (autoRun) és a task-schedule-ök EGYÜTTES
 * helyességét is ellenőrizni tudja — az `ENABLE_JOB_WORKERS` a tesztfutásban
 * nincs beállítva, tehát a modul-szintű `jobsConfig` autoRun nélkül épül fel.
 */
export function buildJobsConfig(env: NodeJS.ProcessEnv = process.env): JobsConfig {
  return {
    tasks: [
      webhookRetryTask,
      orderPollTask,
      invoiceIssueTask,
      stornoIssueTask,
      correctiveInvoiceIssueTask,
    ],
    ...(jobWorkersEnabled(env)
      ? {
          autoRun: [
            {
              cron: WEBHOOK_RETRY_CRON,
              limit: 25,
              queue: WEBHOOK_RETRY_QUEUE,
            },
            {
              cron: ORDER_MAINTENANCE_CRON,
              limit: 25,
              queue: ORDER_MAINTENANCE_QUEUE,
            },
          ],
        }
      : {}),
  }
}

export const jobsConfig: JobsConfig = buildJobsConfig()

export {
  ORDER_MAINTENANCE_CRON,
  ORDER_MAINTENANCE_QUEUE,
  WEBHOOK_RETRY_CRON,
  WEBHOOK_RETRY_QUEUE,
} from './queues'
export { webhookRetryTask } from './tasks/webhook-retry'
export { orderPollTask } from './tasks/order-poll'
export { invoiceIssueTask } from './tasks/invoice-issue'
export { stornoIssueTask } from './tasks/storno-issue'
export { correctiveInvoiceIssueTask } from './tasks/corrective-invoice-issue'
