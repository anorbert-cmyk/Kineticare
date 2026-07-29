/**
 * Seed-script VÁZ (Sprint 0 / G0).
 *
 * Cél: a G0 „seed fut" kritérium teljesítése — a script lefut hiba nélkül akkor
 * is, ha a collections még nem léteznek (azokat Sprint 1 hozza). Minden lépés
 * idempotens (létező entitást nem duplikál) és a hiányzó részek graceful
 * no-oppal, figyelmeztető naplóüzenettel kimaradnak.
 *
 * Futtatás: `npm run seed` (a script-cél a package.jsonban: `src/scripts/seed.ts`).
 *
 * TODO(Sprint 1): ahogy a collections elkészülnek, a lenti TODO-kommentek
 * szerint kell a vázat véglegesíteni (mezőnevek, role, richText, ármezők).
 */

import { randomUUID } from 'node:crypto'

import { getPayload } from 'payload'

import { logger as rootLogger } from '../lib/logger'
import configPromise from '../payload.config'

const log = rootLogger.child({ requestId: randomUUID(), script: 'seed' })

/**
 * Minimális strukturális felület a Payload local API-hoz.
 * TODO(Sprint 1): cserélhető a generált típusokból származó valódi `Payload`
 * típusra, amint a collections (és a `payload-types` generálás) elkészülnek.
 */
interface PayloadLike {
  find(options: {
    collection: string
    where?: Record<string, unknown>
    limit?: number
    depth?: number
  }): Promise<{ docs: unknown[]; totalDocs: number }>
  create(options: {
    collection: string
    data: Record<string, unknown>
  }): Promise<unknown>
  collections: Record<string, unknown>
}

interface SeedSummary {
  completedSteps: number
  failedSteps: number
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function hasCollection(payload: PayloadLike, slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(payload.collections, slug)
}

/**
 * Idempotens beszúrás: csak akkor hoz létre entitást, ha a `where` feltételre
 * még nincs találat. Hiányzó collection esetén graceful no-op (Sprint 1 váz).
 */
async function ensureDocument(
  payload: PayloadLike,
  options: {
    collection: string
    label: string
    where: Record<string, unknown>
    data: Record<string, unknown>
  },
): Promise<void> {
  if (!hasCollection(payload, options.collection)) {
    log.info(
      `"${options.label}" kihagyva: a(z) "${options.collection}" collection még nem létezik (Sprint 1 hozza).`,
      { collection: options.collection },
    )
    return
  }
  const existing = await payload.find({
    collection: options.collection,
    where: options.where,
    limit: 1,
    depth: 0,
  })
  if (existing.totalDocs > 0) {
    log.info(`"${options.label}" már létezik — nem duplikáljuk (idempotens).`, {
      collection: options.collection,
    })
    return
  }
  await payload.create({ collection: options.collection, data: options.data })
  log.info(`"${options.label}" létrehozva.`, { collection: options.collection })
}

/** Egy lépés hibája nem állítja meg a többit; a summary jelzi a kihagyást. */
async function runStep(
  name: string,
  step: () => Promise<void>,
  summary: SeedSummary,
): Promise<void> {
  try {
    await step()
    summary.completedSteps += 1
  } catch (error) {
    summary.failedSteps += 1
    log.warn(`Seed-lépés kihagyva hiba miatt: ${name}`, { error: errorMessage(error) })
  }
}

async function seedOwnerUser(payload: PayloadLike): Promise<void> {
  // TODO(Sprint 1): amint a users collection role-mezője elkészül, a create
  // data-hoz hozzáadandó: role: 'owner' (vagy a tényleges owner-jogosultság).
  const email = process.env.SEED_OWNER_EMAIL
  const password = process.env.SEED_OWNER_PASSWORD
  if (!email || !password) {
    log.warn(
      'SEED_OWNER_EMAIL vagy SEED_OWNER_PASSWORD nincs beállítva — owner-user lépés kihagyva.',
    )
    return
  }
  // A jelszó sosem kerül a naplóba (a logger redact-listája is védi).
  await ensureDocument(payload, {
    collection: 'users',
    label: 'owner-user',
    where: { email: { equals: email } },
    data: { email, password },
  })
}

const SEED_CATEGORIES = [
  { title: 'Otthoni', slug: 'otthoni' },
  { title: 'Szakmai', slug: 'szakmai' },
] as const

async function seedCategories(payload: PayloadLike): Promise<void> {
  // TODO(Sprint 1): a mezőneveket (title/slug) a tényleges categories
  // collection schemájához igazítani.
  for (const category of SEED_CATEGORIES) {
    await ensureDocument(payload, {
      collection: 'categories',
      label: `kategória: ${category.slug}`,
      where: { slug: { equals: category.slug } },
      data: { ...category },
    })
  }
}

async function seedDemoPage(payload: PayloadLike): Promise<void> {
  // TODO(Sprint 1): richText tartalom-blokkok és layout a pages collection
  // végleges schemája szerint.
  await ensureDocument(payload, {
    collection: 'pages',
    label: 'demó oldal',
    where: { slug: { equals: 'demo-oldal' } },
    data: { title: 'Demó oldal', slug: 'demo-oldal' },
  })
}

async function seedDemoPost(payload: PayloadLike): Promise<void> {
  // TODO(Sprint 1): richText tartalom és szerző-kapcsolat a posts collection
  // végleges schemája szerint.
  await ensureDocument(payload, {
    collection: 'posts',
    label: 'demó blogposzt',
    where: { slug: { equals: 'demo-blogposzt' } },
    data: { title: 'Demó blogposzt', slug: 'demo-blogposzt' },
  })
}

async function seedDemoCourseProduct(payload: PayloadLike): Promise<void> {
  // TODO(Sprint 1): az @payloadcms/plugin-ecommerce products collectionjéhez
  // igazítandó: ármező (HUF), kategória-kapcsolat, kurzus-specifikus mezők.
  // FONTOS: a fizetésjóváhagyáshoz a plugin confirmOrder függvénye TILOS —
  // a jóváhagyás saját, Barion-callback-vezérelt állapotgéppel történik
  // (részletek: CLAUDE.md, Tilos zónák).
  await ensureDocument(payload, {
    collection: 'products',
    label: 'demó kurzustermék',
    where: { slug: { equals: 'demo-kurzus' } },
    data: { title: 'Demó kurzus', slug: 'demo-kurzus' },
  })
}

async function main(): Promise<void> {
  log.info(
    'Seed-script indul (Sprint 0 váz) — a hiányzó collections graceful no-oppal kimaradnak.',
  )

  let payload: PayloadLike
  try {
    payload = (await getPayload({ config: configPromise })) as unknown as PayloadLike
  } catch (error) {
    log.error(
      'A Payload nem inicializálható — ellenőrizd az adatbázis-kapcsolatot és a környezeti változókat.',
      { error: errorMessage(error) },
    )
    process.exitCode = 1
    return
  }

  const summary: SeedSummary = { completedSteps: 0, failedSteps: 0 }

  await runStep('owner-user', () => seedOwnerUser(payload), summary)
  await runStep('kategóriák', () => seedCategories(payload), summary)
  await runStep('demó oldal', () => seedDemoPage(payload), summary)
  await runStep('demó blogposzt', () => seedDemoPost(payload), summary)
  await runStep('demó kurzustermék', () => seedDemoCourseProduct(payload), summary)

  log.info('Seed-script lefutott.', { ...summary })
}

main()
  .then(() => {
    // A nyitott DB-pool miatt explicit kilépés, különben a script lóghat.
    process.exit(process.exitCode ?? 0)
  })
  .catch((error: unknown) => {
    log.error('Váratlan hiba a seed-script futása közben.', { error: errorMessage(error) })
    process.exit(1)
  })
