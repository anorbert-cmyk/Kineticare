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
 *  1. demó-tartalom (owner, kategóriák, oldal, bejegyzés, termék, menüfa) — a
 *     menüfa végén a VALÓS navigációs struktúra is (src/lib/menu-seed.ts),
 *     amely élesben a `npm run seed:menu` scripttel futtatható önállóan,
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

import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'

import { getPayload, type Payload } from 'payload'

import {
  buildHomeLayout,
  ensureHomeImages,
  ensureHomeLayout,
  ensureHomeTestimonials,
  minimalRichText,
  type HomeMediaIds,
} from '../lib/home-seed'
import { ensureMediaFiles } from '../lib/media-restore'
import { ensureNavigationMenu } from '../lib/menu-seed'
import { ensureNewsletterForm } from '../lib/newsletter/form'
import { validatePasswordStrength } from '../lib/security/password-policy'
import config from '../payload.config'

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@kineticare.local'

/**
 * Kriptográfiailag véletlen induló jelszó (`node:crypto`).
 *
 * A korábbi `Math.random()` NEM kriptográfiai generátor: kimenete a belső
 * állapotból kikövetkeztethető, és az entrópiája a jelszó hosszától
 * függetlenül alacsony — egy seedelt telepítés owner-fiókjának jelszavához ez
 * kevés. A `randomBytes` az OS entrópiaforrásából dolgozik.
 *
 * A base64url ábécé nem garantálja mindhárom karakterosztályt, a
 * jelszó-politika (kis- és nagybetű + szám, min. 12 karakter) viszont a 2.
 * felhasználótól kezdve minden create-re lefut — ezért addig húzunk új
 * véletlent, amíg a jelöltet a politika elfogadja. (Az első felhasználónál a
 * hook átengedi, de a seed nem feltételezheti, hogy üres az adatbázis.)
 */
function generateOwnerPassword(): string {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const candidate = randomBytes(12).toString('base64url')
    if (validatePasswordStrength({ password: candidate, email: OWNER_EMAIL }).length === 0) {
      return candidate
    }
  }
  // Elvi ág: 16 próbálkozás után is politikasértő jelszó gyakorlatilag
  // lehetetlen — csendben gyenge jelszót viszont SOSEM adunk vissza.
  throw new Error('Nem sikerült a jelszó-politikának megfelelő owner-jelszót generálni.')
}

// A kezdőlap-alapállapot logikája a src/lib/home-seed.ts-ben él (az onInit is
// azt futtatja); a tesztek kedvéért a buildHomeLayout innen is elérhető marad.
export { buildHomeLayout, type HomeMediaIds }

/**
 * A deploykor elveszett képfájlok visszatöltése (src/lib/media-restore.ts).
 *
 * A kép-helyreállításnak a layout-betöltés ELŐTT kell futnia: az
 * `ensureHomeImages` fájlnév-deduppal dolgozik, tehát a meglévő DB-rekordokat
 * látva kihagyná a hiányzó fájlok pótlását. Best-effort — az onInit
 * `ensureHomeBaseline` mintájára —, mert a seed többi lépését nem akaszthatja
 * meg egy fájlrendszer-hiba.
 */
async function restoreMediaFilesBestEffort(payload: Payload): Promise<void> {
  try {
    await ensureMediaFiles(payload)
  } catch (error) {
    payload.logger.warn(
      `Seed: a képfájlok helyreállítása sikertelen (best-effort): ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

async function seed(): Promise<void> {
  const payload = await getPayload({ config })

  // --- Szűkített hatókör (SEED_SCOPE=kezdolap) -------------------------------
  // Éles környezetben CSAK ezt futtatjuk: a landing tartalmi képei a Médiatárba
  // + a kezdőlap alap-szekciósora. A demó-tartalmi lépések (owner-felhasználó,
  // kategóriák, oldalak, demó-poszt, demó-termék, menü) élesben nem jöhetnek
  // létre — azok a fejlesztői/üres-adatbázisos teljes seed részei maradnak.
  // Mindkét lépés idempotens, és meglévő szekciósort sosem ír felül.
  if (process.env.SEED_SCOPE === 'kezdolap') {
    await restoreMediaFilesBestEffort(payload)
    const homeMediaIds = await ensureHomeImages(payload)
    await ensureHomeLayout(payload, homeMediaIds)
    await ensureHomeTestimonials(payload)
    // A lábléc MINDEN oldalon megjelenik, ezért a „Hírlevél" űrlap telepítési
    // előfeltétel — a szűkített (éles) hatókörben is létre kell jönnie,
    // különben a feliratkozó-blokk élesben némán kimaradna.
    await ensureNewsletterForm(payload)
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
    const password = process.env.SEED_OWNER_PASSWORD ?? generateOwnerPassword()

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

  // A VALÓS menüstruktúra (Szolgáltatások + almenü, Tudástár) — ugyanaz a
  // label+parent dedup, mint fent, ezért a fenti demó-menüpontokat nem
  // duplikálja és nem írja felül. Élesben ugyanez a lépés a `npm run seed:menu`
  // scripttel futtatható önállóan (src/lib/menu-seed.ts).
  await ensureNavigationMenu(payload)

  // --- Kezdőlapi képek + alap-szekciósor -------------------------------------
  await restoreMediaFilesBestEffort(payload)
  const homeMediaIds = await ensureHomeImages(payload)
  await ensureHomeLayout(payload, homeMediaIds)
  await ensureHomeTestimonials(payload)

  // --- Lábléc hírlevél-űrlapja (C9) ------------------------------------------
  // A form-builder űrlap ADAT (a `forms` collection egy sora), nem séma: nincs
  // hozzá migráció. Idempotens — meglévő űrlapot SOHA nem ír felül, mert azt a
  // szerkesztő már átszabhatta.
  await ensureNewsletterForm(payload)

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
