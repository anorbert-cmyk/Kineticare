/**
 * A Tudástár hat cikkének betöltése a `docs/cikkek/` markdown-fájljaiból.
 *
 * ═══ MIÉRT SCRIPT, ÉS NEM KÉZI BEMÁSOLÁS ═══
 * Hat cikk, egyenként 250–460 soros törzzsel. Kézzel bemásolva a szerkezet
 * (címsorok, felsorolások, linkek) elveszne vagy elcsúszna, és minden szakmai
 * javítás után újra kellene csinálni. Így a markdown marad az EGYETLEN igazság,
 * a betöltés pedig visszajátszható.
 *
 * ═══ KÉT KÜLÖN KAPU, SZÁNDÉKOSAN ═══
 *   OWNER_TUDASTAR_CONFIRM=igen   — enélkül PRÓBAFUTÁS: semmi nem íródik.
 *   OWNER_TUDASTAR_PUBLISH=igen   — enélkül a bejegyzés PISZKOZAT marad.
 *
 * A két kapu azért külön, mert a betöltés és a nyilvánossá tétel két külön
 * döntés. A betöltés visszavonható (a rekord piszkozat, senki nem látja), a
 * publikálás viszont egészségügyi tartalmat tesz ki a nyílt internetre. A
 * `docs/cikkek-javitas-naplo.md` szerint a négy tartalmi blokkolóból három
 * (B1 mentőhívási szint, B2 ellenjavallat, B4 irányelv-olvasat) LEZÁRVA, a B3
 * pedig úgy zárult, hogy a nem igazolt akkreditációs szám KIKERÜLT a
 * szövegekből. Ami nyitva maradt: a két gyógytornász szakmai átolvasása.
 * Ezért alapból piszkozat.
 *
 * ═══ ÚJRAFUTTATHATÓ ═══
 * A párosítás slug szerint történik: meglévő bejegyzést FRISSÍT, nem duplikál.
 * A `publishedAt` az első publikáláskor áll be (a Posts collection
 * `setPublishedAtOnFirstPublish` hookja), ismételt futásnál nem csúszik el.
 *
 * Futtatás:
 *   npx tsx src/scripts/import-tudastar-cikkek.ts                    (próba)
 *   OWNER_TUDASTAR_CONFIRM=igen npx tsx src/scripts/import-tudastar-cikkek.ts
 *   OWNER_TUDASTAR_CONFIRM=igen OWNER_TUDASTAR_PUBLISH=igen npx tsx …
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { getPayload, type Payload } from 'payload'

import { logger } from '../lib/logger'
import {
  excerptFrom,
  extractArticleBody,
  markdownToLexical,
} from '../lib/tudastar/markdown-to-lexical'
import config from '../payload.config'

/**
 * A hat cikk. A slug a fájlnév sorszám-előtag nélküli alakja — ezek a
 * webcímek szerepelnek a `docs/adwords-kampany.md` céloldal-hozzárendelésében
 * (7.2), tehát nem szabad eltérni tőlük, különben a hirdetés 404-re visz.
 */
const CIKKEK: readonly { fajl: string; slug: string }[] = [
  { fajl: '1-miert-zsibbad-a-kezem.md', slug: 'miert-zsibbad-a-kezem' },
  { fajl: '2-keztoalagut-szindroma.md', slug: 'keztoalagut-szindroma' },
  { fajl: '3-teniszkonyok.md', slug: 'teniszkonyok' },
  { fajl: '4-pattano-ujj.md', slug: 'pattano-ujj' },
  { fajl: '5-csuklo-es-kezfajdalom.md', slug: 'csuklo-es-kezfajdalom' },
  { fajl: '6-csuklotores-utani-gyogytorna.md', slug: 'csuklotores-utani-gyogytorna' },
]

const kapuNyitva = (nev: string): boolean => process.env[nev]?.trim().toLowerCase() === 'igen'

export interface ForditottCikk {
  slug: string
  title: string
  excerpt: string
  content: ReturnType<typeof markdownToLexical>
  szoszam: number
}

/** Egy cikkfájl beolvasása és fordítása. Hibára DOB, nem ugrik át. */
export function cikketFordit(cikkekDir: string, fajl: string, slug: string): ForditottCikk {
  const nyers = readFileSync(path.join(cikkekDir, fajl), 'utf8')
  const { title, lines } = extractArticleBody(nyers)
  const content = markdownToLexical(lines)
  return {
    slug,
    title,
    excerpt: excerptFrom(lines),
    content,
    szoszam: lines.join(' ').split(/\s+/).filter(Boolean).length,
  }
}

async function main(): Promise<void> {
  const dryRun = !kapuNyitva('OWNER_TUDASTAR_CONFIRM')
  const publikal = kapuNyitva('OWNER_TUDASTAR_PUBLISH')
  const cikkekDir = path.join(process.cwd(), 'docs', 'cikkek')

  logger.info(
    dryRun
      ? 'Tudástár-import: PRÓBAFUTÁS (OWNER_TUDASTAR_CONFIRM=igen nélkül semmi nem íródik).'
      : `Tudástár-import: ÉLES futás. Célállapot: ${publikal ? 'KÖZZÉTÉVE' : 'piszkozat'}.`,
  )

  // Előbb MIND a hat cikket lefordítjuk, és csak utána írunk. Így egy hibás
  // fájl nem hagy félkész állapotot az adatbázisban.
  const forditott = CIKKEK.map(({ fajl, slug }) => cikketFordit(cikkekDir, fajl, slug))
  for (const cikk of forditott) {
    logger.info('Tudástár-import: lefordítva', {
      slug: cikk.slug,
      cim: cikk.title,
      szoszam: cikk.szoszam,
    })
  }

  if (dryRun) {
    logger.info(
      `Tudástár-import: a próbafutás rendben, ${forditott.length} cikk fordult le hibátlanul. ` +
        'Íráshoz: OWNER_TUDASTAR_CONFIRM=igen.',
    )
    return
  }

  const payload: Payload = await getPayload({ config })
  let letrehozva = 0
  let frissitve = 0

  for (const cikk of forditott) {
    const meglevo = await payload.find({
      collection: 'posts',
      where: { slug: { equals: cikk.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })

    const adat = {
      title: cikk.title,
      slug: cikk.slug,
      excerpt: cikk.excerpt,
      content: cikk.content,
      // Mindkét állapotmezőt kiírjuk, ahogy a `seed.ts` és a
      // `restore-legacy-content.ts` is teszi: a `_status` a Payload technikai
      // verzió-állapota, a `status` pedig a nyilvános szűrők (PUBLISHED_WHERE,
      // sitemap) mezője. A `syncStatusFromDraftStatus` hook amúgy is
      // összehangolja őket, de a Payload típusa a teljes dokumentumot kéri,
      // és így nem kell literál `draft: true` paramétert adni.
      status: publikal ? ('published' as const) : ('draft' as const),
      _status: publikal ? ('published' as const) : ('draft' as const),
    }

    const letezo = meglevo.docs[0]
    if (letezo) {
      await payload.update({
        collection: 'posts',
        id: letezo.id,
        data: adat,
        overrideAccess: true,
      })
      frissitve += 1
      logger.info('Tudástár-import: frissítve', { slug: cikk.slug, id: letezo.id })
    } else {
      const uj = await payload.create({
        collection: 'posts',
        data: adat,
        overrideAccess: true,
      })
      letrehozva += 1
      logger.info('Tudástár-import: létrehozva', { slug: cikk.slug, id: uj.id })
    }
  }

  logger.info('Tudástár-import: kész.', {
    letrehozva,
    frissitve,
    allapot: publikal ? 'published' : 'draft',
  })
}

const kozvetlenul =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (kozvetlenul) {
  main()
    .then(() => {
      process.exit(0)
    })
    .catch((error: unknown) => {
      logger.error('Tudástár-import: hiba történt.', {
        error: error instanceof Error ? error.message : String(error),
      })
      process.exit(1)
    })
}
