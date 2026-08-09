/**
 * Seed-script — feltölti a demó/induló tartalmat, idempotens módon:
 * minden entitást egy egyedi kulcs (email / slug / sku / fájlnév) alapján keres
 * meg, és csak akkor hozza létre, ha még nem létezik. Így többször futtatva sem
 * duplikál.
 *
 * Futtatás: npm run seed (DATABASE_URI és PAYLOAD_SECRET környezeti változókkal).
 *
 * Az owner-jelszó NEM a repóban él: a SEED_OWNER_PASSWORD környezeti változóval
 * felülírható; hiányában a script egyszeri, véletlenszerű jelszót generál és ír ki
 * (csak az owner létrehozásakor).
 *
 * A script két nagy lépésből áll:
 *  1. demó-tartalom (owner, kategóriák, oldal, bejegyzés, termék, menüfa),
 *  2. a KEZDŐLAP szekció-rendszere (docs/szekcio-rendszer-terv.md 6. pont):
 *     a landing tartalmi képei a Médiatárba, majd a `kezdolap` oldal `layout`
 *     mezőjébe a terv 4. pontja szerinti alap-szekciósor, a landing VALÓS
 *     szövegeivel. A layout csak akkor íródik, ha a kezdőlapnak még NINCS
 *     szekciósora — meglévőt a seed SOHA nem ír felül, mert az már a lányok
 *     szerkesztői munkája.
 *
 * A modul importálható mellékhatás nélkül (a `seed()` csak közvetlen
 * futtatáskor indul), így a `buildHomeLayout` alap-layout tesztből is
 * asszertálható — lásd a fájl végén az indítás-kaput.
 */

import { pathToFileURL } from 'node:url'

import { getPayload } from 'payload'

import {
  buildHomeLayout,
  ensureHomeImages,
  ensureHomeLayout,
  minimalRichText,
  type HomeMediaIds,
} from '../lib/home-seed'
import config from '../payload.config'

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@kineticare.local'

// A kezdőlap-alapállapot logikája a src/lib/home-seed.ts-ben él (az onInit is
// azt futtatja); a tesztek kedvéért a buildHomeLayout innen is elérhető marad.
export { buildHomeLayout, type HomeMediaIds }

async function seed(): Promise<void> {
  const payload = await getPayload({ config })

  // --- Szűkített hatókör (SEED_SCOPE=kezdolap) -------------------------------
  // Éles környezetben CSAK ezt futtatjuk: a landing tartalmi képei a Médiatárba
  // + a kezdőlap alap-szekciósora. A demó-tartalmi lépések (owner-felhasználó,
  // kategóriák, oldalak, demó-poszt, demó-termék, menü) élesben nem jöhetnek
  // létre — azok a fejlesztői/üres-adatbázisos teljes seed részei maradnak.
  // Mindkét lépés idempotens, és meglévő szekciósort sosem ír felül.
  if (process.env.SEED_SCOPE === 'kezdolap') {
    const homeMediaIds = await ensureHomeImages(payload)
    await ensureHomeLayout(payload, homeMediaIds)
    payload.logger.info('Seed: kész (hatókör: kezdolap).')
    return
  }

  // --- Owner-felhasználó -----------------------------------------------------
  const existingOwner = await payload.find({
    collection: 'users',
    where: { email: { equals: OWNER_EMAIL } },
    limit: 1,
    overrideAccess: true,
  })

  let ownerId: number

  if (existingOwner.docs.length > 0) {
    ownerId = existingOwner.docs[0].id
    payload.logger.info(`Seed: owner-felhasználó már létezik (${OWNER_EMAIL}), kihagyva.`)
  } else {
    const password = process.env.SEED_OWNER_PASSWORD ?? Math.random().toString(36).slice(2, 18)

    const owner = await payload.create({
      collection: 'users',
      data: {
        email: OWNER_EMAIL,
        password,
        name: 'Kineticare Owner',
        role: 'owner',
      },
      overrideAccess: true,
    })
    ownerId = owner.id
    payload.logger.info(`Seed: owner-felhasználó létrehozva (${OWNER_EMAIL}).`)
    if (!process.env.SEED_OWNER_PASSWORD) {
      payload.logger.info(`Seed: az owner induló jelszava: ${password}`)
    }
  }

  // --- Kategóriák ------------------------------------------------------------
  const ensureCategory = async (input: {
    title: string
    slug: string
    type: 'content' | 'product'
  }): Promise<number> => {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: input.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      payload.logger.info(`Seed: kategória már létezik (${input.slug}), kihagyva.`)
      return existing.docs[0].id
    }
    const created = await payload.create({
      collection: 'categories',
      data: {
        title: input.title,
        slug: input.slug,
        type: input.type,
      },
      overrideAccess: true,
    })
    payload.logger.info(`Seed: kategória létrehozva (${input.slug}).`)
    return created.id
  }

  const contentCategoryId = await ensureCategory({
    title: 'Tudástár',
    slug: 'tudastar',
    type: 'content',
  })
  const productCategoryId = await ensureCategory({
    title: 'Kézrehabilitációs kurzusok',
    slug: 'kezrehabilitacios-kurzusok',
    type: 'product',
  })

  // --- Demó oldal ------------------------------------------------------------
  const existingPage = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'bemutatkozas' } },
    limit: 1,
    overrideAccess: true,
  })
  if (existingPage.docs.length > 0) {
    payload.logger.info('Seed: demó oldal már létezik (bemutatkozas), kihagyva.')
  } else {
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Bemutatkozás',
        slug: 'bemutatkozas',
        excerpt: 'A Kineticare kézrehabilitációs kurzusplatform bemutatkozó oldala.',
        content: minimalRichText('Üdvözöl a Kineticare — ez a bemutatkozó demó oldal.'),
        // A `status` a `_status`-ból szinkronizálódik (src/lib/publish-status.ts),
        // ezért a kettőt együtt kell megadni — `_status` nélkül a rekord piszkozat
        // maradna, és a demó oldal nem jelenne meg a storefronton.
        status: 'published',
        _status: 'published',
        publishedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    payload.logger.info('Seed: demó oldal létrehozva (bemutatkozas).')
  }

  // --- Demó bejegyzés --------------------------------------------------------
  const existingPost = await payload.find({
    collection: 'posts',
    where: { slug: { equals: 'kezrehabilitacio-alapok' } },
    limit: 1,
    overrideAccess: true,
  })
  if (existingPost.docs.length > 0) {
    payload.logger.info('Seed: demó bejegyzés már létezik (kezrehabilitacio-alapok), kihagyva.')
  } else {
    await payload.create({
      collection: 'posts',
      data: {
        title: 'Kézrehabilitáció alapok',
        slug: 'kezrehabilitacio-alapok',
        excerpt: 'Bevezető a kézrehabilitációs gyakorlatok világába.',
        content: minimalRichText('Ez a demó bejegyzés a kézrehabilitáció alapjairól.'),
        // Lásd a demó oldalnál: a `status` a `_status`-ból szinkronizálódik.
        status: 'published',
        _status: 'published',
        publishedAt: new Date().toISOString(),
        author: ownerId,
        categories: [contentCategoryId],
      },
      overrideAccess: true,
    })
    payload.logger.info('Seed: demó bejegyzés létrehozva (kezrehabilitacio-alapok).')
  }

  // --- Demó termék (kurzus) --------------------------------------------------
  const existingProduct = await payload.find({
    collection: 'products',
    where: { sku: { equals: 'DEMO-KEZREHAB-001' } },
    limit: 1,
    overrideAccess: true,
  })
  if (existingProduct.docs.length > 0) {
    payload.logger.info('Seed: demó termék már létezik (DEMO-KEZREHAB-001), kihagyva.')
  } else {
    await payload.create({
      collection: 'products',
      data: {
        sku: 'DEMO-KEZREHAB-001',
        shortDescription: 'Demó kézrehabilitációs kurzus a platform kipróbálásához.',
        priceInHUFEnabled: true,
        priceInHUF: 19990,
        category: productCategoryId,
        status: 'published',
        _status: 'published',
      },
      overrideAccess: true,
    })
    payload.logger.info('Seed: demó termék létrehozva (DEMO-KEZREHAB-001).')
  }

  // --- Demó menüfa (frontend-keret) ------------------------------------------
  const pageId = (
    await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'bemutatkozas' } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]?.id
  const postId = (
    await payload.find({
      collection: 'posts',
      where: { slug: { equals: 'kezrehabilitacio-alapok' } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]?.id
  const productId = (
    await payload.find({
      collection: 'products',
      where: { sku: { equals: 'DEMO-KEZREHAB-001' } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]?.id

  const ensureMenuItem = async (input: {
    label: string
    type: 'page' | 'post' | 'url' | 'product'
    order: number
    ref?: { relationTo: 'pages' | 'posts' | 'products'; value: number }
    url?: string
    parent?: number
  }): Promise<number | undefined> => {
    const existing = await payload.find({
      collection: 'menus',
      where: {
        and: [
          { label: { equals: input.label } },
          input.parent !== undefined
            ? { parent: { equals: input.parent } }
            : { parent: { exists: false } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      payload.logger.info(`Seed: menüpont már létezik (${input.label}), kihagyva.`)
      return existing.docs[0].id
    }
    const created = await payload.create({
      collection: 'menus',
      data: {
        label: input.label,
        type: input.type,
        order: input.order,
        ...(input.ref ? { ref: input.ref } : {}),
        ...(input.url ? { url: input.url } : {}),
        ...(input.parent !== undefined ? { parent: input.parent } : {}),
      },
      overrideAccess: true,
    })
    payload.logger.info(`Seed: menüpont létrehozva (${input.label}).`)
    return created.id
  }

  await ensureMenuItem({ label: 'Kezdőlap', type: 'url', url: '/', order: 0 })
  const coursesMenuId = await ensureMenuItem({
    label: 'Kurzusok',
    type: 'url',
    url: '/kurzusok',
    order: 1,
  })
  if (productId !== undefined && coursesMenuId !== undefined) {
    await ensureMenuItem({
      label: 'Demó kézrehabilitációs kurzus',
      type: 'product',
      ref: { relationTo: 'products', value: productId },
      parent: coursesMenuId,
      order: 0,
    })
  }
  if (postId !== undefined) {
    await ensureMenuItem({
      label: 'Tudástár',
      type: 'post',
      ref: { relationTo: 'posts', value: postId },
      order: 2,
    })
  }
  if (pageId !== undefined) {
    await ensureMenuItem({
      label: 'Bemutatkozás',
      type: 'page',
      ref: { relationTo: 'pages', value: pageId },
      order: 3,
    })
  }

  // --- Kezdőlapi képek + alap-szekciósor -------------------------------------
  const homeMediaIds = await ensureHomeImages(payload)
  await ensureHomeLayout(payload, homeMediaIds)

  payload.logger.info('Seed: kész.')
}

/**
 * Indítás-kapu: a seed CSAK közvetlen futtatáskor indul el (npm run seed).
 * Importálva — például a `buildHomeLayout` alap-layoutot ellenőrző tesztből —
 * a modul mellékhatás nélkül töltődik be, adatbázis-kapcsolat nélkül.
 */
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed: hiba történt.', error)
      process.exit(1)
    })
}
