import type { JobsConfig } from 'payload'

import { isStaffOrOwner } from '../access/isStaffOrOwner'
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
 *   kerül a `scheduled: true` jelölés (payload/dist/queues/operations/
 *   handleSchedules/index.js, `scheduleQueueable`).
 * Postgresen ez pontosan két DDL-utasítás — egy új tábla + egy új, NULLABLE
 * oszlop —, tehát MIGRÁCIÓ szükséges, a Payload migrációs eszközével generálva
 * (CLAUDE.md 3. tilos zóna). A deploy `npx payload migrate && npm start`
 * sorrendje miatt a migrációnak UGYANABBAN a változáskörben kell mennie, mint
 * ennek a confignak.
 *
 * MIÉRT BLOKKOLÓ a migráció hiánya (a pontos mechanizmus). Az autoRun-cron
 * tickje ELŐSZÖR a `handleSchedules`-t hívja, és csak UTÁNA a `jobs.run`-t
 * (payload/dist/index.js, `_initializeCrons`). A `handleSchedules` első dolga
 * egy `db.findGlobal({ slug: 'payload-jobs-stats' })` — hiányzó tábla esetén ez
 * DOB, a tick megszakad, tehát a MÁR MA MŰKÖDŐ esemény-vezérelt jobok
 * (invoice-issue / storno-issue / corrective-invoice-issue) SEM futnának le.
 * A migráció nélküli deploy tehát nem „csak" az új ütemezést nem hozná, hanem
 * a meglévő számlázási láncot is leállítaná.
 *
 * MIÉRT EZT AZ UTAT VÁLASZTOTTUK (a migráció nélküli `onInit` + saját
 * `payload.jobs.queue` helyett). Az onInit-es saját ütemező valóban nem igényel
 * sémaváltozást, de a Payload-oldali garanciákat mind újra kellene építeni,
 * rosszabbul: (1) a `lastScheduledRun` nem perzisztálódna, tehát egy az
 * intervallumnál gyakrabban újrainduló folyamat (crash-loop, sűrű deploy)
 * SOHA nem érne el ütemezésig; (2) a duplikátum-védelemhez ugyanúgy DB-számolás
 * kell, ugyanazzal a versenyhelyzettel; (3) a saját időzítőt külön ki kellene
 * zárni a `next build` és a `payload migrate` folyamatokból (a Payload ezt az
 * `isNextBuild()` őrrel maga megteszi); (4) két párhuzamos ütemező-mechanizmus
 * maradna a kódban, és egy későbbi `schedule` felvétele némán duplán ütemezne.
 * Ezzel szemben a migráció ADDITÍV és mindkét irányban biztonságos: a régi kód
 * figyelmen kívül hagyja az új táblát/oszlopot, tehát a rollback is ártalmatlan.
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
 * A job-végpontok jogosultsága (S2/a — access-control szigorítás).
 *
 * ═══ A HIBA, AMIT BEZÁR (a Payload forrásából ellenőrizve) ═══
 * A `jobs.access` alapértelmezése a szanitizáláskor kerül be
 * (payload/dist/config/defaults.js, `addDefaultsToConfig`):
 *   config.jobs = { …, access: { cancel: defaultAccess, queue: defaultAccess,
 *                                run: defaultAccess, ...config.jobs?.access } }
 * ahol `defaultAccess = ({ req: { user } }) => Boolean(user)`
 * (payload/dist/auth/defaultAccess.js) — vagyis BÁRMELY BEJELENTKEZETT
 * FELHASZNÁLÓ, a `customer` szerepkör is. (A végpontokban látható
 * `?? (() => true)` fallback csak a szanitizálatlan configra vonatkozik; élesben
 * nem ez a hatályos érték.) A saját `access` a spread miatt FELÜLÍRJA a defaultot.
 *
 * Az érintett REST-végpontok (a jobs-collection `endpoints` tömbje,
 * payload/dist/queues/config/collection.js):
 *   GET /api/payload-jobs/run              → jobokat futtat
 *   GET /api/payload-jobs/handle-schedules → jobokat állít sorba
 * Mindkettő a `jobs.access.run` szabályt nézi. Külön `/queue` és `/cancel`
 * REST-végpont a 3.86-ban NINCS — azok az access-ágak kizárólag a local API
 * `overrideAccess: false` hívásain élnek (a teljesség kedvéért ezeket is
 * beállítjuk). Következmény a szigorítás előtt: egy regisztrált vevő is
 * indíthatta/ütemezhette a számlázási és karbantartó jobokat — erőforrás-
 * visszaélés, rosszabb esetben ismételt Számlázz.hu-hívás.
 *
 * ═══ MIÉRT NEM TÖRI EL A SAJÁT ÜTEMEZÉST ═══
 * A szerver-oldali utak MIND `overrideAccess: true`-val futnak, ami az
 * access-ellenőrzést ÁT IS UGORJA (nem „true-t ad", hanem be sem lép):
 * - az autoRun-cron (`payload/dist/index.js`, `_initializeCrons`) a
 *   `this.jobs.handleSchedules(...)` (ebben NINCS access-ág) és a
 *   `this.jobs.run(...)` local API-t hívja; utóbbi
 *   `overrideAccess: args?.overrideAccess !== false` → `true`
 *   (payload/dist/queues/localAPI.js), a `runJobs` pedig csak
 *   `if (!overrideAccess)` esetén ellenőriz;
 * - a saját `payload.jobs.queue(...)` hívásaink (src/lib/order-paid.ts,
 *   src/lib/szamlazz/queue.ts) sem adnak `overrideAccess: false`-t, tehát a
 *   `queue` access-ága szintén nem fut le.
 * A szigorítás így KIZÁRÓLAG a HTTP-felületet érinti; a számlázási lánc és a
 * karbantartó ütemezés változatlanul működik. Ezt teszt bizonyítja:
 * src/__tests__/jobs/jobs-access.test.ts (a VALÓDI Payload-végpontot és a
 * VALÓDI local API-t futtatja, ál-adatbázissal).
 *
 * ═══ MIÉRT staff+owner ═══
 * A jobok futtatása/ütemezése üzemeltetői művelet: az adminban dolgozó staff
 * elakadt jobot újraindíthat, a customer szerepkörnek viszont semmi dolga vele.
 */
const JOBS_ACCESS: NonNullable<JobsConfig['access']> = {
  cancel: isStaffOrOwner,
  queue: isStaffOrOwner,
  run: isStaffOrOwner,
}

/**
 * A `payload-jobs` COLLECTION jogosultsága (S2/a, második fele).
 *
 * ═══ MIÉRT KELL A JOBS.ACCESS MELLÉ ═══
 * A `jobs.access` KIZÁRÓLAG a `/run` és `/handle-schedules` végpontot védi. A
 * jobs-collection ezen felül megkapja a Payload SZOKÁSOS CRUD REST-felületét is
 * (GET/POST/PATCH/DELETE `/api/payload-jobs…`), annak jogosultsága pedig a
 * COLLECTION `access` blokkjából jön. A Payload gyári jobs-collectionje
 * (payload/dist/queues/config/collection.js) NEM ad meg `access`-t, tehát a
 * collection-defaultok lépnek életbe (payload/dist/collections/config/
 * defaults.js): `create/read/update/delete: defaultAccess`, és
 * `defaultAccess = ({ req: { user } }) => Boolean(user)`
 * (payload/dist/auth/defaultAccess.js) — vagyis BÁRMELY bejelentkezett
 * felhasználó, a `customer` szerepkör is.
 *
 * Ez súlyosabb, mint a `/run` nyitottsága: a `POST /api/payload-jobs` egy
 * tetszőleges `taskSlug` + `input` + `queue` hármassal ÚJ JOBOT hoz létre, amit
 * az autoRun-cron a következő tickjén LEFUTTAT. Egy regisztrált vevő így
 * futtathatta volna a számlázási taskokat idegen rendelés-azonosítókkal, a
 * `GET`-tel pedig kiolvashatta a jobok `input`/`error` tartalmát.
 *
 * ═══ MIÉRT NEM TÖRI EL A JOB-RENDSZERT ═══
 * A jobok írását/olvasását a Payload belül NEM a collection-access-en át
 * végzi: a `runJobs` és a `handleSchedules` a `payload.db.*` szintre megy
 * (payload/dist/queues/utilities/updateJob.js: `req.payload.db.updateJobs`),
 * a `payload.jobs.queue` pedig `payload.db.create`-tel ír, amíg nincs
 * `jobs.depth`/`jobs.runHooks` beállítva (payload/dist/queues/localAPI.js) —
 * ezek mind megkerülik a collection-access-t. A szigorítás tehát csak a HTTP-n
 * érkező, felhasználói kéréseket érinti.
 */
const jobsCollectionOverrides: NonNullable<JobsConfig['jobsCollectionOverrides']> = ({
  defaultJobsCollection,
}) => ({
  ...defaultJobsCollection,
  access: {
    ...defaultJobsCollection.access,
    create: isStaffOrOwner,
    delete: isStaffOrOwner,
    read: isStaffOrOwner,
    update: isStaffOrOwner,
  },
})

/**
 * A jobs-konfig felépítése az env függvényében. Tiszta függvény, hogy a
 * teszt a bekapcsolt worker-ág (autoRun) és a task-schedule-ök EGYÜTTES
 * helyességét is ellenőrizni tudja — az `ENABLE_JOB_WORKERS` a tesztfutásban
 * nincs beállítva, tehát a modul-szintű `jobsConfig` autoRun nélkül épül fel.
 */
export function buildJobsConfig(env: NodeJS.ProcessEnv = process.env): JobsConfig {
  return {
    access: JOBS_ACCESS,
    jobsCollectionOverrides,
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
