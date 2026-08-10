import type { SanitizedConfig } from 'payload'

import { isStaffOrOwner } from '../access/isStaffOrOwner'

/**
 * A Payload által GENERÁLT `payload-jobs-stats` global lezárása (S2/c).
 *
 * ═══ A HIBA, AMIT BEZÁR (forrásból ellenőrizve) ═══
 * A `jobs.scheduling` bekapcsolása (nálunk automatikus: a webhook-retry és az
 * order-poll tasknak van `schedule`-je) egy GLOBALT is regisztrál a
 * szanitizálás közben:
 *   payload/dist/config/sanitize.js:285
 *     (config.globals ??= []).push(await sanitizeGlobal(config, getJobStatsGlobal(config), …))
 * A `getJobStatsGlobal` (payload/dist/queues/config/global.js) NEM ad meg
 * `access`-t, a globals-szanitizálás pedig hiányzó szabály esetén a
 * `defaultAccess`-t teszi be — read-re ÉS update-re egyaránt:
 *   payload/dist/globals/config/sanitize.js
 *     if (!global.access.read)   { global.access.read = defaultAccess }
 *     if (!global.access.update) { global.access.update = defaultAccess }
 *   payload/dist/auth/defaultAccess.js
 *     ({ req: { user } }) => Boolean(user)
 * Vagyis a global BÁRMELY bejelentkezett felhasználónak — a `customer`
 * szerepkörnek is — olvasható ÉS ÍRHATÓ volt a
 * `POST /api/globals/payload-jobs-stats` végponton
 * (payload/dist/globals/endpoints/index.js `post /` → updateHandler →
 * payload/dist/globals/operations/update.js, `globalConfig.access.update`).
 *
 * ═══ MIÉRT SÚLYOS ═══
 * A `handleSchedules` ebből a globalból veszi a KÖVETKEZŐ futásidő alapját:
 *   payload/dist/queues/operations/handleSchedules/index.js
 *     const lastScheduledRun = …stats?.scheduledRuns?.queues[q].tasks[slug].lastScheduledRun
 *     const nextRun = new Cron(scheduleConfig.cron).nextRun(lastScheduledRun ?? undefined)
 * Egy JÖVŐBE állított `lastScheduledRun`-nal a `nextRun` is a jövőbe kerül,
 * tehát az ÖSSZES ütemezett job (webhook-retry, order-poll) csendben,
 * határidő nélkül leállítható lett volna — pont az a némán elmaradó
 * karbantartás, amit a jobs-config fejléce is éles hibaként ír le.
 *
 * ═══ MIÉRT EZ A JAVÍTÁS (és nem végpont-szűrő) ═══
 * A globalt a Payload a SZANITIZÁLÁS KÖZBEN hozza létre, tehát nincs olyan
 * plugin- vagy config-pont, ahol előre megadhatnánk neki `access`-t (a
 * `sanitizeGlobal` a defaultot csak akkor teszi be, ha nincs megadva — de
 * a friss objektumhoz nem tudunk hozzáférni). A javítás ezért a `buildConfig`
 * EREDMÉNYÉT patcheli.
 *
 * A repóban meglévő `/payments/*` végpont-szűrő
 * (src/lib/payments/barion-adapter.ts) mintáját szándékosan NEM követjük:
 * (1) a végpontok kiszűrése ugyanígy csak a szanitizálás UTÁN lehetséges, tehát
 *     nem takarít meg feltételezést; (2) a globals-végpontok listája hat elem
 *     (`/`, `/access`, `/versions`, `/versions/:id` kétszer), és egy Payload-
 *     frissítés bővítheti — a szűrőt karban kellene tartani; (3) a szűrő
 *     mindenkitől elvenné a végpontot, nem szerepkör szerint zárna.
 * Ezzel szemben az `access.read`/`access.update` a GlobalConfig DOKUMENTÁLT
 * felülete, amit a Payload MINDEN global-művelete (REST és `overrideAccess:
 * false`-os local API) ugyanazon a ponton olvas — egy beállítás, teljes fedés.
 *
 * ═══ MIÉRT NEM TÖRI EL A SAJÁT ÜTEMEZÉST ═══
 * A `handleSchedules` NEM a global-operationökön át dolgozik, hanem a
 * db-rétegen, ami az access-ellenőrzés alatt van:
 * - olvasás: `req.payload.db.findGlobal({ slug: jobStatsGlobalSlug, req })`
 *   (payload/dist/queues/operations/handleSchedules/index.js);
 * - írás: `req.payload.db.updateGlobal(…)` / `req.payload.db.createGlobal(…)`
 *   (payload/dist/queues/operations/handleSchedules/defaultAfterSchedule.js).
 * Egyik sem megy át a `globalConfig.access.*` szabályon. Ezt teszt is őrzi
 * (src/__tests__/jobs/jobs-stats-access.test.ts).
 *
 * ═══ MIÉRT DOB, HA A GLOBAL NINCS MEG ═══
 * Ha a Payload `jobs.scheduling`-et true-ra állította, akkor UGYANABBAN a
 * feltételes ágban be is tolta a globalt — a kettő nem válhat szét ép
 * Payloadban. Ha mégis szétválik, az csak a slug megváltozását jelentheti egy
 * verzióemelésnél; ilyenkor a zár némán hatástalan lenne, és a lyuk
 * észrevétlenül visszanyílna. Ezért hangosan, indulás-/build-időben dobunk:
 * a hiba LÁTHATÓ (a deploy healthcheckje elbukik), nem néma.
 */
export const JOB_STATS_GLOBAL_SLUG = 'payload-jobs-stats'

export function restrictJobStatsGlobalAccess(config: SanitizedConfig): SanitizedConfig {
  const statsGlobal = config.globals.find((global) => global.slug === JOB_STATS_GLOBAL_SLUG)

  if (!statsGlobal) {
    if (config.jobs.scheduling === true) {
      throw new Error(
        `A job-ütemezés be van kapcsolva (jobs.scheduling), de a(z) „${JOB_STATS_GLOBAL_SLUG}" ` +
          'global nincs a szanitált configban — a Payload feltehetően átnevezte. A statisztika-global ' +
          'jogosultsági zárja így NEM alkalmazható, és a globalt bármely bejelentkezett felhasználó ' +
          'írhatná. Emberi felülvizsgálat szükséges (src/jobs/jobs-stats-access.ts).',
      )
    }
    return config
  }

  statsGlobal.access.read = isStaffOrOwner
  statsGlobal.access.update = isStaffOrOwner
  // A globalnak ma nincs `versions` konfigja, tehát a `/versions*` végpontok
  // úgysem szolgálnak ki semmit — a szabály mégis be van állítva, hogy egy
  // későbbi Payload-verzió verziózása se nyisson kiskaput.
  statsGlobal.access.readVersions = isStaffOrOwner

  return config
}
