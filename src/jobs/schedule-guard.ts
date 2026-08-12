import type { PayloadRequest, TaskConfig, Where } from 'payload'

import { withAdvisoryLock } from '../lib/advisory-lock'
import { logger as rootLogger, type Logger } from '../lib/logger'

/**
 * Beragadás-tűrő ÉS versenyhelyzet-biztos `beforeSchedule` őr a periodikus
 * taskokhoz.
 *
 * ═══ A HIBA, AMIT MEGOLD ═══
 * A Payload alapértelmezett duplikátum-védelme (`defaultBeforeSchedule` →
 * `countRunnableOrActiveJobsForQueue`) azt számolja meg, hány olyan job van a
 * queue-ban ugyanarra a taskra, amelynek NINCS `completedAt`-je és NINCS
 * `error`-ja — azaz „fut vagy futtatható" —, és csak 0 esetén enged új jobot
 * sorba állítani. Ez a szabály elvágólagos: egy ELHALT futás (a folyamatot
 * deploy/OOM/SIGKILL vitte el a `processing: true` beállítása után, mielőtt a
 * `completedAt` vagy az `error` kiíródott volna) örökre benne marad ebben a
 * halmazban. Ettől kezdve a számláló SOHA nem esik vissza 0-ra, tehát az
 * ütemezés VÉGLEGESEN és NÉMÁN kikapcsol: a cron ugyanúgy tickel, a
 * `handleSchedules` ugyanúgy lefut, csak minden körben `skipped`-et ad —
 * naplósor nélkül. Élesben ez azt jelenti, hogy az elveszett Barion-callback
 * pótlása (order-poll) és a webhook-újrapróbálás (webhook-retry) csendben
 * megszűnik, és semmi nem jelzi.
 *
 * ═══ A MÁSODIK HIBA (K4 — versenyhelyzet) ═══
 * A számolás-then-sorbaállítás NEM atomi: két app-példány (rolling-deploy,
 * horizontális skálázás) ugyanazon a cron-ticken MINDKETTŐ 0-t számolhat,
 * mielőtt bármelyik sorba állítana → dupla job. A versenyablak ráadásul a HOOKON
 * TÚLNYÚLIK: a `handleSchedules` a beforeSchedule visszatérése UTÁN hívja a
 * `jobs.queue`-t (payload/dist/queues/operations/handleSchedules/index.js,
 * `scheduleQueueable`), tehát a zár nem érheti el a „csak a számolást zárom"
 * megoldással.
 *
 * ═══ AMIT EHELYETT CSINÁLUNK ═══
 * A hook a számolást ÉS a sorba állítást is MAGA végzi, rendelés-független,
 * queue+task szintű Postgres advisory-zár alatt
 * (`schedule:<queue>:<taskSlug>`, src/lib/advisory-lock.ts — ugyanaz a minta,
 * mint a checkout/refund/order-transition zárak). A zár processzek között is
 * sorosít: a második példány már az ELSŐ által beszúrt jobot látja a
 * számolásnál, ezért kiszáll. Mivel mi állítottuk sorba a jobot, a Payload felé
 * MINDIG `shouldSchedule: false` megy vissza — különben a `handleSchedules`
 * még egyszer sorba állítaná. Következmények:
 *  - a `handleSchedules` visszatérésében a kör `skipped`-ként jelenik meg
 *    (kozmetika; a cron-hívó nem használja a visszatérést, és a hook a
 *    sorba állítást info-naplósorral jelzi);
 *  - a `payload-jobs-stats` global (`lastScheduledRun`) ettől rendesen frissül:
 *    a `defaultAfterSchedule` a státusztól FÜGGETLENÜL írja;
 *  - a sorba állított job sor ugyanazzal a `queue` / `waitUntil` /
 *    `meta.scheduled: true` alakkal jön létre, mintha a Payload tette volna.
 *
 * ═══ A BERAGADÁS-LOGIKA (változatlan) ═══
 * Két számlálás fut a záron belül:
 * 1. `blocking` — a „fut vagy futtatható" jobok száma (a Payload alapértelmezett
 *    szabályának megfelelője);
 * 2. `stale` — ezekből azok, amelyek `processing: true` állapotban vannak, és az
 *    `updatedAt`-jük a küszöbnél (STALE_SCHEDULED_JOB_MS) régebbi.
 *
 * Döntés:
 * - `blocking === 0` → ütemezünk (normál eset);
 * - `stale === 0` → nem ütemezünk (van élő job — ez a helyes duplikátum-védelem);
 * - `0 < stale === blocking` → MINDEN akadály beragadt: **ütemezünk**, és
 *   error-szintű magyar RIASZTÁS megy a naplóba (a beragadt sort embernek kell
 *   rendeznie, de az ütemezés addig sem áll le);
 * - `0 < stale < blocking` → van élő job is, tehát nem ütemezünk, de a beragadt
 *   sorról warn-szintű jelzés megy ki.
 *
 * ═══ MIÉRT NEM SZŰRÜNK `meta.scheduled`-re ═══
 * A Payload alapértelmezése a `meta.scheduled: true` jelre szűkíti a számolást
 * (`onlyScheduled: true`), azaz egy kézzel sorba állított job nem blokkolná az
 * ütemezést. Mi szándékosan SZŰRÉS NÉLKÜL számolunk, két okból: (1) ezt a két
 * taskot a kódban semmi más nem állítja sorba, tehát a két halmaz gyakorlatilag
 * azonos; (2) a szűrés elhagyása a BIZTONSÁGOS irányba téved — ha egy jsonb-úton
 * futó lekérdezés bármikor 0-t adna vissza, a szűrt változat job-hegyet
 * termelne, a miénk legfeljebb kihagy egy kört. Egy adminból kézzel indított
 * futás így valóban visszatartja a következő ütemezettet, ami helyes.
 *
 * A hook NEM access-control és nem auth-hook: kizárólag azt dönti el, hogy a
 * Payload ütemezője sorba állítson-e egy jobot (CLAUDE.md 4. tilos zóna nem
 * érinti).
 */

type ScheduleEntry = NonNullable<TaskConfig['schedule']>[number]
type BeforeScheduleHook = NonNullable<NonNullable<ScheduleEntry['hooks']>['beforeSchedule']>

/** A Payload jobs-collection slugja (payload/dist/queues/config/collection.js). */
const JOBS_COLLECTION_SLUG = 'payload-jobs'

/**
 * Ennyi tétlenség után tekintünk egy `processing: true` jobot beragadtnak.
 *
 * 15 perc: a leghosszabb futású periodikus task (order-poll) legrosszabb esetben
 * 25 Barion-hívást végez, egyenként max. 15 mp-es timeouttal (BARION_TIMEOUT_MS
 * alapértelmezése), tehát ~6 perc a felső korlátja; a webhook-retry ennél
 * nagyságrenddel rövidebb. A 15 perc így bő kétszeres tartalék: élő futást nem
 * minősít beragadtnak, de egy elhalt sor legkésőbb 15 perc múlva feloldódik.
 */
export const STALE_SCHEDULED_JOB_MS = 15 * 60 * 1000

export interface StaleAwareBeforeScheduleOptions {
  /** A task slugja — csak az ehhez tartozó jobokat számoljuk. */
  taskSlug: string
  /** Beragadási küszöb (teszthez felülírható). */
  staleAfterMs?: number
  /** Injektálható logger (teszthez); alapból a projekt gyökér-loggere. */
  logger?: Logger
  /** Injektálható óra (teszthez). */
  now?: () => number
}

/** „Fut vagy futtatható" job ugyanerre a taskra ugyanebben a queue-ban. */
function runnableOrActiveWhere(queue: string, taskSlug: string): Where {
  return {
    and: [
      { queue: { equals: queue } },
      { taskSlug: { equals: taskSlug } },
      { completedAt: { exists: false } },
      { error: { exists: false } },
    ],
  }
}

/** A fentiek közül a beragadtak: `processing: true` és régen frissült. */
function staleWhere(queue: string, taskSlug: string, staleBeforeIso: string): Where {
  return {
    and: [
      ...(runnableOrActiveWhere(queue, taskSlug).and ?? []),
      { processing: { equals: true } },
      { updatedAt: { less_than: staleBeforeIso } },
    ],
  }
}

async function countJobs(req: PayloadRequest, where: Where): Promise<number> {
  const result = await req.payload.db.count({
    collection: JOBS_COLLECTION_SLUG,
    req,
    where,
  })
  return result.totalDocs
}

/** A schedule-zár kulcsa: egy queue+task párra egy zár (K4). */
export function scheduleLockKey(queue: string, taskSlug: string): string {
  return `schedule:${queue}:${taskSlug}`
}

/**
 * A `payload.jobs.queue` minimális, szerkezeti felülete — a TypedJobs a
 * konsolidációs loopig nem feltétlen ismeri az összes taskot, ezért a hívás
 * strukturálisan típusozott (az order-paid.ts JobsQueueLike-mintája).
 */
type JobsQueueLike = {
  queue?: (args: {
    task: string
    input?: Record<string, unknown>
    queue?: string
    waitUntil?: Date
    meta?: Record<string, unknown>
  }) => Promise<unknown>
}

/**
 * A tényleges sorba állítás — a zár alatt hívva. Pontosan azokkal az
 * értékekkel, amelyekkel a Payload `scheduleQueueable`-je dolgozna
 * (`meta.scheduled: true`, a cron-tick `waitUntil`-je).
 */
async function queueScheduledJob(
  req: PayloadRequest,
  queue: string,
  taskSlug: string,
  waitUntil: Date | undefined,
): Promise<void> {
  const jobs = (req.payload as unknown as { jobs?: JobsQueueLike }).jobs
  if (typeof jobs?.queue !== 'function') {
    throw new Error('a payload.jobs.queue nem érhető el — a job nem állítható sorba')
  }
  await jobs.queue({
    task: taskSlug,
    input: {},
    queue,
    ...(waitUntil ? { waitUntil } : {}),
    meta: { scheduled: true },
  })
}

/**
 * A `TaskConfig.schedule[].hooks.beforeSchedule` hook gyártása egy taskra.
 * A visszaadott függvény TELJESEN kiváltja a Payload `defaultBeforeSchedule`-jét,
 * és — a K4 versenyablak bezárásához — a sorba állítást is MAGA végzi, a
 * számolással EGY advisory-zárban. A Payload felé ezért mindig
 * `shouldSchedule: false` tér vissza (a handleSchedules már nem queue-ol).
 */
export function createStaleAwareBeforeSchedule(
  options: StaleAwareBeforeScheduleOptions,
): BeforeScheduleHook {
  const { taskSlug } = options
  const staleAfterMs = options.staleAfterMs ?? STALE_SCHEDULED_JOB_MS
  const now = options.now ?? (() => Date.now())
  const log = (options.logger ?? rootLogger).child({ module: 'jobs/schedule', taskSlug })

  return async ({ queueable, req }) => {
    const queue = queueable.scheduleConfig.queue
    const skip = { input: {}, shouldSchedule: false } as const

    try {
      return await withAdvisoryLock(
        req.payload,
        scheduleLockKey(queue, taskSlug),
        async () => {
          const blocking = await countJobs(req, runnableOrActiveWhere(queue, taskSlug))
          if (blocking > 0) {
            const staleBeforeIso = new Date(now() - staleAfterMs).toISOString()
            const stale = await countJobs(req, staleWhere(queue, taskSlug, staleBeforeIso))
            if (stale === 0) {
              // Élő job — ez a helyes duplikátum-védelem (a zár miatt a
              // számlálás a PÁRHUZAMOS példány sorba állítását is látja).
              return skip
            }
            if (stale < blocking) {
              log.warn(
                'Beragadt job az ütemezett queue-ban (most nem blokkol, mert fut élő job is) — érdemes ' +
                  'ránézni a payload-jobs listára.',
                { queue, stuckJobs: stale, runnableOrActiveJobs: blocking },
              )
              return skip
            }
            log.error(
              'RIASZTÁS: beragadt job blokkolta az ütemezést — feloldva, az új futás elindul. A ' +
                'beragadt sor (processing: true, régóta nem frissült) az adatbázisban marad, kézi ' +
                'ellenőrzés szükséges a payload-jobs listán.',
              { queue, stuckJobs: stale, staleAfterMs },
            )
          }

          // A sorba állítás A ZÁRON BELÜL történik: a versenyző példány a zárra
          // vár, és a fenti számlálásnál már ezt a jobot is látja → kiszáll.
          await queueScheduledJob(req, queue, taskSlug, queueable.waitUntil)
          log.info('ütemezett job sorba állítva (schedule-zár alatt)', { queue })
          return skip
        },
        log,
      )
    } catch (error) {
      // Zárt irányba tévedünk: inkább kimarad egy kör, mint hogy duplikátum
      // keletkezzen. A következő cron-tick úgyis újrapróbálja.
      log.error(
        'RIASZTÁS: a job-ütemezés duplikátum-ellenőrzése nem futott le — ebben a körben nem ' +
          'állítunk sorba jobot. Ha ez ismétlődik, az adatbázis-kapcsolatot kell megnézni.',
        { queue, error: error instanceof Error ? error.message : String(error) },
      )
      return skip
    }
  }
}
