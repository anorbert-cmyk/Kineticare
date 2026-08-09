/**
 * Kezdőlap-alapállapot (home-seed) — a landing tartalmi képei a Médiatárba és
 * a `kezdolap` oldal alap-szekciósora (docs/szekcio-rendszer-terv.md 6. pont).
 *
 * A modul KÉT helyről fut:
 *  - a seed-scriptből (npm run seed, SEED_SCOPE=kezdolap hatókörrel is),
 *  - a Payload `onInit`-jéből minden indulásnál (payload.config.ts) — az
 *    ensureContactForm mintájára, mert a kezdőlap alapállapota telepítési
 *    előfeltétel, nem kézi lépés.
 *
 * Minden művelet idempotens: meglévő képet és KITÖLTÖTT szekciósort SOHA nem
 * ír felül (az már szerkesztői munka) — ismételt futása üres no-op olvasás.
 * Ezért került ki a seed-scriptből ide: a payload.config nem importálhatja a
 * seed-scriptet (az importálja a configot — kör lenne).
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

import { logger } from './logger'

import { HOME_PAGE_SLUG } from './content-slugs'
import type { Page } from '../payload-types'

export const minimalRichText = (text: string): Page['content'] => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

// ---------------------------------------------------------------------------
// Kezdőlapi képek — a landing tartalmi képei a Média collectionbe
// (docs/szekcio-rendszer-terv.md 3.4).
//
// A fájlok a repóban élő landing-tükörből (higgsfield-site/) jönnek. A Média
// collectionbe azért kerülnek (nem statikus assetként), hogy a lányok az
// adminban cserélhessék őket. A terv szerint a `.scratch/` nyersanyag és a két
// árva fájl (`katak.jpg`, `sos-art.png` duplikátum) NEM jön át.
// ---------------------------------------------------------------------------

interface SeedImage {
  /** A fájl neve a tükörben — egyben az idempotencia-kulcs alapja. */
  file: string
  /** A tükör assets-almappája. */
  dir: 'brand' | 'site'
  /** Kötelező magyar képleírás (Media.alt) — képernyőolvasónak és a Google-nek. */
  alt: string
}

/**
 * A kezdőlap-layout által hivatkozott képek.
 *
 * Az `alt` szövegek forrása a landing (`higgsfield-site/app/src/routes/index.tsx`)
 * `imgAlt`/`alt` attribútuma. Két kivétel, ahol a landingen nincs használható
 * érték, ezért a képet megnézve írtuk le:
 *  - `sos-hands-board.jpg` — a landingen dekoratív (`alt=""`, `aria-hidden`),
 *  - `logo-kineticare.png` — a landing lábléce csak „KinetiCare logó"-t ír.
 */
export const HOME_IMAGES = [
  {
    file: 'state-zart.png',
    dir: 'brand',
    alt: 'Ökölbe szorított kéz, zárt helyzetben',
  },
  {
    file: 'state-nyilo.png',
    dir: 'brand',
    alt: 'Félig nyitott kéz, már oldódik a görcs',
  },
  {
    file: 'state-nyitott.png',
    dir: 'brand',
    alt: 'Teljesen nyitott, szabadon tartott tenyér',
  },
  {
    file: 'services-hands.png',
    dir: 'brand',
    alt: 'Terapeuta kezei mobilizálják a páciens kezét',
  },
  {
    file: 'sos-hands-board.jpg',
    dir: 'brand',
    alt: 'Terapeuta két keze tartja a páciens tenyerét és csuklóját, kék tónusú felvétel',
  },
  {
    file: 'katak-team.jpg',
    dir: 'site',
    alt: 'Kiss Kata és Kocsis Kata, a KinetiCare gyógytornászai',
  },
  { file: 'press-noklapja.png', dir: 'site', alt: 'A Nők Lapja logója' },
  { file: 'press-karc.png', dir: 'site', alt: 'A Karc FM logója' },
  { file: 'press-hazipatika.png', dir: 'site', alt: 'A Házipatika logója' },
  { file: 'press-kepmas.png', dir: 'site', alt: 'A Képmás magazin logója' },
  { file: 'press-ispor.png', dir: 'site', alt: 'Az iSport logója' },
  {
    file: 'press-mgyft.png',
    dir: 'site',
    alt: 'A Magyar Gyógytornász-Fizioterapeuták Társaságának logója',
  },
  {
    file: 'logo-kineticare.png',
    dir: 'site',
    alt: 'A Kineticare logója: KINETICARE felirat világoskék hullámmotívummal',
  },
] as const satisfies readonly SeedImage[]

/** A seed által feltöltött képfájlok neve (típusbiztos hivatkozás a layoutban). */
export type SeedImageFile = (typeof HOME_IMAGES)[number]['file']

/**
 * Fájlnév → Media id leképezés. Szándékosan `Partial`: ha egy képfájl hiányzik
 * (pl. a tükör nincs a munkamásolatban), a hozzá tartozó id kimarad, és a
 * layout egyszerűen kép nélkül épül fel — a seed nem áll meg.
 */
export type HomeMediaIds = Partial<Record<SeedImageFile, number>>

/**
 * A landing képeinek gyökere a tükörben (repógyökér/higgsfield-site/app/public/assets).
 *
 * Exportált, mert az induláskori önjavítás (src/lib/media-restore.ts) is
 * innen tölti vissza a deploykor elveszett képfájlokat.
 */
export const LANDING_ASSETS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'higgsfield-site',
  'app',
  'public',
  'assets',
)

/**
 * Képek idempotens feltöltése.
 *
 * A dedup a kiterjesztés NÉLKÜLI alapnévre megy: a Média collection webp-re
 * konvertál feltöltéskor (src/collections/Media.ts `formatOptions`), így a
 * `state-zart.png` fájlból `state-zart.webp` filename lesz — az eredeti névre
 * szűrve sosem találnánk meg a saját korábbi feltöltésünket, és minden futás
 * duplikálna. Ugyanez a minta él a legacy-visszaépítő scriptben is.
 *
 * Meglévő képet a seed SOHA nem ír felül: ha a lányok kicserélték a képet, az
 * marad — csak az id-jét vesszük át a layouthoz.
 */
export const ensureHomeImages = async (payload: Payload): Promise<HomeMediaIds> => {
  const ids: HomeMediaIds = {}

  for (const image of HOME_IMAGES) {
    const baseName = image.file.replace(/\.[^.]+$/, '')
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { like: `${baseName}%` } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      ids[image.file] = existing.docs[0].id
      payload.logger.info(`Seed: kép már fel van töltve (${image.file}), kihagyva.`)
      continue
    }

    const filePath = path.join(LANDING_ASSETS_DIR, image.dir, image.file)
    if (!existsSync(filePath)) {
      payload.logger.warn(
        `Seed: a képfájl nem található, a szekció kép nélkül készül el (${filePath}).`,
      )
      continue
    }

    const created = await payload.create({
      collection: 'media',
      data: { alt: image.alt },
      filePath,
      overrideAccess: true,
    })
    ids[image.file] = created.id
    payload.logger.info(`Seed: kép feltöltve (${image.file}).`)
  }

  return ids
}

// ---------------------------------------------------------------------------
// A kezdőlap alap-szekciósora (docs/szekcio-rendszer-terv.md 4. pont).
//
// SORREND: az értékesítési audit M1–M8 hierarchiája, a landing kinézetével —
//   filmHero (M1) → credsStrip (M2) → courseCards (M3) → freeSos (M4) →
//   pressLogos → welcome → usps → states → services → about →
//   howItWorks (M5) → testimonials (M6) → knowledge (M7) → faq (M8).
// A lányok ettől szabadon eltérhetnek az adminban — ez a rendszer értelme.
//
// SZÖVEGEK: betűhíven a forrásokból. A landing-szekciók szövege a tükör
// `higgsfield-site/app/src/routes/index.tsx` (és a film-heróé a
// `scroll-scrub-scenes.ts`) fájljából jön; ahol a landingen nincs megfelelő
// tartalom (hitel-csík, ingyenes SOS-sáv, „Így működik", GYIK), ott a mai fő-site
// komponensek jelenlegi szövege a forrás (CredentialsStrip.tsx, FreeSos.tsx,
// HowItWorks.tsx, Faq.tsx `FAQ_ITEMS`). A szövegeket szándékosan MÁSOLJUK, nem
// importáljuk: a seed adat, a komponensek pedig a fallback-megjelenítés — a
// kettő a bevezetés után külön életet él (a szöveget innentől a CMS-ben írják).
//
// CTA-CÉLOK: kizárólag belső útvonalak (terv 3.5) — a landing külső
// kineticare.hu-linkjei NEM jönnek át. Az egyetlen külső cím a ProBody-workshop,
// ami valóban partneroldal.
//
// HÁTTÉRSÁVOK (`sectionSettings.hatter`): a landing sávritmusát követik. A
// landing minden szekciója a papírfehér `--kc-bg` alapon áll (kineticare.css) —
// egyetlen inverz sávja a záró SOS-tábla (`--kc-accent-deep`). Ezért itt minden
// landing-eredetű szekció `feher`; a két olyan szekció, amelyet a mai kezdőlap
// már ma is elválasztott sávban hoz (ingyenes SOS és vélemények), `tint` marad —
// lásd a `freeSos` blokknál a K2-megjegyzést.
// ---------------------------------------------------------------------------

/** A film-hero H1-e — a `kezdolap` oldal címe is ez (a hero fallbackjével egyezően). */
const HOME_HERO_TITLE = 'Hatékony és biztonságos módszerek a kéz és a kar fájdalmai ellen'

/** A film-hero bevezetője — a `kezdolap` oldal rövid bevezetője is ez. */
const HOME_HERO_LEAD =
  'Professzionális, mégis emberközeli terápiás megoldásokkal kezeljük a különböző mozgásszervi problémákat, hogy te ismét önfeledten dolgozhass, sportolhass vagy gondoskodhass szeretteidről.'

/**
 * A kezdőlap alap-szekciósora, tisztán adatként.
 *
 * Gyárfüggvény, mert a kép-hivatkozások futásidejű Media id-k. Kép nélkül
 * (`buildHomeLayout()`) is teljes értékű layoutot ad — így a sorrendet és a
 * szövegeket teszt közvetlenül asszertálhatja, adatbázis nélkül.
 */
export const buildHomeLayout = (media: HomeMediaIds = {}): NonNullable<Page['layout']> => [
  // M1 — Film-hero. Pontosan 1 elsődleges (fizetős irány) + 1 másodlagos
  // (ingyenes SOS) gomb; a másodlagos lapon belüli horgonyra megy, ahogy a mai
  // hero is (#ingyenes → a freeSos szekció horgonya lentebb).
  {
    blockType: 'filmHero',
    title: HOME_HERO_TITLE,
    lead: HOME_HERO_LEAD,
    tags: [{ label: 'Kéz' }, { label: 'Csukló' }, { label: 'Könyök' }, { label: 'Váll' }],
    ctas: [
      { felirat: 'Kurzusok megtekintése', url: '/kurzusok', ujAblakban: false },
      { felirat: 'Ingyenes SOS gyakorlatok', url: '#ingyenes', ujAblakban: false },
    ],
    sectionSettings: { visible: true },
  },

  // M2 — Szakmai hitel-csík közvetlenül a hero alatt (a sajtólogó-sor NEM
  // helyettesíti: az lentebb, külön szekcióként jön).
  {
    blockType: 'credsStrip',
    items: [
      { text: 'Gyógytornász és manuálterapeuta szakmai háttér' },
      { text: 'Sportolók és olimpikonok is hozzánk fordulnak' },
      { text: 'Szakmai egyesületi tagság' },
    ],
    link: { felirat: 'Bővebben a szakmai hátterünkről', url: '/rolunk', ujAblakban: false },
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // M3 — Kurzuskártyák. Adatvezérelt: a kártyák a Webshop → Kurzusok közül
  // jönnek, itt csak a felvezető szöveg él.
  {
    blockType: 'courseCards',
    heading: 'Így tudunk neked segíteni',
    lead: 'Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni felépülésen.',
    sectionSettings: { visible: true, anchorId: 'kurzusok', hatter: 'feher' },
  },

  // M4 — Ingyenes SOS-sáv. A landing ezt sötétkék záró táblaként hozza, itt
  // viszont közvetlenül a fizetős kártyák UTÁN áll: sötét sávval az ingyenes
  // ajánlat elnyomná a fizetőset (értékesítési UX-skill M4/K2), ezért marad a
  // világoskék sáv — ahogy a mai kezdőlap FreeSos szekciója is. A landing
  // háttérképe (sos-hands-board.jpg) viszont átjön.
  {
    blockType: 'freeSos',
    title: 'SOS Kézrelax — ingyenes villámkurzus',
    body: 'Ha előbb kipróbálnád a módszert: rövid, azonnal használható gyakorlatok hirtelen jelentkező kézfájdalomra.',
    cta: { felirat: 'Elindítom az ingyenes kurzust', url: '/kurzusok', ujAblakban: false },
    backgroundImage: media['sos-hands-board.jpg'],
    sectionSettings: { visible: true, anchorId: 'ingyenes', hatter: 'tint' },
  },

  // Sajtó-logósor — bizalmi elem, de nem hitel-csík: a lap későbbi szakaszába
  // való. A logók sorrendje a landingé.
  {
    blockType: 'pressLogos',
    heading: 'Ismerhetsz minket innen',
    // A logónkénti alt-felülírást szándékosan üresen hagyjuk: így a Médiatárban
    // megadott képleírás jelenik meg, azaz egy helyen szerkeszthető.
    logos: (
      [
        'press-noklapja.png',
        'press-karc.png',
        'press-hazipatika.png',
        'press-kepmas.png',
        'press-ispor.png',
        'press-mgyft.png',
      ] as const
    ).flatMap((file) => {
      const image = media[file]
      return image === undefined ? [] : [{ image }]
    }),
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // Üdvözlő / probléma-blokk — a látogató helyzetének visszatükrözése.
  {
    blockType: 'welcome',
    title: 'Szeretnél megszabadulni a fájdalomtól, de hiába próbáltál ki (szinte) mindent?',
    lead: 'Tudjuk, milyen, amikor:',
    checklist: [
      {
        text: 'Az ujjad vagy a csuklód már a nap közepén görcsöl, és esélyed sincs pihentetni',
      },
      { text: 'Minden mozdulatnál attól tartasz, csak ne legyen rosszabb' },
      {
        text: 'Egyre több kenőcsöt, borogatást és „csodaszert” halmozol fel, de a fájdalom újra és újra jelentkezik.',
      },
    ],
    sideParagraphs: [
      {
        text: 'Ha eleged van abból, hogy már csak félgőzzel bírsz dolgozni vagy sportolni, mert félsz a fájdalomtól, vagy netán a fájdalomcsillapítókig fajult a helyzet, akkor a legjobb helyen jársz.',
        emphasized: false,
      },
      {
        text: 'Mozgásterápiás módszerekkel tudunk abban segíteni, hogy végre megszűnjön a kézfájdalmad, és újra teljes erőbedobással élhesd a mindennapjaid.',
        emphasized: true,
      },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // „Erre számíthatsz" kártyák.
  {
    blockType: 'usps',
    title: 'Erre számíthatsz velünk',
    cards: [
      {
        title: 'A legújabb, tudományosan megalapozott módszereket alkalmazzuk',
        body: 'Folyamatosan figyeljük a külföldi és hazai szakmai protokollokat, kutatásokat, és a pácienseinken látott valós tapasztalatokat is ötvözzük.',
        extra:
          'Így garantáltan naprakész, biztonságos és hatékony módszerekkel dolgozunk, hogy a kezed a lehető leggyorsabban regenerálódhasson.',
      },
      {
        title: 'Személyre szabott megoldást kapsz, akár otthon, akár rendelőben',
        body: 'Minden programunkban (legyen az online kurzus vagy személyes kezelés) figyelembe vesszük a te szokásaidat, terhelésedet és korlátaidat.',
        extra:
          'Ha nincs időd a rendelőbe járni, otthoni gyakorlóvideók várnak; ha pedig eljössz hozzánk, az igényeidhez és az életviteledhez igazítjuk a kezelési tervet. A lényeg: mindig van olyan megoldásunk, ami neked megfelel, és valódi javulást hoz.',
      },
      {
        title: 'Nem rövidtávú tünetkezeléssel, hanem tartós eredménnyel foglalkozunk',
        body: 'Nálunk nem áll meg a folyamat a „gyorsan csökkentsük a fájdalmat” résznél. Arra törekszünk, hogy ne is térjen vissza a kínzó fájdalom.',
        extra:
          'Megmutatjuk, hogyan változtass a mozgásmintáidon, és milyen gyakorlatokat érdemes beépítened a hétköznapokba. A cél: egy olyan stabil, teherbíró kéz, ami hosszú távon bírja a strapát, akár munkáról, sportról vagy a hétköznapok terheléséről van szó.',
      },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // Három állapot. A `number` szándékosan üres: a landingen is a megjelenítés
  // számoz (01, 02, 03), nem a tartalom — a blokk ugyanezt ígéri.
  {
    blockType: 'states',
    title: 'Három állapot, egy folyamat',
    lead: 'A logónkat a kezed ismeri fel: zárt, nyíló, majd teljesen nyitott. A három kép a filmünk kulcskockái, pontosan abban a sorrendben, ahogyan a terápia halad.',
    cards: [
      {
        image: media['state-zart.png'],
        title: 'Zárt',
        text: 'Fájdalom, bizonytalanság, a kéz védekezése. Ismerős, ha hónapok óta szenvedsz.',
      },
      {
        image: media['state-nyilo.png'],
        title: 'Nyíló',
        text: 'A közös munka meghozza az első enyhülést. Minden alkalommal egy mozdulattal több lesz.',
      },
      {
        image: media['state-nyitott.png'],
        title: 'Nyitott',
        text: 'Újra a saját kezed. Munkázhatsz, sportolhatsz, önfeledten élhetsz.',
      },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // Szolgáltatás-sorok. A sorszámok itt a landing ADATAI (01/02/03), ezért
  // kiírjuk őket. A két Kineticare-cél belső útvonalra mutat (terv 3.5); a
  // harmadik valódi partneroldal, ezért új lapon nyílik.
  {
    blockType: 'services',
    eyebrow: 'Szolgáltatásaink',
    title: 'Így tudunk segíteni',
    image: media['services-hands.png'],
    rows: [
      {
        number: '01',
        title: 'Rendelői kezelések',
        body: 'Akut sérülések, műtét utáni állapotok és krónikus fájdalmak esetén a mozgásterápia a gyógyulás alappillére. Gyógytornával, manuálterápiával és egy sor kiegészítő terápiával várunk a stúdiónkban.',
        felirat: 'Tovább a kezelésekre',
        url: '/szolgaltatasok',
        ujAblakban: false,
      },
      {
        number: '02',
        title: 'Otthoni program',
        body: 'Ha nem tudsz eljutni kezelésre, vagy egyszerűen csak megpróbálnád előbb magadnak megoldani a kézproblémádat, akkor ezeket neked készítettük. Az átfogó kézrehabilitációs programban bárhol, bármikor végezhető megoldásokat találsz.',
        felirat: 'Tovább a programra',
        url: '/kurzusok',
        ujAblakban: false,
      },
      {
        number: '03',
        title: 'Szakmai képzések',
        body: 'Akkreditált tantermi kézkurzusunkat a ProBody Stúdióval együttműködve hoztuk létre a kéz, a csukló- és könyökízület rehabilitációs lehetőségeiről gyógytornászoknak, orvosoknak, erőnléti és szakági edzőknek.',
        felirat: 'Tovább a kéz workshopra',
        url: 'https://probodystudio.hu/kez-workshop/',
        ujAblakban: true,
      },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // Rólunk + statisztikák. A számok a landing VALÓS adatai — kitalált
  // statisztika ide nem kerülhet.
  {
    blockType: 'about',
    eyebrow: 'Rólunk',
    title: 'Kiss Kata és Kocsis Kata vagyunk',
    paragraphs: [
      {
        text: 'Kiss Kata és Kocsis Kata vagyunk, gyógytornászok, manuálterapeuták és sportrehabilitációs trénerek, és évek óta elsősorban a kéz rehabilitációjával foglalkozunk.',
        emphasized: true,
      },
      {
        text: 'A pácienseink nagy része kéz-, csukló-, könyök- vagy vállfájdalommal érkezik hozzánk, így pontosan tudjuk, milyen makacs probléma tud ez lenni, és hogy mennyire megkeseríti az ember mindennapjait.',
        emphasized: false,
      },
      {
        text: 'A legújabb kutatásokat, külföldi guideline-okat és a saját gyakorlati tapasztalatainkat ötvözzük, mindezt a lehető legbiztonságosabb, mégis leggyorsabb felépülés érdekében.',
        emphasized: false,
      },
      {
        text: 'Hiszünk abban, hogy a kezed nemcsak egy testrész: mindenhez szükséged van rá. Ezért igyekszünk minden módon segíteni rendbehozni a kezed, megszüntetni a fájdalmat, és elérni, hogy úgy használhasd a kezed, mintha sosem lett volna vele semmi baj.',
        emphasized: false,
      },
    ],
    feature: {
      label: 'Személyre szabott kezelések',
      note: 'Minden páciens egyedi, ezért minden terápiát személyre szabunk.',
    },
    photo: media['katak-team.jpg'],
    stats: [
      { value: '10+', label: 'év szakmai tapasztalat' },
      { value: '5000+', label: 'elégedett páciens' },
      { value: '1', label: 'közös cél: az Ön mozgásszabadsága' },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // M5 — „Így működik az online kurzus": a videókurzus legfontosabb
  // ellenérv-csökkentője (megveszem → azonnal nézem → otthon gyakorlok).
  {
    blockType: 'howItWorks',
    title: 'Így működik az online kurzus',
    steps: [
      {
        title: 'Kiválasztod a kurzust',
        text: 'A panaszodhoz illő programot néhány kattintással megvásárolod — bankkártyával, biztonságosan.',
      },
      {
        title: 'Azonnal hozzáférsz',
        text: 'A videós anyagokat a fiókodban éred el, saját tempódban, amikor neked megfelel.',
      },
      {
        title: 'Otthon gyakorolsz',
        text: 'A gyakorlatok lépésről lépésre vezetnek — naponta néhány perc is elég a haladáshoz.',
      },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // M6 — Vélemények. Adatvezérelt: a Tartalom → Vélemények alatt kiemelt
  // (featured) és látható visszajelzések jönnek ki, legfeljebb 3.
  {
    blockType: 'testimonials',
    eyebrow: 'Vélemények',
    heading: 'Pácienseink mondták',
    maxItems: 3,
    sectionSettings: { visible: true, anchorId: 'velemenyek', hatter: 'tint' },
  },

  // M7 — Tudástár-ajánló. Adatvezérelt: a legfrissebb közzétett bejegyzések.
  // Fehér sáv, hogy a fenti (tint) vélemény-szekcióval ne olvadjon egybe.
  {
    blockType: 'knowledge',
    heading: 'Legfrissebb a tudástárból',
    limit: 3,
    sectionSettings: { visible: true, hatter: 'feher' },
  },

  // M8 — GYIK. Ebből készül a Google-nek szóló FAQPage strukturált adat is,
  // ezért a válaszok sima szövegek, és gyógyulást nem ígérnek.
  {
    blockType: 'faq',
    heading: 'Gyakori kérdések',
    items: [
      {
        question: 'Műtét után is végezhetem a gyakorlatokat?',
        answer:
          'A kurzusok általános rehabilitációs programok. Műtét után mindig a kezelőorvosod vagy gyógytornászod jóváhagyásával kezdj bele — ha bizonytalan vagy, írj nekünk a kapcsolat oldalon, és segítünk eligazodni.',
      },
      {
        question: 'Fájdalmasak a gyakorlatok?',
        answer:
          'Nem kell, hogy fájjanak. A gyakorlatokat a saját tűrőképességedhez igazítod; éles fájdalom esetén hagyd abba, és kérj szakmai segítséget.',
      },
      {
        question: 'Mennyi időt vesz igénybe naponta?',
        answer:
          'Napi 10–15 perc is elég — a rövid, rendszeres gyakorlás hozza a tartós eredményt, nem az egyszeri nagy erőfeszítés.',
      },
      {
        question: 'Szükségem van eszközökre a gyakorlatokhoz?',
        answer:
          'Nem. A gyakorlatok többsége saját testsúllyal, otthon található eszközökkel végezhető — ahol bármi kell, azt a videóban jelezzük.',
      },
    ],
    sectionSettings: { visible: true, hatter: 'feher' },
  },
]

/**
 * A kezdőlap `layout` mezőjének idempotens feltöltése.
 *
 * Három eset:
 *  - nincs `kezdolap` oldal → létrejön, rögtön az alap-szekciósorral,
 *  - van, de üres a szekciósora → megkapja az alap-szekciósort,
 *  - van szekciósora → ÉRINTETLEN marad (az már szerkesztői munka).
 */
export const ensureHomeLayout = async (payload: Payload, media: HomeMediaIds): Promise<void> => {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: HOME_PAGE_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  const layout = buildHomeLayout(media)

  if (existing.docs.length === 0) {
    await payload.create({
      collection: 'pages',
      data: {
        title: HOME_HERO_TITLE,
        slug: HOME_PAGE_SLUG,
        excerpt: HOME_HERO_LEAD,
        content: minimalRichText(
          'A Kineticare kézrehabilitációs kurzusplatform: otthon végezhető videós programok és szakmai képzések gyógytornászoktól.',
        ),
        layout,
        // Lásd a demó oldalnál: a `status` a `_status`-ból szinkronizálódik.
        status: 'published',
        _status: 'published',
        publishedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    payload.logger.info(
      `Seed: kezdőlap létrehozva az alap-szekciósorral (${HOME_PAGE_SLUG}, ${layout.length} szekció).`,
    )
    return
  }

  const home = existing.docs[0]
  if (Array.isArray(home.layout) && home.layout.length > 0) {
    payload.logger.info(
      'Seed: a kezdőlapnak már van szekciósora, érintetlenül hagyva (a seed sosem ír felül szerkesztői layoutot).',
    )
    return
  }

  await payload.update({
    collection: 'pages',
    id: home.id,
    data: { layout },
    overrideAccess: true,
  })
  payload.logger.info(`Seed: kezdőlap alap-szekciósora felvéve (${layout.length} szekció).`)
}

// ---------------------------------------------------------------------------
// A kezdőlap három kiemelt véleménye (B3).
//
// A „Pácienseink mondták" szekció (M6) adatvezérelt: kiemelt (`featured`) és
// látható vélemény nélkül NEM renderelődik — élesben pontosan ez történt, a
// collection üres volt. Az itteni alapállapot ezt pótolja, idempotensen.
//
// TARTALMI SZABÁLY (fogyasztóvédelem — lásd a TestimonialsSection fejkommentjét):
// ide KIZÁRÓLAG a lányok meglévő oldalán publikált, VALÓS visszajelzés kerülhet,
// betűhíven. A `quote` karakterre azonos a legacy-visszaépítő script
// (src/scripts/restore-legacy-content.ts) LEGACY_TESTIMONIALS tételeivel; a
// `shortQuote` a teljes idézet ÖSSZEFÜGGŐ, betűhív részlete (invariáns:
// quote.includes(shortQuote)). A kezdőlap-terv rövidítései szándékosan nincsenek
// átvéve: átfogalmazott / összeollózott idézet tilos.
// ---------------------------------------------------------------------------

interface HomeTestimonialSeed {
  /** A vélemény teljes szövege — betűhíven, ahogy a lányok oldalán megjelent. */
  quote: string
  /** Kezdőlapi rövid változat: mindig a `quote` betűhív, összefüggő részlete. */
  shortQuote: string
  /** Az idempotencia-kulcs is: ilyen nevű vélemény esetén a seed nem nyúl semmihez. */
  authorName: string
  authorTitle: string
  /** Kezdőlapi sorrend — az 1-es a nagy, nyitó idézet. */
  order: number
}

export const HOME_TESTIMONIALS: readonly HomeTestimonialSeed[] = [
  {
    quote:
      'Kocsis Katát kézproblémával kerestem fel, és már az első alkalommal éreztem, hogy jó kezekben vagyok – szó szerint is. Nagy odafigyeléssel, alázattal és valódi szakértelemmel kezelt minden alkalommal. Nemcsak a tüneteket enyhítette, hanem segített megérteni a kiváltó okokat is. Őszintén ajánlom mindenkinek, aki nemcsak gyors enyhülést, hanem tartós megoldást keres.',
    shortQuote:
      'Nemcsak a tüneteket enyhítette, hanem segített megérteni a kiváltó okokat is. Őszintén ajánlom mindenkinek, aki nemcsak gyors enyhülést, hanem tartós megoldást keres.',
    authorName: 'Garami Gábor',
    authorTitle: 'zenész, műsorvezető',
    order: 1,
  },
  {
    quote:
      'Egy 10 éve tartó ganglion problémával, több operáció után jutottam el Katához, mert szikementes segítséget szerettem volna igénybe venni, és nem is dönthettem volna jobban! Nagyon hálás vagyok, hogy szakértelme által jelentős javulást és tünetmentességet értünk el a kezelések során, és rengeteg tudást is kaptam, pl. hogy tornáztathatom én magam is a fájó testrészeket, vagy hogyan tape-elhetem be magam akut fájdalom esetén.',
    shortQuote:
      'Egy 10 éve tartó ganglion problémával, több operáció után jutottam el Katához, mert szikementes segítséget szerettem volna igénybe venni, és nem is dönthettem volna jobban!',
    authorName: 'Kállai Dóra',
    authorTitle: 'biológus',
    order: 2,
  },
  {
    quote:
      'A KINETICARE lányokat ajánlás alapján kerestem meg, ugyanis akkor már pár hónapja erős fájdalommal járt a hüvelykujjam és a csuklóm mozgatása. Ez a munkámat is nehezítette, hiszen jógaoktatóként folyamatosan használnom kellett, nem pihentethettem. A közös munkának, a világos magyarázatoknak, hogy mi történik velem, illetve a szuper feladatoknak és életvezetési tanácsoknak hála sikerült a gyógyulás! Nagyon hálás vagyok a KINETICARE-nek, hiszen azóta fájdalommentesen élek, és újra visszatérhettem kedvenc gyakorlatomhoz, a kézenálláshoz is.',
    shortQuote:
      'A közös munkának, a világos magyarázatoknak, hogy mi történik velem, illetve a szuper feladatoknak és életvezetési tanácsoknak hála sikerült a gyógyulás!',
    authorName: 'Bagdal Szilvia',
    authorTitle: 'jógaoktató',
    order: 3,
  },
]

/**
 * A három kiemelt vélemény idempotens létrehozása.
 *
 * IDEMPOTENCIA: a kulcs a NÉV (`authorName`). Ha ilyen nevű vélemény már van a
 * collectionben, a függvény kihagyja, és SEMMIT nem ír felül — a szerkesztői
 * munka (javított titulus, más sorrend, levett kiemelés, akár teljesen más
 * szöveg) sérthetetlen, ugyanúgy, ahogy a kezdőlap szekciósorát sem írja felül
 * a seed.
 *
 * BEST-EFFORT: hiányzó tábla vagy adatbázis (pl. első migráció előtti indulás)
 * és minden írási hiba csak figyelmeztetés — sem az app indulását, sem a seedet
 * nem állítja meg. Ugyanez a minta védi a „Kapcsolat" űrlapot az onInitben,
 * ezért a hibakezelés itt, egy helyen ül: mindkét hívási hely örökli.
 */
export async function ensureHomeTestimonials(payload: Payload): Promise<void> {
  try {
    for (const testimonial of HOME_TESTIMONIALS) {
      const existing = await payload.find({
        collection: 'testimonials',
        where: { authorName: { equals: testimonial.authorName } },
        limit: 1,
        overrideAccess: true,
      })
      if (existing.docs.length > 0) {
        logger.info('Kezdőlap: a vélemény már létezik, érintetlenül hagyva', {
          authorName: testimonial.authorName,
        })
        continue
      }
      await payload.create({
        collection: 'testimonials',
        data: {
          quote: testimonial.quote,
          shortQuote: testimonial.shortQuote,
          authorName: testimonial.authorName,
          authorTitle: testimonial.authorTitle,
          featured: true,
          visible: true,
          order: testimonial.order,
        },
        overrideAccess: true,
      })
      logger.info('Kezdőlap: kiemelt vélemény létrehozva', {
        authorName: testimonial.authorName,
        order: testimonial.order,
      })
    }
  } catch (error) {
    logger.warn('Kezdőlap: a kiemelt vélemények betöltése sikertelen (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
