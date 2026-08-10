import type { JobsConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { buildJobsConfig } from '../../jobs'
import {
  ORDER_MAINTENANCE_CRON,
  ORDER_MAINTENANCE_QUEUE,
  WEBHOOK_RETRY_CRON,
  WEBHOOK_RETRY_QUEUE,
} from '../../jobs/queues'
import configPromise from '../../payload.config'

/**
 * JOB-ÜTEMEZÉS REGRESSZIÓS KAPU.
 *
 * ═══ A HIBA, AMIT EZ A FÁJL ŐRIZ ═══
 * A `jobs.autoRun` ÖNMAGÁBAN nem állít sorba egyetlen jobot sem. A rendszer
 * hetekig „zölden" futott úgy, hogy az order-poll és a webhook-retry task
 * SOHA nem futott le: a kódban egyedül az invoice-issue / storno-issue /
 * corrective-invoice-issue került valaha sorba (src/lib/order-paid.ts,
 * src/lib/szamlazz/queue.ts), a két periodikus taskot pedig SENKI nem
 * enqueue-olta. Éles következmény: az elveszett Barion-callback sosem
 * pótlódott — a fizető vevő rendelése örökre `payment_pending` maradt (pénz
 * levonva, kurzus nincs).
 *
 * ═══ A BIZONYÍTÉK (a Payload SAJÁT típusdokumentációja és forrása) ═══
 * 1. `JobsConfig.autoRun`
 *    (node_modules/payload/dist/queues/config/types/index.d.ts):
 *      „Allows you to configure cron jobs that automatically run queued jobs
 *       at specified intervals. **Note that this does not _queue_ new jobs -
 *       only _runs_ jobs that are already in the specified queue.**"
 *    → autoRun = FUTTATÁS. A sorba állítás nem az ő dolga.
 *
 * 2. `SanitizedJobsConfig.scheduling` (ugyanott):
 *      „If set to `true`, at least one task or workflow has scheduling
 *       enabled. This property is automatically set during sanitization."
 *    A szanitizálás forrása (node_modules/payload/dist/config/sanitize.js):
 *      `const hasScheduleProperty = config?.jobs?.tasks?.some((task) => task.schedule) …`
 *      `if (hasScheduleProperty) { config.jobs.scheduling = true; … }`
 *    → `schedule` nélkül `config.jobs.scheduling` UNDEFINED marad.
 *
 * 3. `_initializeCrons` (node_modules/payload/dist/index.js):
 *      `if (… && !cronConfig.disableScheduling && this.config.jobs.scheduling) {`
 *      `  await this.jobs.handleSchedules({ allQueues: …, queue: cronConfig.queue })`
 *      `}`
 *    → a sorba állítást AZ AUTORUN-CRON TICKJE indítja, de csak akkor, ha
 *      `jobs.scheduling` igaz. A két beállítás PÁRBAN érvényes: schedule
 *      nélkül nincs mit ütemezni, autoRun nélkül nincs, ami elindítsa.
 *
 * 4. `AutorunCronConfig.disableScheduling` leírása (ugyanott):
 *      „By default, the autorun will attempt to schedule jobs for tasks and
 *       workflows that have a `schedule` property, **given the queue name is
 *       the same**."
 *    Ezt a `handleSchedules` implementációja is megerősíti
 *    (…/operations/handleSchedules/index.js): `if (!allQueues && queueName !== queue) continue`.
 *    → a task `schedule[].queue`-jának EGYEZNIE kell egy autoRun-entry
 *      queue-jával, különben a `handleSchedules` rá sosem fut le.
 *
 * 5. Duplikátum-védelem — `defaultBeforeSchedule`
 *    (…/operations/handleSchedules/defaultBeforeSchedule.js): a queue-ban
 *    ugyanarra a taskra futtatható vagy futó, `meta.scheduled = true` jelű job
 *    darabszámát nézi, és csak 0 esetén ad `shouldSchedule: true`-t. Tehát
 *    taskonként EGY kintlévő ütemezett job lehet — a percenkénti tick nem
 *    termel job-hegyet.
 */

/** Ezeknek a taskoknak PERIODIKUSAN futniuk KELL — enélkül pénz veszik el. */
const REQUIRED_SCHEDULED_TASKS = ['order-poll', 'webhook-retry'] as const

/**
 * Ezeket a taskokat TUDATOSAN nem ütemezzük: eseményre (fizetés lezárása,
 * visszatérítés) állítja sorba őket a kód a `payload.jobs.queue`-val.
 * Ha új task kerül a configba, ez a lista bukik — a fejlesztőnek DÖNTENIE
 * kell, hogy ütemezett vagy esemény-vezérelt.
 */
const EVENT_DRIVEN_TASKS = ['invoice-issue', 'storno-issue', 'corrective-invoice-issue'] as const

type TaskLike = NonNullable<JobsConfig['tasks']>[number]

interface AutorunEntryLike {
  allQueues?: boolean
  cron?: string
  disableScheduling?: boolean
  queue?: string
}

interface SchedulingGap {
  task: string
  reason: string
}

function taskBySlug(config: JobsConfig, slug: string): TaskLike | undefined {
  return config.tasks?.find((task) => task.slug === slug)
}

/**
 * A Payload szanitizálásának TÜKRE (sanitize.js, lásd a fejléc 2. pontját):
 * `config.jobs.scheduling` pontosan akkor lesz igaz, ha van legalább egy
 * `schedule`-lel rendelkező task. A tükröt csak a NEGATÍV kontrollhoz
 * használjuk (mutált configon nem tudunk valódi szanitizálást futtatni); az
 * ép configra a Payload SAJÁT számítását ellenőrizzük lentebb.
 */
function payloadWouldEnableScheduling(config: JobsConfig): boolean {
  return Boolean(config.tasks?.some((task) => task.schedule))
}

/**
 * A teljes ütemezési lánc ellenőrzése EGY configon. Üres tömb = minden
 * kötelezően periodikus task ténylegesen sorba fog kerülni.
 *
 * Az utolsó szabály (azonos cron) a PROJEKT invariánsa, nem Payload-törvény:
 * a schedule-cron fizikailag nem tud sűrűbben tüzelni, mint az ugyanarra a
 * queue-ra állított autoRun-cron (a sorba állítás csak annak a tickjén fut),
 * és a legegyszerűbb garancia erre a KÖZÖS KONSTANS (src/jobs/queues.ts). Ha
 * valaha szándékosan RITKÁBB schedule kell egy queue-n belül, ezt a szabályt
 * tudatosan kell lazítani.
 */
function findSchedulingGaps(config: JobsConfig, requiredSlugs: readonly string[]): SchedulingGap[] {
  const gaps: SchedulingGap[] = []

  if (!Array.isArray(config.autoRun)) {
    return requiredSlugs.map((task) => ({
      task,
      reason: 'nincs autoRun — a handleSchedules-t semmi nem indítja el',
    }))
  }
  const autoRunEntries = config.autoRun as AutorunEntryLike[]

  for (const slug of requiredSlugs) {
    const task = taskBySlug(config, slug)
    if (!task) {
      gaps.push({ task: slug, reason: 'a task nincs a jobs.tasks listában' })
      continue
    }
    const schedules = task.schedule ?? []
    if (schedules.length === 0) {
      gaps.push({ task: slug, reason: 'nincs schedule — semmi nem állítja sorba a jobot' })
      continue
    }

    for (const schedule of schedules) {
      const covering = autoRunEntries.find(
        (entry) => entry.allQueues === true || entry.queue === schedule.queue,
      )
      if (!covering) {
        gaps.push({
          task: slug,
          reason: `a schedule queue-ja ('${schedule.queue}') egyetlen autoRun-entryben sem szerepel`,
        })
        continue
      }
      if (covering.disableScheduling === true) {
        gaps.push({
          task: slug,
          reason: `a queue ('${schedule.queue}') autoRun-entryje disableScheduling: true`,
        })
        continue
      }
      if (covering.cron !== schedule.cron) {
        gaps.push({
          task: slug,
          reason: `a schedule cronja ('${schedule.cron}') eltér az autoRun cronjától ('${String(covering.cron)}')`,
        })
      }
    }
  }

  return gaps
}

/**
 * Env-másolat a worker-kapcsolóval. A `buildJobsConfig` szándékosan
 * paraméteres, hogy a teszt a process.env MÓDOSÍTÁSA NÉLKÜL is meg tudja
 * nézni mindkét ágat (a modul-szintű `jobsConfig` importkor dől el).
 */
function envWithWorkers(enabled: boolean): NodeJS.ProcessEnv {
  return { ...process.env, ENABLE_JOB_WORKERS: enabled ? 'true' : undefined }
}

/** Bekapcsolt worker-ág — élesben/stagingen ez a tényleges konfiguráció. */
function workersOnConfig(): JobsConfig {
  return buildJobsConfig(envWithWorkers(true))
}

/** Sekély másolat, hogy a negatív kontroll mutálhasson (a handlerek megmaradnak). */
function cloneJobsConfig(config: JobsConfig): JobsConfig {
  return {
    ...config,
    tasks: config.tasks?.map((task) => ({ ...task })),
    ...(Array.isArray(config.autoRun)
      ? { autoRun: config.autoRun.map((entry) => ({ ...entry })) }
      : {}),
  }
}

describe('job-ütemezés — a végleges (szanitált) Payload-config', () => {
  it('a Payload SAJÁT szanitizálása bekapcsolta a scheduling-et', async () => {
    const config = await configPromise

    // Ez a Payload számítása, nem a miénk: sanitize.js akkor és csak akkor
    // állítja true-ra, ha legalább egy tasknak van `schedule` mezője.
    expect(config.jobs.scheduling).toBe(true)
    expect(config.jobs.enabled).toBe(true)
  })

  it.each(REQUIRED_SCHEDULED_TASKS)(
    'a(z) %s task a végleges configban ténylegesen ÜTEMEZVE van',
    async (slug) => {
      const config = await configPromise
      const task = taskBySlug(config.jobs, slug)

      expect(task, `a(z) ${slug} task hiányzik a végleges configból`).toBeDefined()
      expect(task?.schedule?.length ?? 0).toBeGreaterThan(0)
      for (const schedule of task?.schedule ?? []) {
        expect(schedule.queue).toBeTruthy()
        expect(schedule.cron).toBeTruthy()
      }
    },
  )

  it('a queue-k és a cronok a megosztott konstansokból jönnek (nem tudnak szétcsúszni)', async () => {
    const config = await configPromise

    expect(taskBySlug(config.jobs, 'order-poll')?.schedule).toEqual([
      { cron: ORDER_MAINTENANCE_CRON, queue: ORDER_MAINTENANCE_QUEUE },
    ])
    expect(taskBySlug(config.jobs, 'webhook-retry')?.schedule).toEqual([
      { cron: WEBHOOK_RETRY_CRON, queue: WEBHOOK_RETRY_QUEUE },
    ])
  })

  /**
   * Ez a lista kényszeríti ki a DÖNTÉST: minden task vagy ütemezett, vagy
   * tudatosan esemény-vezérelt. Új task felvételekor ez a teszt bukik, és a
   * fejlesztőnek állást kell foglalnia — nem tud csendben kimaradni.
   */
  it('minden task besorolt: ütemezett VAGY tudatosan esemény-vezérelt', async () => {
    const config = await configPromise
    const slugs = (config.jobs.tasks ?? []).map((task) => task.slug)
    const withoutSchedule = (config.jobs.tasks ?? [])
      .filter((task) => (task.schedule?.length ?? 0) === 0)
      .map((task) => task.slug)

    expect([...slugs].sort()).toEqual([...REQUIRED_SCHEDULED_TASKS, ...EVENT_DRIVEN_TASKS].sort())
    expect([...withoutSchedule].sort()).toEqual([...EVENT_DRIVEN_TASKS].sort())
  })
})

describe('job-ütemezés — a schedule ÉS az autoRun együtt (bekapcsolt workerek)', () => {
  it('nincs ütemezési rés: minden kötelező task queue-ja szerepel az autoRun-ban, egyező ritmussal', () => {
    expect(findSchedulingGaps(workersOnConfig(), REQUIRED_SCHEDULED_TASKS)).toEqual([])
  })

  it('az autoRun-entryk egyike sem kapcsolja ki az ütemezést', () => {
    const config = workersOnConfig()
    const entries = (Array.isArray(config.autoRun) ? config.autoRun : []) as AutorunEntryLike[]

    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.disableScheduling).not.toBe(true)
    }
  })

  it('ENABLE_JOB_WORKERS nélkül nincs autoRun — a schedule ilyenkor nem is fut le (dev)', () => {
    const devConfig = buildJobsConfig(envWithWorkers(false))

    expect(devConfig.autoRun).toBeUndefined()
    // A schedule attól még ott van a taskokon: a hiányzó láncszem az autoRun.
    expect(payloadWouldEnableScheduling(devConfig)).toBe(true)
    expect(findSchedulingGaps(devConfig, REQUIRED_SCHEDULED_TASKS)).toHaveLength(
      REQUIRED_SCHEDULED_TASKS.length,
    )
  })
})

/**
 * NEGATÍV KONTROLL: az ellenőrzés csak akkor ér valamit, ha bukni is tud.
 * Mind a négy rés-fajtát előállítjuk mutációval, és megmutatjuk, hogy a
 * `findSchedulingGaps` mindegyiket elkapja.
 */
describe('job-ütemezés — negatív kontroll (a kapu tényleg bukik)', () => {
  it('törölt schedule (= a JAVÍTÁS ELŐTTI állapot) → rés', () => {
    const broken = cloneJobsConfig(workersOnConfig())
    broken.tasks = broken.tasks?.map((task) =>
      task.slug === 'order-poll' ? { ...task, schedule: undefined } : task,
    )

    const gaps = findSchedulingGaps(broken, REQUIRED_SCHEDULED_TASKS)

    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({ task: 'order-poll' })
    expect(gaps[0].reason).toContain('nincs schedule')
  })

  it('idegen queue a schedule-ben → rés (a handleSchedules sosem futna rá)', () => {
    const broken = cloneJobsConfig(workersOnConfig())
    broken.tasks = broken.tasks?.map((task) =>
      task.slug === 'webhook-retry'
        ? { ...task, schedule: [{ cron: WEBHOOK_RETRY_CRON, queue: 'nem-letezo-queue' }] }
        : task,
    )

    const gaps = findSchedulingGaps(broken, REQUIRED_SCHEDULED_TASKS)

    expect(gaps).toHaveLength(1)
    expect(gaps[0].reason).toContain('nem-letezo-queue')
  })

  it('disableScheduling: true az autoRun-entryn → rés', () => {
    const broken = cloneJobsConfig(workersOnConfig())
    broken.autoRun = (broken.autoRun as AutorunEntryLike[]).map((entry) =>
      entry.queue === ORDER_MAINTENANCE_QUEUE ? { ...entry, disableScheduling: true } : entry,
    )

    const gaps = findSchedulingGaps(broken, REQUIRED_SCHEDULED_TASKS)

    expect(gaps).toHaveLength(1)
    expect(gaps[0].reason).toContain('disableScheduling')
  })

  it('szétcsúszott cron (schedule sűrűbb, mint az autoRun-tick) → rés', () => {
    const broken = cloneJobsConfig(workersOnConfig())
    broken.tasks = broken.tasks?.map((task) =>
      task.slug === 'order-poll'
        ? { ...task, schedule: [{ cron: '* * * * *', queue: ORDER_MAINTENANCE_QUEUE }] }
        : task,
    )

    const gaps = findSchedulingGaps(broken, REQUIRED_SCHEDULED_TASKS)

    expect(gaps).toHaveLength(1)
    expect(gaps[0].reason).toContain('eltér az autoRun cronjától')
  })
})

/**
 * A SZEMANTIKAI CSAPDA, ami az eredeti hibát okozta — külön teszt, hogy a
 * következő fejlesztő ne essen bele újra.
 *
 * A csapda: az `autoRun` beállítva volt (percenkénti és 5 percenkénti cron,
 * a helyes queue-nevekkel), a naplóban látszott, hogy a jobrendszer él — de
 * SEMMI nem került sorba, mert az autoRun a saját dokumentációja szerint
 * kizárólag a MÁR SORBAN ÁLLÓ jobokat futtatja. A hiányzó láncszem a
 * `TaskConfig.schedule` volt, amely nélkül a szanitizálás `jobs.scheduling`-et
 * sem kapcsolja be, tehát a `handleSchedules` ága el sem indul.
 */
describe('job-ütemezés — az autoRun ÖNMAGÁBAN nem elég (a hiba oka)', () => {
  it('autoRun megvan, schedule nincs → a Payload nem kapcsolná be a scheduling-et', () => {
    const autoRunOnly = cloneJobsConfig(workersOnConfig())
    autoRunOnly.tasks = autoRunOnly.tasks?.map((task) => ({ ...task, schedule: undefined }))

    // Az autoRun érintetlen: cron + queue a helyén van, a jobrendszer "él".
    expect(Array.isArray(autoRunOnly.autoRun)).toBe(true)
    expect((autoRunOnly.autoRun as AutorunEntryLike[]).map((entry) => entry.queue)).toEqual([
      WEBHOOK_RETRY_QUEUE,
      ORDER_MAINTENANCE_QUEUE,
    ])

    // Mégsem ütemez semmit: sanitize.js `hasScheduleProperty` → false, tehát
    // `config.jobs.scheduling` undefined marad, és _initializeCrons feltétele
    // (`… && this.config.jobs.scheduling`) sosem teljesül.
    expect(payloadWouldEnableScheduling(autoRunOnly)).toBe(false)

    // Ez pontosan a JAVÍTÁS ELŐTTI éles állapot: mindkét periodikus task néma.
    expect(
      findSchedulingGaps(autoRunOnly, REQUIRED_SCHEDULED_TASKS).map((gap) => gap.task),
    ).toEqual([...REQUIRED_SCHEDULED_TASKS])
  })

  it('a jelenlegi configgal a tükör és a Payload tényleges eredménye is igaz', async () => {
    const config = await configPromise

    expect(payloadWouldEnableScheduling(workersOnConfig())).toBe(true)
    expect(config.jobs.scheduling).toBe(true)
  })
})
