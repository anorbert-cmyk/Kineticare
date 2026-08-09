import { postgresAdapter } from '@payloadcms/db-postgres'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { FixedToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { hu } from '@payloadcms/translations/languages/hu'
import path from 'node:path'
import { APIError, buildConfig, type Access, type Payload } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

import { AuditLogs } from './collections/AuditLogs'
import { ensureHomeImages, ensureHomeLayout } from './lib/home-seed'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Menus } from './collections/Menus'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { WebhookEvents } from './collections/WebhookEvents'
import { jobsConfig } from './jobs'
import { contactStaffEmail, kineticareEmailAdapter, sendMail, usersAuthEmails } from './lib/email'
import { createFormSubmissionRateLimitHook } from './lib/form-submission-rate-limit'
import { logger } from './lib/logger'
import { adminGroups } from './plugins/admin-groups'
import { audit } from './plugins/audit'
import { ecommerce } from './plugins/ecommerce'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Admin-szerepkör (owner/staff) — a form-submissions olvasásához. */
const isAdmin: Access = ({ req }) => req.user?.role === 'owner' || req.user?.role === 'staff'

// ---------------------------------------------------------------------------
// T-016: kapcsolat űrlap — beküldés-kezelés (spam-védelem + staff-értesítő)
// ---------------------------------------------------------------------------

/**
 * Turnstile-előkészítés: a form-submissions rekord opcionális turnstileToken
 * mezőjét a TURNSTILE_SECRET_KEY jelenléte kapcsolja be — env nélkül a
 * spam-ellenőrzés KI van kapcsolva (DEV/staging kényelmi funkció; production-ben
 * a kulcs kötelező, az induláskori ENV-assert megakadályozza a védtelen éles
 * futást — lásd src/env.ts). A beküldés előtt a formSubmission rate-limit is
 * lefut (külön beforeValidate hook). (A kliensoldali widget a TURNSTILE_SITE_KEY-val
 * kerül a frontendre egy későbbi sprintben.)
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
 * Kezdőlap-alapállapot indulásnál: a landing tartalmi képei + a `kezdolap`
 * alap-szekciósora (src/lib/home-seed.ts). Az ensureContactForm mintája:
 * telepítési előfeltétel, ezért minden bootnál lefut — idempotens, meglévő
 * képet és kitöltött szekciósort SOHA nem ír felül, így beállt rendszeren
 * néhány olcsó olvasás az ára. Best-effort: hibája nem állíthatja meg az appot.
 */
async function ensureHomeBaseline(payload: Payload): Promise<void> {
  try {
    const mediaIds = await ensureHomeImages(payload)
    await ensureHomeLayout(payload, mediaIds)
  } catch (error) {
    logger.warn('Kezdőlap-alapállapot ellenőrzése/betöltése sikertelen (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function ensureContactForm(payload: Payload): Promise<void> {
  registerPoolErrorHandler(payload)
  await ensureHomeBaseline(payload)
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
  // A titok kötelező — az induláskori ENV-assert (src/env.ts + src/instrumentation.ts)
  // gondoskodik róla, hogy hiányában az app ne induljon el.
  secret: process.env.PAYLOAD_SECRET || '',
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
  },
  onInit: ensureContactForm,
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
      },
      formSubmissionOverrides: {
        labels: {
          singular: 'Űrlapbeküldés',
          plural: 'Űrlapbeküldések',
        },
        admin: {
          group: 'Űrlapok',
          description: 'A látogatók által beküldött üzenetek. Csak olvasásra való.',
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
          // Rate-limit ELŐBB fut, mint a Turnstile (olcsó, külső hívás nélküli
          // flood-fal — a Turnstile-logika érintetlen marad).
          beforeValidate: [
            createFormSubmissionRateLimitHook(),
            async ({ data }) => verifyTurnstile(data),
          ],
          afterChange: [async ({ doc, operation }) => notifyStaffOnSubmission({ doc, operation })],
        },
      },
    }),
    // Az admin oldalsáv csoport-sorrendje — a lánc VÉGÉN kell futnia, hogy a
    // plugin-collectionöket (webshop, űrlapok) is besorolja.
    adminGroups,
  ],
})
