/**
 * Job-queue nevek és a hozzájuk tartozó cron-ritmus EGY helyen, induláskori
 * asserttal.
 *
 * A queue-név a Payload jobs-táblákban is megjelenik — kisbetű, szám, kötőjel
 * engedélyezett; elgépelés ellen modul-szinten validáljuk.
 *
 * MIÉRT ITT VAN A CRON IS? A Payload jobrendszerében KÉT, egymástól független
 * cron-beállítás van, és a kettő CSAK akkor működik együtt, ha ugyanarra a
 * queue-ra és összehangolt ritmusra mutat:
 *
 * 1. `jobs.autoRun[].cron` + `queue` — a MÁR SORBAN ÁLLÓ jobokat FUTTATJA
 *    (payload/dist/queues/config/types/index.d.ts, JobsConfig.autoRun:
 *    „Note that this does not _queue_ new jobs - only _runs_ jobs that are
 *    already in the specified queue.").
 * 2. `TaskConfig.schedule[].cron` + `queue` — ez ÁLLÍTJA SORBA a jobot. A
 *    sorba állítást ugyanaz az autoRun-cron-tick indítja el
 *    (payload/dist/index.js `_initializeCrons` → `jobs.handleSchedules({
 *    queue: cronConfig.queue })`), és a `handleSchedules` KIZÁRÓLAG azokat a
 *    schedule-öket nézi, amelyek `queue`-ja megegyezik az autoRun-entry
 *    queue-jával (payload/dist/queues/operations/handleSchedules/
 *    getQueuesWithSchedules.js). Ugyanez áll az `AutorunCronConfig
 *    .disableScheduling` leírásában is: „the autorun will attempt to schedule
 *    jobs for tasks and workflows that have a `schedule` property, GIVEN THE
 *    QUEUE NAME IS THE SAME".
 *
 * Következmény: a schedule-cron ténylegesen nem tud sűrűbben tüzelni, mint az
 * ugyanarra a queue-ra beállított autoRun-cron (a sorba állítás csak annak a
 * tickjén történik meg). Ezért a két cron ugyanabból a konstansból származik —
 * így nem tudnak szétcsúszni egy későbbi szerkesztésnél.
 */
const QUEUE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/

export function assertQueueName(name: string): string {
  if (!QUEUE_NAME_PATTERN.test(name)) {
    throw new Error(`Érvénytelen job-queue név: "${name}" (megengedett: ${QUEUE_NAME_PATTERN})`)
  }
  return name
}

export const WEBHOOK_RETRY_QUEUE = assertQueueName('webhook-maintenance')

/**
 * Rendelés-életciklus queue (W4): az order-poll (utánpollolás + számla-resweep)
 * és az invoice-issue (Számlázz.hu) jobok ide kerülnek — a webhook-retry-tól
 * elkülönítve, hogy a callback-újrapróbálások ne keveredjenek a rendelés-
 * karbantartással. A queue-név a payload-jobs táblában is megjelenik.
 */
export const ORDER_MAINTENANCE_QUEUE = assertQueueName('order-maintenance')

/**
 * webhook-maintenance ritmus: PERCENKÉNT.
 *
 * Indoklás: az elhasalt Barion-callback újrapróbálása a fizetés lezárásának
 * leggyorsabb útja, a task pedig olcsó (egyetlen indexelt `webhook-events`
 * lekérdezés, max. 25 sor), és a saját exponenciális backoffja (isRetryDue)
 * amúgy is visszafogja a tényleges újrahívásokat. Percnél sűrűbb nem lehet: a
 * Payload autoRun-cronja a legkisebb egységként a percet kezeli.
 */
export const WEBHOOK_RETRY_CRON = '* * * * *'

/**
 * order-maintenance ritmus: 5 PERCENKÉNT.
 *
 * Indoklás: az order-poll KIMENŐ Barion-hívásokat végez (GetState, max. 25
 * függő rendelésre futásonként), ezért nem szabad percenként futnia — 5 perc a
 * józan kompromisszum az elveszett callback pótlásának késleltetése (max. ~5
 * perc, a vevő addig „feldolgozás alatt" állapotot lát) és a szolgáltatói
 * terhelés között. A Barion PaymentWindow 30 perc, tehát 5 perc bőven belefér a
 * fizetés életciklusába. Ez a queue viszi az invoice-issue / storno-issue /
 * corrective-invoice-issue jobokat is, amelyeket ESEMÉNY állít sorba — azok az
 * 5 perces autoRun-tickeken futnak le, a `schedule` rájuk nem vonatkozik.
 */
export const ORDER_MAINTENANCE_CRON = '*/5 * * * *'
