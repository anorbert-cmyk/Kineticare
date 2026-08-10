import type { PayloadRequest, TaskConfig, Where } from 'payload'

import { logger as rootLogger, type Logger } from '../lib/logger'

/**
 * Beragadás-tűrő `beforeSchedule` őr a periodikus taskokhoz.
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
 * ═══ AMIT EHELYETT CSINÁLUNK ═══
 * Két számlálás fut:
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

/**
 * A `TaskConfig.schedule[].hooks.beforeSchedule` hook gyártása egy taskra.
 * A visszaadott függvény TELJESEN kiváltja a Payload `defaultBeforeSchedule`-jét.
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
    const schedule = { input: {}, shouldSchedule: true, waitUntil: queueable.waitUntil } as const

    let blocking: number
    let stale: number
    try {
      blocking = await countJobs(req, runnableOrActiveWhere(queue, taskSlug))
      if (blocking === 0) {
        return schedule
      }
      const staleBeforeIso = new Date(now() - staleAfterMs).toISOString()
      stale = await countJobs(req, staleWhere(queue, taskSlug, staleBeforeIso))
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

    if (stale === 0) {
      return skip
    }

    if (stale >= blocking) {
      log.error(
        'RIASZTÁS: beragadt job blokkolta az ütemezést — feloldva, az új futás elindul. A ' +
          'beragadt sor (processing: true, régóta nem frissült) az adatbázisban marad, kézi ' +
          'ellenőrzés szükséges a payload-jobs listán.',
        { queue, stuckJobs: stale, staleAfterMs },
      )
      return schedule
    }

    log.warn(
      'Beragadt job az ütemezett queue-ban (most nem blokkol, mert fut élő job is) — érdemes ' +
        'ránézni a payload-jobs listára.',
      { queue, stuckJobs: stale, runnableOrActiveJobs: blocking },
    )
    return skip
  }
}
