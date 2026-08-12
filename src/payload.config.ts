import { postgresAdapter } from '@payloadcms/db-postgres'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { FixedToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { hu } from '@payloadcms/translations/languages/hu'
import path from 'node:path'
import { APIError, buildConfig, type CollectionBeforeValidateHook, type Payload } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

import { isAdmin } from './access'
import { AuditLogs } from './collections/AuditLogs'
import { ensureHomeImages, ensureHomeLayout, ensureHomeTestimonials } from './lib/home-seed'
import { ensureMediaFiles } from './lib/media-restore'
import { Categories } from './collections/Categories'
import { CourseProgress } from './collections/CourseProgress'
import { Media } from './collections/Media'
import { Menus } from './collections/Menus'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { WebhookEvents } from './collections/WebhookEvents'
import { buildOriginAllowlist } from './env'
import { jobsConfig } from './jobs'
import { restrictJobStatsGlobalAccess } from './jobs/jobs-stats-access'
import { registerBarionWebhookProcessor } from './lib/barion-callback/process-callback'
import { validateContactSubmissionData } from './lib/contact-submission'
import { contactStaffEmail, kineticareEmailAdapter, sendMail, usersAuthEmails } from './lib/email'
import { logger } from './lib/logger'
import { adminGroups } from './plugins/admin-groups'
import { audit } from './plugins/audit'
import { ecommerce } from './plugins/ecommerce'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * A CORS/CSRF-engedélylista a publikus szerver-URL EREDETÉBŐL (src/env.ts —
 * ugyanaz a normalizálás hajtja a storefront `metadataBase`-ét és az
 * SEO-segédeket is, tehát a védett és a hirdetett cím nem csúszhat szét).
 *
 * A `cors` és a `csrf` KÜLÖN hívást kap, mert a Payload szanitálása a `csrf`
 * tömbbe beleírhat (node_modules/payload/dist/config/sanitize.js:340-342) —
 * közös tömb-referencia mellett ez a `cors`-t is átírná.
 */
const corsAllowlist = buildOriginAllowlist(process.env.NEXT_PUBLIC_SERVER_URL)
const csrfAllowlist = buildOriginAllowlist(process.env.NEXT_PUBLIC_SERVER_URL)

// ---------------------------------------------------------------------------
// T-016: kapcsolat űrlap — beküldés-kezelés (spam-védelem + staff-értesítő)
// ---------------------------------------------------------------------------

/**
 * Turnstile-előkészítés: a form-submissions rekord opcionális turnstileToken
 * mezőjét a TURNSTILE_SECRET_KEY jelenléte kapcsolja be — env nélkül a
 * spam-ellenőrzés KI van kapcsolva, a beküldés akadálytalan. (A kliensoldali
 * widget a TURNSTILE_SITE_KEY-val kerül a frontendre.)
 *
 * Ez a „nincs kulcs → nincs ellenőrzés" ág addig él, amíg a Turnstile nincs
 * élesítve. Production-ben az induláskori assert (`turnstileEnvPair`,
 * src/env.ts) a kulcsPÁR konzisztenciáját követeli meg: fél-lábas
 * konfigurációval (csak site key VAGY csak secret) az app el sem indul,
 * teljes hiánynál pedig induláskori warn jelzi, hogy a védelem kikapcsolt —
 * csendben fél-védett állapot tehát élesben nem létezhet.
 */
const verifyTurnstile = async (data: unknown): Promise<unknown> => {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return data
  }
  const token =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>).turnstileToken
      : undefined
  if (typeof token !== 'string' || token.length === 0) {
    throw new APIError('A spam-ellenőrzés (Turnstile) token hiányzik.', 400)
  }
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(10_000),
  })
  const result = (await response.json().catch(() => ({}))) as { success?: boolean }
  if (!result.success) {
    throw new APIError('A spam-ellenőrzés (Turnstile) sikertelen. Kérjük, próbáld újra.', 400)
  }
  return data
}

/**
 * K2: a kapcsolat-űrlap beküldésének SZERVER-oldali mező- és consent-
 * ellenőrzése. A form-builder plugin a submissionData sorokat ellenőrzés
 * nélkül tárolja, ezért a kötelező mezőket és a consentPrivacy
 * hozzájárulást itt érvényesítjük — a szabályok és a magyar hibaüzenetek a
 * kliensoldali validáció tükre (src/lib/contact-submission.ts). A hibák
 * APIError-ként ugyanúgy magyarul érkeznek a klienshez, mint a
 * Turnstile-hibák (a frontend errors[0].message-et jelenít meg).
 *
 * Csak CREATE-en fut: update-nél a `data` csak a küldött mezőket hordozza,
 * így egy submissionData-t nem érintő staff-módosítást az ellenőrzés
 * tévesen utasítana el. A nyilvános támadási felület (és a consent-mentes
 * beküldés lehetősége) kizárólag a create — az update/delete staff+owner
 * jogosultságú.
 *
 * A Turnstile-ellenőrzés ELŐTT fut: a mezőhiba olcsó és helyi, a
 * siteverify pedig külső hívás — a formailag hibás beküldésre felesleges
 * Turnstile-kérést nem indítunk.
 */
const validateContactSubmission: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (operation !== 'create') {
    return data
  }
  const submissionData =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>).submissionData
      : undefined
  const errors = validateContactSubmissionData(submissionData)
  if (errors.length > 0) {
    throw new APIError(errors.join(' '), 400)
  }
  return data
}

/**
 * Staff-értesítő kapcsolat-űrlap beküldéskor (T-018 contact-staff sablon).
 * A címzettlista a CONTACT_STAFF_EMAILS env-ből jön (vessző-szeparált); üres
 * env = nincs értesítés, a beküldés ettől függetlenül mentődik. Best-effort:
 * az e-mail-hiba sosem rontja el a beküldést.
 */
const notifyStaffOnSubmission = async ({
  doc,
  operation,
}: {
  doc: unknown
  operation: string
}): Promise<unknown> => {
  if (operation !== 'create') {
    return doc
  }
  const recipients = (process.env.CONTACT_STAFF_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
  if (recipients.length === 0) {
    logger.debug('CONTACT_STAFF_EMAILS üres — staff-értesítő kihagyva')
    return doc
  }
  try {
    const submissionData =
      typeof doc === 'object' && doc !== null
        ? ((doc as Record<string, unknown>).submissionData as
            Array<{ field?: string; value?: string }> | undefined)
        : undefined
    const fieldValue = (name: string): string =>
      submissionData?.find((entry) => entry.field === name)?.value ?? ''
    const template = contactStaffEmail({
      name: fieldValue('name') || 'Ismeretlen beküldő',
      email: fieldValue('email') || '-',
      message: fieldValue('message'),
      submittedAt: new Date().toLocaleString('hu-HU'),
    })
    const result = await sendMail({ to: recipients, ...template })
    if (!result.ok) {
      logger.warn('staff-értesítő küldése sikertelen', {
        retryable: result.retryable,
        error: result.error,
      })
    }
  } catch (error) {
    logger.warn('staff-értesítő feldolgozása sikertelen (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return doc
}

// ---------------------------------------------------------------------------
// T-016: „Kapcsolat" űrlap idempotens létrehozása (a plugin formja DB-tartalom,
// nincs rá migráció — az onInit gondoskodik róla, best-effort).
// ---------------------------------------------------------------------------

const CONTACT_FORM_TITLE = 'Kapcsolat'

function contactFormData(): Record<string, unknown> {
  const confirmationText = 'Köszönjük az üzenetét! Munkatársunk hamarosan jelentkezik.'
  return {
    title: CONTACT_FORM_TITLE,
    submitButtonLabel: 'Üzenet küldése',
    confirmationType: 'message',
    confirmationMessage: {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: 'ltr',
            format: '',
            indent: 0,
            children: [
              {
                type: 'text',
                version: 1,
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: confirmationText,
              },
            ],
          },
        ],
      },
    },
    fields: [
      { blockType: 'text', name: 'name', label: 'Név', required: true },
      { blockType: 'email', name: 'email', label: 'E-mail cím', required: true },
      { blockType: 'textarea', name: 'message', label: 'Üzenet', required: true },
    ],
    emails: [],
  }
}

/**
 * A `pg` pool tétlen kapcsolatain érkező hibák lekezelése.
 *
 * A Railway privát hálózata elvágja a tétlen TCP-kapcsolatokat. A pool ilyenkor
 * `error` eseményt bocsát ki a tétlen kliensen; ha ezt senki nem kezeli le, a
 * Node `uncaughtException`-ként dobja tovább, és a teljes szerverfolyamat
 * instabillá válik (a production-logban ez a
 * „⨯ uncaughtException: Connection terminated unexpectedly" sor).
 * A pool a hibás klienst magától eldobja és újat nyit, tehát a naplózás elég.
 */
function registerPoolErrorHandler(payload: Payload): void {
  const { pool } = payload.db
  if (typeof pool?.on !== 'function') {
    return
  }
  pool.on('error', (error: Error) => {
    logger.warn('Postgres pool hiba tétlen kapcsolaton (a pool újranyitja)', {
      error: error.message,
    })
  })
}

/**
 * A Barion webhook-feldolgozó DETERMINISZTIKUS regisztrációja (M-15).
 *
 * A `registerWebhookProcessor` egy folyamaton belüli Map — a webhook-retry job
 * (src/jobs/tasks/webhook-retry.ts) csak REGISZTRÁLT feldolgozójú eseményeket
 * futtat újra, a többit `skipped`-ként átugorja. A regisztráció eddig kizárólag
 * a callback-route MODUL-BETÖLTÉSÉNEK mellékhatásaként futott le
 * (src/app/(frontend)/api/barion/callback/route.ts). A Next.js route-modulokat
 * viszont lustán, az első kéréskor tölti be: ha egy példány elindul, és a
 * webhook-retry cron előbb fut le, mint ahogy bármilyen Barion-callback
 * megérkezne arra a példányra, a feldolgozó nincs regisztrálva — az elhasalt
 * események némán kimaradnak a retryból. Ugyanez a rés az order-poll/retry
 * útvonalon: azok NEM töltik be a callback-route-ot.
 *
 * Az `onInit` viszont a Payload minden inicializálásakor lefut — ugyanabban a
 * folyamatban, amelyben a jobs autoRun (jobsConfig) is elindul —, ezért ez a
 * regisztráció determinisztikus horgonya. A `registerWebhookProcessor` egy
 * Map.set, tehát idempotens: a route-ban maradó hívás (ott a callback saját
 * útvonala szempontjából dokumentálja a bekötést) ártalmatlanul felülírja
 * ugyanezzel az értékkel.
 *
 * Tisztán memóriabeli művelet: nem hívhat adatbázist és nem dobhat, ezért — a
 * pool-error handlerhez hasonlóan — a seedelő lépések ELŐTT, azoktól függetlenül
 * fut le.
 */
function registerWebhookProcessors(payload: Payload): void {
  registerBarionWebhookProcessor(async () => payload)
  logger.debug('Barion webhook-feldolgozó regisztrálva (onInit)')
}

/**
 * Kezdőlap-alapállapot indulásnál: a hiányzó képFÁJLOK visszatöltése, majd a
 * landing tartalmi képei + a `kezdolap` alap-szekciósora (src/lib/home-seed.ts).
 * Az ensureContactForm mintája: telepítési előfeltétel, ezért minden bootnál
 * lefut — idempotens, meglévő képet és kitöltött szekciósort SOHA nem ír felül,
 * így beállt rendszeren néhány olcsó olvasás az ára. Best-effort: hibája nem
 * állíthatja meg az appot.
 *
 * A SORREND KÖTÖTT: az `ensureMediaFiles` FÁJL-szinten ellenőriz és javít, az
 * `ensureHomeImages` viszont csak a DB-rekord létét nézi (fájlnév-dedup) — ha
 * utóbbi futna előbb, a meglévő rekordok miatt „minden rendben"-t jelentene,
 * miközben a fájlok hiányoznak. Lásd src/lib/media-restore.ts.
 */
async function ensureHomeBaseline(payload: Payload): Promise<void> {
  try {
    await ensureMediaFiles(payload)
    const mediaIds = await ensureHomeImages(payload)
    await ensureHomeLayout(payload, mediaIds)
    await ensureHomeTestimonials(payload)
  } catch (error) {
    logger.warn('Kezdőlap-alapállapot ellenőrzése/betöltése sikertelen (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function ensureContactForm(payload: Payload): Promise<void> {
  try {
    const existing = await payload.find({
      // A forms collection a form-builder pluginből jön — a payload-types a
      // konsolidációs loop végéig még nem tartalmazza, ezért a slug itt castolt.
      collection: 'forms' as 'pages',
      where: { title: { equals: CONTACT_FORM_TITLE } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      return
    }
    await payload.create({
      collection: 'forms' as 'pages',
      data: contactFormData() as never,
      overrideAccess: true,
    })
    logger.info('„Kapcsolat" űrlap létrehozva (idempotens onInit)')
  } catch (error) {
    // Best-effort: hiányzó DB/tábla (pl. első migráció előtt) ne állítsa meg az appot.
    logger.warn('„Kapcsolat" űrlap ellenőrzése/létrehozása sikertelen (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Induláskori lépések.
 *
 * A pool-error handler regisztrációja az ELSŐ lépés, és szándékosan önálló:
 * korábban az `ensureContactForm` (űrlap-seedelő) belsejében történt,
 * mellékhatásként — ha azt a form-seedeléssel együtt valaha eltávolítjuk, a
 * handler is némán eltűnt volna, és visszatért volna a CLAUDE.md 7.
 * üzemeltetési tanulságában leírt éles hiba: a Railway privát hálóján elvágott
 * tétlen kapcsolat kezeletlen `error` eseménye `uncaughtException`-ként viszi
 * el a Next.js szerverfolyamatot. A három lépésnek nincs köze egymáshoz, ezért
 * itt látszik is, hogy külön dolog: pool-handler, webhook-feldolgozók,
 * kezdőlap-alapállapot (képek, szekciósor, kiemelt vélemények), majd a
 * „Kapcsolat" űrlap.
 *
 * A két memóriabeli regisztráció (pool-handler, webhook-feldolgozók) MEGELŐZI a
 * DB-t érintő, best-effort seedelést: azok hibája (pl. migráció előtti adatbázis)
 * így nem viheti magával a regisztrációkat.
 */
async function onInit(payload: Payload): Promise<void> {
  registerPoolErrorHandler(payload)
  registerWebhookProcessors(payload)
  await ensureHomeBaseline(payload)
  await ensureContactForm(payload)
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // A böngészőfülön/megosztáskor látszó cím: „<oldal> – Kineticare admin".
    meta: {
      titleSuffix: ' – Kineticare admin',
    },
  },
  // Magyar admin felület: a @payloadcms/translations `hu` nyelvfájlja a
  // fallback, így a nem szerkesztett kulcsok is magyarul jelennek meg; az `en`
  // választható marad (a Payload a felhasználó nyelvi beállítását tiszteletben tartja).
  i18n: {
    supportedLanguages: { en, hu },
    fallbackLanguage: 'hu',
  },
  collections: [
    Users,
    Media,
    Pages,
    Posts,
    Menus,
    Categories,
    Testimonials,
    CourseProgress,
    WebhookEvents,
    AuditLogs,
  ],
  // FixedToolbarFeature: a szerkesztő fölött állandóan látszó eszköztár —
  // laikus szerkesztőnek sokkal felfedezhetőbb, mint a lebegő (kijelölésre
  // előbukkanó) alapértelmezett toolbar.
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, FixedToolbarFeature()],
  }),
  // T-018: a Payload auth e-mailjei (forgot-password) is a saját provider-rétegen
  // mennek ki (Resend/SMTP/noop — env nélkül sosem crashel).
  email: kineticareEmailAdapter,
  // T-014: a webhook-retry task és az ENABLE_JOB_WORKERS env mögötti autoRun.
  jobs: jobsConfig,
  // A GraphQL API teljesen kikapcsolva (C1/A2 biztonsági zárás). A frontend
  // és az admin kizárólag a REST API-t és a local API-t használja — a /graphql
  // végpont viszont hitelesítés nélkül kiszolgálta volna a Payload beépített
  // resetPasswordUser/forgotPasswordUser mutációit, amelyek a
  // resetPasswordOperation-ön át MEGKERÜLIK a Users beforeChange
  // jelszó-politikát (lásd src/lib/security/reset-password-route.ts) és az
  // IP-alapú kérés-korlátot is (a withPayloadRestRateLimit csak a REST
  // catch-allon fut). Használatlan felület + megkerülő út = letiltás; a
  // /graphql route-fájl is törölve. Ha valaha GraphQL kell, előbb a
  // politika- és rate-limit-őrt kell rá felhúzni.
  graphQL: {
    disable: true,
  },
  // A titok kötelező — az induláskori ENV-assert (src/env.ts + src/instrumentation.ts)
  // gondoskodik róla, hogy hiányában az app ne induljon el.
  secret: process.env.PAYLOAD_SECRET || '',
  // -------------------------------------------------------------------------
  // A `serverURL` SZÁNDÉKOSAN NINCS BEÁLLÍTVA (marad a Payload alapértelmezett
  // üres stringje, node_modules/payload/dist/config/defaults.js:75 és :154).
  //
  // Nem feledékenység: beállítva ELTÖRNÉ AZ ÖSSZES CMS-KÉPET. A Media
  // collection `url` és `sizes.*.url` mezőinek afterRead hookja
  // (node_modules/payload/dist/uploads/getBaseFields.js:98-107 és :190-197) a
  // `relative: false` + `serverURL: req.payload.config.serverURL` párossal hívja
  // a `generateFilePathOrURL`-t, az pedig a `formatAdminURL`-en át
  // (node_modules/payload/dist/utilities/formatAdminURL.js) így dönt:
  // `if (relative || !serverURL) return pathname` — különben
  // `new URL(pathnameWithBase, serverURLObj.origin).toString()`, tehát ABSZOLÚT
  // URL. A storefront viszont a `next/image`-nek adja tovább ezt az értéket
  // (src/components/content/MediaImage.tsx), a next.config.ts-ben pedig NINCS
  // `images.remotePatterns` — abszolút, „távoli" forrásra a `/_next/image`
  // élesben 400-at ad („url" parameter is not allowed). Üres `serverURL`
  // mellett a hook GYÖKÉR-RELATÍV utat ad vissza, ami a saját eredetről
  // szolgálódik ki. (Ha valaha mégis kell abszolút gyökér, előbb az
  // `images.remotePatterns` bővítendő — együtt, egy változtatásban.)
  //
  // Amit a `serverURL` elhagyása NEM vesz el:
  //  - a CSRF-védelmet: az `extractJWT` cookie-ága KIZÁRÓLAG a
  //    `payload.config.csrf` listát nézi
  //    (node_modules/payload/dist/auth/extractJWT.js:18-37);
  //  - a CORS-fejléceket: a `headersWithCors` KIZÁRÓLAG a
  //    `req.payload.config.cors`-t nézi
  //    (node_modules/payload/dist/utilities/headersWithCors.js).
  // Mellékhaszon: a `sanitize.js:340-342` csak nem üres `serverURL` esetén fűzi
  // a `csrf` listához a teljes URL-t, tehát így duplikátum sem keletkezik.
  //
  // -------------------------------------------------------------------------
  // CORS/CSRF-engedélylista — a deploy TÉNYLEGES eredetéhez szögezve.
  //
  // Beállítás nélkül a `csrf` üres, és az `extractJWT` üres listánál MINDEN
  // eredetről elfogadja a süti-tokent (extractJWT.js:21 és :27). Az explicit
  // lista ezt zárja le. Az éles eredet ma EGYETLEN érték:
  // `https://kineticare-production.up.railway.app` — a Railway service-doménje,
  // egyedi domén nincs (docs/atadas-szamlazz-kor.md).
  //
  // MIRE TERJED KI (a hatókör nagyobb, mint az admin-bejelentkezés): az
  // `extractJWT` minden `payload.auth({ headers })` hívásnál lefut, tehát az
  // eredet-eltérés nem csak az admin-loginra hat, hanem a PÉNZTÁRRA
  // (src/lib/checkout/route-handler.ts:54), a VIDEÓLEJÁTSZÁSRA
  // (src/lib/stream/route-handler.ts:49), a HALADÁS-MENTÉSRE
  // (src/lib/course-progress/route-handler.ts:44), a rendelés-státuszra
  // (src/lib/checkout/order-status-handler.ts:34), a visszatérítésre
  // (src/lib/refund/route-handler.ts:70), a kézi hozzáférés-adásra
  // (src/lib/grant-purchase-route.ts:58), az admin-előnézetre
  // (src/lib/preview/route-handler.ts:61) és a bejelentkezést igénylő
  // storefront-oldalak szerver-oldali renderére (/fiok, /kurzusaim, /penztar,
  // /kosar, /fizetes/koszonom …) is. Rossz `NEXT_PUBLIC_SERVER_URL` mellett
  // ezek MIND 401-et / kijelentkezett állapotot adnának.
  //
  // ORIGIN NÉLKÜLI KÉRÉS — tartalék szabály: ha nincs `Origin` fejléc (tipikusan
  // GET-navigáció), az `extractJWT` a `Sec-Fetch-Site`-ra vált
  // (extractJWT.js:30-37): `same-origin` / `same-site` / `none` elfogadva,
  // `cross-site` ÉS A FEJLÉC HIÁNYA elutasítva. Következmény: egy KÜLSŐ oldalról
  // (levélből, keresőből) érkező első oldalletöltés kijelentkezettnek látszhat,
  // a helyben indított navigációk viszont `same-origin`-ok. Nem-böngészős,
  // sütis kliensünk NINCS: a süti-hitelesítést használó végpontokat kivétel
  // nélkül a saját frontendünk hívja, a szerver-szerver forgalom (Barion
  // callback, Railway healthcheck, Számlázz.hu) pedig süti nélküli.
  //
  // A Railway healthcheckjét (`/admin`, railway.json) nem érinti: az egy
  // Origin-fejléc és süti nélküli, szerver-szerver GET — a CORS-fejlécek csak
  // Origin jelenlétében kerülnek a válaszba, a CSRF-lista pedig kizárólag a
  // sütis hitelesítésre vonatkozik. A healthcheck akkor is 200-at kap, ha a
  // belső cím eltér a publikus URL-től.
  //
  // ÜZEMELTETÉSI KÖVETKEZMÉNY: a `NEXT_PUBLIC_SERVER_URL`-nek pontosan azt az
  // eredetet kell tartalmaznia, amit a látogatók és a szerkesztők a böngészőben
  // megnyitnak. Ha az appot másik hoszton (pl. új egyedi doménen vagy `www.`
  // előtaggal) is elérhetővé tesszük, azt az eredetet is ide kell venni,
  // különben ott minden sütis művelet elhasal.
  cors: corsAllowlist,
  csrf: csrfAllowlist,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // A pool-beállítások a Railway privát hálózatához vannak hangolva: az
  // elvágott, tétlen TCP-kapcsolatokon a `pg` egyébként ~45 mp-ig (a TCP
  // retransmission-timeoutig) vár, majd „Connection terminated unexpectedly"
  // hibával dől el — emiatt akadt el korábban az admin user létrehozása is.
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      // TCP keepalive: életben tartja a kapcsolatot, és a megszakadást
      // másodpercek alatt észreveszi a percek helyett.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      // A pool a hálózat előtt dobja el a tétlen kapcsolatot, hogy sose
      // használjon újra olyan socketet, amit a privát háló már elvágott.
      idleTimeoutMillis: 30_000,
      // Fail-fast: ha 10 mp alatt nincs kapcsolat, hiba jöjjön, ne fagyás.
      connectionTimeoutMillis: 10_000,
      // Egyetlen kérés se álljon percekig egy beragadt lekérdezésen.
      statement_timeout: 30_000,
      query_timeout: 30_000,
      // C13 — a 2026-08-06-i sorzár-incidens ellenszere. Akkor egy nyitva
      // maradt, TÉTLEN tranzakció („idle in transaction", a kliens EOF-ja után
      // is nyitva ragadva) zárolta a `users` sort, és minden írás/bejelentkezés
      // befagyott, miközben az olvasás gyors maradt. A statement_timeout ezen
      // nem segít: az a futó LEKÉRDEZÉST öli meg, itt viszont éppen nem futott
      // lekérdezés. A Postgres ezt a beállítást a kapcsolat startup-paramétereként
      // kapja meg (a `pg` a pool-configból továbbadja), így nem kell DB-oldali
      // ALTER SYSTEM: minden pool-kapcsolat magával viszi.
      //
      // A migrate/seed útvonalat nem töri el: a Postgres csak azt a session-t
      // bontja, amelyik nyitott tranzakcióval TÉTLEN — a folyamatosan utasítást
      // futtató (tehát `active` állapotú) hosszú migráció vagy seed nem esik
      // bele, a mérce a két utasítás közti szünet, nem a tranzakció hossza.
      // 60 mp bőven a statement_timeout fölött van, így normál működés közben
      // nem tud beütni.
      idle_in_transaction_session_timeout: 60_000,
    },
  }),
  sharp,
  // T-019 lezárás: a feltölthető fájlok mérete globálisan max. 10 MB (bájtban).
  // Collection-szintű fileSize-limit a pinned 3.86.0-ban nem elérhető, ezért a
  // korlát a globális upload.limits.fileSize mezőn kerül beállításra.
  upload: {
    limits: {
      fileSize: 10485760,
    },
    // K1: abortOnLimit nélkül a multipart-parser a túlméretes fájlt NÉMÁN
    // CSONKOLNÁ (truncated: true), és a feltöltés sikeresnek látszana egy
    // hibás fájllal. Bekapcsolva a parser a limit elérésekor 413-at dob a
    // responseOnLimit üzenettel (payload/dist/uploads/fetchAPI-multipart/
    // processMultipart.js — a config upload-blokkja 1:1-ben a parser
    // opcióira megy, utilities/addDataAndFileToRequest.js).
    abortOnLimit: true,
    responseOnLimit: 'A fájl mérete meghaladja a megengedett 10 MB-os korlátot.',
  },
  onInit,
  plugins: [
    // ecommerce plugin pinned — frissítés csak changelog + staging-E2E után.
    // A részletes konfiguráció (HUF, customers=users, variants/addresses/guest cart
    // kikapcsolva, products/orders override-ok) az src/plugins/ecommerce.ts-ben él.
    ecommerce,
    // T-015: config-szintű audit-hook injekció — az ecommerce UTÁN kell futnia,
    // hogy a products/orders collectionök már létezzenek az injekciókor.
    audit,
    // T-018: users auth e-mail sablonok (forgot-password) config-injekcióval.
    usersAuthEmails,
    // T-016: form-builder plugin pinned 3.86.0 — a nyilvános beküldés a plugin
    // form-submissions endpointján megy (külön POST /api/contact route nincs).
    formBuilderPlugin({
      // Az űrlapok és a beküldések saját admin-csoportot kapnak, magyar
      // megnevezéssel — a tartalom és a webshop mellé, jól elkülönítve.
      formOverrides: {
        labels: {
          singular: 'Űrlap',
          plural: 'Űrlapok',
        },
        admin: {
          group: 'Űrlapok',
          description: 'A weboldal űrlapjai (pl. Kapcsolat). A mezőket itt lehet átszabni.',
        },
        access: {
          // M2: az űrlapok SZERKESZTÉSE staff+owner-jog. A plugin csak a
          // read-et tölti ki (nyilvános — az marad, a nyilvános űrlap-render
          // kéri); a create/update/delete-re a szanitizálás a „bármely
          // bejelentkezett felhasználó" defaultAccess-t tenné
          // (payload/auth/defaultAccess.js), így egy customer átírhatná a
          // kapcsolat-űrlap mezőit és a beküldési e-mail-címet
          // (PII-szivárgás). Az isAdmin = owner/staff (src/access).
          create: isAdmin,
          update: isAdmin,
          delete: isAdmin,
        },
      },
      formSubmissionOverrides: {
        labels: {
          singular: 'Űrlapbeküldés',
          plural: 'Űrlapbeküldések',
        },
        admin: {
          group: 'Űrlapok',
          description: 'A látogatók által beküldött üzenetek. Csak olvasásra való.',
          // A plugin nem ad defaultColumns-t, ezért a Payload automatikus
          // választása szerepelt: azonosító és Turnstile-token — a szerkesztőnek
          // egyik sem mond semmit. Az űrlap neve + a beérkezés ideje kell.
          defaultColumns: ['form', 'createdAt', 'id'],
        },
        access: {
          // Admin oldalon staff+owner olvashatja/kezelheti a beküldéseket;
          // a create a plugin defaultja marad (nyilvános űrlap-beküldés).
          read: isAdmin,
          update: isAdmin,
          delete: isAdmin,
        },
        fields: ({ defaultFields }) => [
          ...defaultFields,
          {
            name: 'turnstileToken',
            type: 'text',
            admin: {
              readOnly: true,
              description:
                'Cloudflare Turnstile spam-ellenőrző token — csak akkor kötelező, ha a TURNSTILE_SECRET_KEY be van állítva.',
            },
          },
        ],
        hooks: {
          // A sorrend számít: előbb a helyi mező-/consent-ellenőrzés (K2),
          // utána a külső Turnstile-hívás.
          beforeValidate: [validateContactSubmission, async ({ data }) => verifyTurnstile(data)],
          afterChange: [async ({ doc, operation }) => notifyStaffOnSubmission({ doc, operation })],
        },
      },
    }),
    // Az admin oldalsáv csoport-sorrendje — a lánc VÉGÉN kell futnia, hogy a
    // plugin-collectionöket (webshop, űrlapok) is besorolja.
    adminGroups,
  ],
  // A SZANITIZÁLÁS UTÁNI lépés (S2/c). A `jobs.scheduling` bekapcsolásával a
  // Payload maga tol be egy `payload-jobs-stats` globalt, access nélkül —
  // amire a szanitizálás a „bármely bejelentkezett felhasználó" defaultot teszi,
  // olvasásra ÉS ÍRÁSRA. Mivel a global csak a szanitizálás közben jön létre,
  // előre nem konfigurálható: a zár a `buildConfig` EREDMÉNYÉRE kerül.
  // A részletes indoklás (miért nem végpont-szűrő, és miért nem töri el a saját
  // ütemezést) az src/jobs/jobs-stats-access.ts fejlécében.
}).then(restrictJobStatsGlobalAccess)
