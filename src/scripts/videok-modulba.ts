/**
 * A régi, fejezet nélküli videólista átemelése MODULBA — a haladás elvesztése
 * nélkül.
 *
 * ═══ MIÉRT KELL EZ A SCRIPT ═══
 * Az új tananyag-szerkezet (`products.modules`) mellett a régi `products.videos`
 * lista érintetlenül működik tovább (src/fields/course-modules.ts), tehát a
 * meglévő kurzusokhoz NEM kötelező hozzányúlni. Amint viszont a szerkesztő
 * fejezetekre akarja bontani a kurzust, kézzel újra felvinné a leckéket — és
 * ITT van a csendes csapda: az újonnan felvett lecke-sor ÚJ, generált
 * azonosítót (BSON ObjectID) kap, a `course-progress` sorok viszont a RÉGI
 * azonosítókra mutatnak. A haladás-számítás az ilyen „orphan" refet szó nélkül
 * eldobja (src/lib/curriculum/progress.ts), tehát MINDEN vásárló haladása
 * némán nullázódna — hibaüzenet nélkül.
 *
 * Ez a script ezt előzi meg: a videó-sorokat MEGTARTOTT AZONOSÍTÓVAL emeli át
 * egy modulba. A Payload az explicit módon megadott array-sor `id`-t
 * megőrzi (a `baseIDField` hookja csak hiányzó értéknél generál újat:
 * node_modules/payload/dist/fields/baseFields/baseIDField.js:12 —
 * `({ value }) => value || new ObjectId().toHexString()`); élesben ellenőrizve.
 *
 * ═══ AMIT NEM CSINÁL ═══
 * A `videos` tömböt NEM üríti ki. Két okból: (1) a művelet így visszafordítható
 * (a modul törlésével a régi viselkedés azonnal visszaáll), (2) a `videos`
 * marad a biztonsági másolat. Duplikáció nem keletkezik: ha van legalább egy
 * modul, a tananyag-modell a `videos` tömböt teljesen figyelmen kívül hagyja.
 *
 * ═══ HASZNÁLAT ═══
 *   npm run kurzus:videok-modulba -- --sku=DEMO-KEZREHAB-001
 *   npm run kurzus:videok-modulba -- --id=3 --cim="1. ALAPOK" --alkalmaz
 *
 * Kapcsolók:
 *   --id=<szám>      a kurzus azonosítója (vagy --sku)
 *   --sku=<szöveg>   a kurzus azonosító-neve
 *   --cim=<szöveg>   a létrejövő modul címe (alapértelmezés: „A kurzus videói")
 *   --alkalmaz       ENÉLKÜL a script csak KIÍRJA a tervet, és nem ír semmit
 *
 * Alapértelmezésben SZÁRAZ FUTÁS (dry run): tartalmi adatot módosító script
 * sosem írhat kérés nélkül.
 */

import { pathToFileURL } from 'node:url'

import { getPayload, type Payload } from 'payload'

import { LEGACY_MODULE_TITLE } from '../lib/curriculum/curriculum'
import { logger } from '../lib/logger'
import config from '../payload.config'
import type { Product } from '../payload-types'

interface Kapcsolok {
  id: number | null
  sku: string | null
  cim: string
  alkalmaz: boolean
}

/** A `--kulcs=érték` alakú kapcsolók feldolgozása. */
export function parseKapcsolok(argv: readonly string[]): Kapcsolok {
  const ertek = (kulcs: string): string | null => {
    const talalat = argv.find((arg) => arg.startsWith(`--${kulcs}=`))
    if (talalat === undefined) {
      return null
    }
    const nyers = talalat.slice(kulcs.length + 3).trim()
    return nyers.length > 0 ? nyers : null
  }
  const nyersId = ertek('id')
  const id = nyersId !== null && /^\d+$/.test(nyersId) ? Number(nyersId) : null
  return {
    id,
    sku: ertek('sku'),
    cim: ertek('cim') ?? LEGACY_MODULE_TITLE,
    alkalmaz: argv.includes('--alkalmaz'),
  }
}

/**
 * A videó-sorokból lecke-sorok — AZONOS azonosítóval, hogy a `course-progress`
 * hivatkozások érvényben maradjanak. A `kind` mindig `video`: a régi lista
 * kizárólag videókat tartalmazhatott.
 */
export function videokLeckekke(
  videos: NonNullable<Product['videos']>,
): NonNullable<NonNullable<Product['modules']>[number]['lessons']> {
  return videos.map((video, index) => ({
    // A megtartott azonosító a script LÉNYEGE — enélkül a haladás elvész.
    id: video.id ?? undefined,
    title: video.title ?? `${index + 1}. rész`,
    kind: 'video' as const,
    streamAssetId: video.streamAssetId ?? null,
    durationSec: video.durationSec ?? null,
    status: video.status ?? 'processing',
  }))
}

async function keresdKurzust(payload: Payload, kapcsolok: Kapcsolok): Promise<Product | null> {
  if (kapcsolok.id !== null) {
    try {
      return await payload.findByID({
        collection: 'products',
        id: kapcsolok.id,
        depth: 0,
        overrideAccess: true,
      })
    } catch {
      return null
    }
  }
  if (kapcsolok.sku !== null) {
    const talalat = await payload.find({
      collection: 'products',
      where: { sku: { equals: kapcsolok.sku } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return talalat.docs[0] ?? null
  }
  return null
}

async function futtat(): Promise<void> {
  const kapcsolok = parseKapcsolok(process.argv.slice(2))
  if (kapcsolok.id === null && kapcsolok.sku === null) {
    logger.error('Add meg a kurzust: --id=<szám> vagy --sku=<azonosító>')
    process.exitCode = 1
    return
  }

  const payload = await getPayload({ config })
  const kurzus = await keresdKurzust(payload, kapcsolok)
  if (kurzus === null) {
    logger.error('Nincs ilyen kurzus', { id: kapcsolok.id, sku: kapcsolok.sku })
    process.exitCode = 1
    return
  }

  const meglevoModulok = Array.isArray(kurzus.modules) ? kurzus.modules : []
  if (meglevoModulok.length > 0) {
    logger.error(
      'A kurzusnak MÁR VAN tananyag-modulja — a script nem ír felül szerkesztői munkát. Ha újra akarod kezdeni, előbb töröld a modulokat az adminban.',
      { productId: kurzus.id, modulokSzama: meglevoModulok.length },
    )
    process.exitCode = 1
    return
  }

  const videos = Array.isArray(kurzus.videos) ? kurzus.videos : []
  if (videos.length === 0) {
    logger.info('A kurzusnak nincs átemelendő videója — nincs teendő.', { productId: kurzus.id })
    return
  }

  const lessons = videokLeckekke(videos)
  const azonositoNelkul = lessons.filter((lesson) => lesson.id === undefined).length

  logger.info('Terv: videók átemelése modulba', {
    productId: kurzus.id,
    sku: kurzus.sku ?? null,
    modulCime: kapcsolok.cim,
    leckekSzama: lessons.length,
    // Az azonosító nélküli sor haladása amúgy sem volt rögzíthető, de jelezzük.
    azonositoNelkuliSorok: azonositoNelkul,
  })
  for (const lesson of lessons) {
    logger.info(`  • ${lesson.title}`, { id: lesson.id ?? '(nincs azonosító)' })
  }

  if (!kapcsolok.alkalmaz) {
    logger.info(
      'SZÁRAZ FUTÁS — semmi nem íródott. Az alkalmazáshoz add hozzá a --alkalmaz kapcsolót.',
    )
    return
  }

  await payload.update({
    collection: 'products',
    id: kurzus.id,
    overrideAccess: true,
    data: {
      modules: [{ title: kapcsolok.cim, lessons }],
    },
  })
  logger.info(
    'Kész: a videók átkerültek a modulba, MEGTARTOTT azonosítóval — a meglévő haladás érvényben maradt. A régi „Videók" lista biztonsági másolatként érintetlen.',
    { productId: kurzus.id },
  )
}

// A modul mellékhatás nélkül importálható (a tiszta segédfüggvények így
// tesztelhetők); a futtatás csak közvetlen indításkor indul el.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  futtat()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((error: unknown) => {
      logger.error('A videók átemelése sikertelen', {
        error: error instanceof Error ? error.message : String(error),
      })
      process.exit(1)
    })
}
