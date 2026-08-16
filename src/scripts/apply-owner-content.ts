/**
 * Tulajdonos által jóváhagyott, EGYSZERI szerkesztői tartalom-javítások.
 *
 * ═══ MIT JAVÍT ═══
 * Nyolc, 2026-08-16-án jóváhagyott tartalom-javítás. Mind KIZÁRÓLAG pontos
 * egyezésnél (illetve üres mezőnél, hiányzó oldalnál) fut le, tehát a lányok
 * időközbeni szerkesztését egyik sem írja felül:
 *
 *  1. Kezdőlap → Kurzuskártyák szekció címe: „Így tudunk neked segíteni” →
 *     „Kurzusaink”. Ok: az eredeti cím ÜTKÖZÖTT a lentebbi Szolgáltatások
 *     szekció „Így tudunk segíteni” címével (kezdőlap-audit); a szekció a
 *     megvásárolható kínálatot nevezi meg. A javított cím a kód-szintű
 *     alapállapotban már így szerepel (src/lib/home-seed.ts `courseCards`
 *     blokk), az ÉLES adatbázisba viszont a régi érték került be.
 *  2. Kezdőlap → Rólunk + statisztikák szekció páciensszáma: „5000+” →
 *     „1000+”. Ok: a régi kineticare.hu MINDEN előfordulásban „1000+”-t
 *     állított (docs/regi-oldal-valaszok.md); az „5000+” sehonnan nem volt
 *     igazolható, kitalált statisztika pedig fogyasztóvédelmi kockázat (lásd a
 *     blokk admin-leírását, src/blocks/about.ts). A kód-szintű alapállapot itt
 *     is már a javított értéket hozza (src/lib/home-seed.ts, indokló
 *     kommenttel) — a javítás csak az élő adatbázisból hiányzik.
 *  3. Az „Otthoni KézRehab Program” kurzus kártya-előnysorai
 *     (`products.cardHighlights`, maxRows 3 — src/plugins/ecommerce.ts): a
 *     mező üresen maradt, ezért a kezdőlapi kurzuskártyáról hiányzik a
 *     „mini-buybox” pipás sorblokk. A három jóváhagyott, TÉNYSZERŰ sor:
 *     „4 modulnyi videóanyag”, „50+ videós gyakorlat”, „5 perces miniblokkok”.
 *     KIZÁRÓLAG akkor íródik be, ha a mező jelenleg üres — meglévő sorokhoz a
 *     script hozzá sem nyúl.
 *  4. A /rolunk oldal fejléc-képe (`pages.heroImage`): a szóló portré
 *     (`682a121babe80_IMG_7573…`) helyett a páros csapatfotó (`katak-team…`),
 *     amelyen MINDKÉT gyógytornász látszik. A két média-rekordot a script
 *     FUTÁSIDŐBEN, fájlnév-prefix alapján keresi meg — fix azonosító nincs
 *     benne, mert a Média collection webp-re konvertál (src/collections/
 *     Media.ts), így a kiterjesztés környezetenként eltér (.jpg/.jpeg/.webp).
 *     Csere KIZÁRÓLAG akkor, ha a mező tényleg a szóló portréra mutat.
 *  5. A /rolunk szakmai hátterének harmonikába szervezése: az örökölt,
 *     egyetlen óriás richText blokk (két teljes önéletrajz, több képernyőnyi
 *     görgetés) helyére a seed-builder ÚJ szerkezete kerül — rövid, mindig
 *     látható rész (elérhetőség + partnerek) + nyitható-csukható `accordion`
 *     blokk (tulajdonosi kérés, 2026-08-16). Csere KIZÁRÓLAG akkor, ha az élő
 *     blokk tartalma byte-ra a seedelt örökölt tartalom (kulcs-sorrendtől
 *     független összevetés a jsonb miatt) — szerkesztői módosítás esetén a
 *     blokk érintetlen marad.
 *  6. A HÁROM JOGI OLDAL létrehozása a jogász szó szerinti szövegéből:
 *     `/aszf`, `/adatvedelem`, `/impresszum` (a lábléc linkjeivel azonos
 *     webcímek — src/components/layout/Footer.tsx). A szöveg forrása a
 *     `src/lib/legal-content.ts` modul és a mellette élő, betűhív
 *     `legal-source/*.txt`. Ez a lépés CSAK LÉTREHOZ: ha a webcím már
 *     létezik, a script SEMMIT nem ír felül és nem is módosít — a jogi
 *     szöveget a tulajdonos/ügyvéd gondozza, egy script sosem írhatja át.
 *  7. Az „SOS Kézrelax villámkurzus” webcíme (`products.slug`): élesben ÜRES,
 *     ezért a kurzus a régi, id-alapú `/kurzusok/2` címen érhető el. A
 *     javítás beírja a beszédes `sos-kezrelax-villamkurzus` slugot —
 *     KIZÁRÓLAG akkor, ha a mező tényleg üres. A régi URL nem törik el: a
 *     `/kurzusok/[slug]` route a numerikus szegmenst tartósan a kanonikus
 *     címre irányítja (src/lib/course-url.ts), a menü SOS-pontja pedig
 *     termék-referencia, tehát magától követi a slugot (src/lib/menu-seed.ts).
 *  8. A `/szolgaltatasok` oldal rendelői szekciójának HORGONYA: a fejléc-menü
 *     a `/szolgaltatasok#rendeloi` címre visz, az élő szekció viszont
 *     `arlista` horgonyt visel — a menüpontra kattintva ma SEMMI nem történik.
 *     A javítás a rendelői szekciót a TARTALMA alapján azonosítja (a benne
 *     álló „Rendelői kezelések…” címsor), és csak EGYÉRTELMŰ találatnál ír; a
 *     kód-szintű alapállapotban a seed-builder már a helyes horgonyt adja
 *     (src/scripts/restore-legacy-content.ts `buildSzolgaltatasokLayout`).
 *
 * ═══ KAPU ═══
 * Alapértelmezésben PRÓBAFUTÁS (dry-run): a script mindent kiszámol és
 * naplóz, de egyetlen írás sem történik. A tényleges íráshoz:
 *
 *   npm run content:owner
 *     → próbafutás; kiírja, mit tenne, és MIÉRT hagy ki bármit.
 *   OWNER_CONTENT_CONFIRM=igen npm run content:owner
 *     → tényleges írás, a végén összesítés és egy `OWNER_CONTENT_OK` naplósor
 *       (erre keresünk rá a deploy-naplóban).
 *
 * A kapu mintája a legacy-visszaépítő scripté (src/scripts/
 * restore-legacy-content.ts `kapuNyitva`): tartalmi adatot módosító script
 * sosem írhat kifejezett kérés nélkül.
 *
 * ═══ IDEMPOTENCIA ═══
 * Mindegyik javítás pontos egyezésre (üres mezőre, hiányzó webcímre) szűr,
 * ezért másodszor lefuttatva már egyetlen módosítást sem talál: a kimenet
 * ugyanaz a tartalom, a naplóban pedig indokolt kihagyások állnak. A kezdőlap
 * szekciósorát a script TELJES tömbként írja vissza (a Payload blokk-mező
 * részlegesen nem frissíthető), de a nem érintett blokkokat VÁLTOZATLAN
 * objektum-referenciaként adja tovább — így a többi szekció tartalma bitre
 * azonos marad.
 */

import { pathToFileURL } from 'node:url'

import { getPayload, type Payload } from 'payload'

import { HOME_PAGE_SLUG } from '../lib/content-slugs'
import {
  JOGI_OLDALAK,
  jogiOldalTartalom,
  richTextSzoveg,
  type JogiOldalLeiras,
} from '../lib/legal-content'
import { logger } from '../lib/logger'
import { CLINIC_TREATMENTS_ANCHOR, SOS_COURSE_SKU } from '../lib/menu-seed'
import config from '../payload.config'
import type { Page, Product } from '../payload-types'
// Mellékhatás-mentes import (a legacy-script futtatás-kapuval védett): a
// szakmai-háttér csere a seed-builderből veszi az ÚJ blokkokat, és az örökölt
// tartalommal veti össze az élő blokkot.
import { buildRolunkLayout, rolunkSzakmaiOrokoltTartalom } from './restore-legacy-content'

// ---------------------------------------------------------------------------
// A jóváhagyott értékek — a három javítás igazságforrása.
// ---------------------------------------------------------------------------

/** A kurzus-szekció RÉGI címe; kizárólag pontosan ez az érték cserélhető. */
export const REGI_KURZUS_SZEKCIO_CIM = 'Így tudunk neked segíteni'

/** A kurzus-szekció jóváhagyott ÚJ címe. */
export const UJ_KURZUS_SZEKCIO_CIM = 'Kurzusaink'

/** A páciensszám RÉGI, nem igazolható értéke; kizárólag pontosan ez cserélhető. */
export const REGI_PACIENS_ERTEK = '5000+'

/** A páciensszám jóváhagyott ÚJ értéke (a régi oldal minden előfordulásában ez állt). */
export const UJ_PACIENS_ERTEK = '1000+'

/**
 * Az érintett kurzus azonosítója. Az `sku` ebben a repóban a VEVŐNEK MEGJELENŐ
 * terménév (a plugin `useAsTitle: 'sku'`-val fut) — lásd a legacy-visszaépítő
 * script fejkommentjét; a keresés ezért erre a pontos szövegre megy.
 */
export const KURZUS_SKU = 'Otthoni KézRehab Program'

/** A kurzuskártya jóváhagyott előny-sorai, EBBEN a sorrendben (maxRows 3). */
export const KURZUS_ELONYOK: readonly string[] = [
  '4 modulnyi videóanyag',
  '50+ videós gyakorlat',
  '5 perces miniblokkok',
]

/** A „Rólunk” oldal webcíme (Pages.slug). */
export const ROLUNK_SLUG = 'rolunk'

/**
 * A LECSERÉLENDŐ fejléc-kép fájlnév-prefixe (szóló portré — csak az egyik
 * gyógytornász látszik). Prefix, mert a Média collection webp-re konvertál, így
 * a kiterjesztés környezetenként eltér.
 */
export const REGI_ROLUNK_HERO_PREFIX = '682a121babe80_IMG_7573'

/** Az ÚJ fejléc-kép fájlnév-prefixe (páros csapatfotó — mindkét gyógytornász). */
export const UJ_ROLUNK_HERO_PREFIX = 'katak-team'

/**
 * Az SOS villámkurzus jóváhagyott webcíme (`products.slug`).
 *
 * A `sku`-ból a kurzus-slug szabályai szerint adódik (src/lib/course-url.ts
 * `buildCourseSlug`) — a konstans mellett ezt teszt is őrzi, hogy a beírt
 * érték soha ne csússzon el a mező saját slug-generátorától.
 */
export const SOS_KURZUS_SLUG = 'sos-kezrelax-villamkurzus'

/** A `/szolgaltatasok` oldal webcíme (Pages.slug). */
export const SZOLGALTATASOK_SLUG = 'szolgaltatasok'

/**
 * A rendelői szekció TARTALMI ismertetőjegye: a szekció ezzel a címsorral
 * kezdődik (src/scripts/restore-legacy-content.ts `rendeloiKezelesekNodes`).
 * A horgony-javítás EZ ALAPJÁN azonosítja a blokkot — nem sorszám alapján,
 * mert a szerkesztő átrendezheti a szekciókat.
 */
export const RENDELOI_SZEKCIO_CIMKEZDET = 'Rendelői kezelések'

// ---------------------------------------------------------------------------
// Típusok
// ---------------------------------------------------------------------------

/** A kezdőlap szekciósora (Pages.layout). */
type Szekciosor = NonNullable<Page['layout']>

/** A kurzuskártya előny-sorai (products.cardHighlights). */
type ElonySorok = NonNullable<Product['cardHighlights']>

/** Melyik jóváhagyott javítás adta a naplósort. */
export type JavitasSzabaly =
  | 'kurzus-szekcio-cim'
  | 'paciens-szam'
  | 'kurzus-elonyok'
  | 'rolunk-hero-kep'
  | 'szakmai-harmonika'
  | 'jogi-oldalak'
  | 'sos-kurzus-slug'
  | 'rendeloi-horgony'

/** Egy elvégzett módosítás vagy egy indokolt kihagyás gépileg is vizsgálható leírása. */
export interface JavitasLepes {
  /** Melyik szabály futott. */
  szabaly: JavitasSzabaly
  /** Magyar naplósor: mi történt (vagy mi történne a próbafutásban). */
  uzenet: string
  /** Kihagyásnál MINDIG kitöltött indok; módosításnál `null`. */
  indok: string | null
  /**
   * HANGOS kihagyás: nem a megszokott „már javítva / a szerkesztő átírta" eset,
   * hanem hiányzó előfeltétel, amit az üzemeltetőnek látnia kell. A naplózó
   * ezeket `error` szinten írja ki (a többi kihagyás `warn`).
   */
  hangos?: boolean
}

/** A szekciósor-átalakítás eredménye. */
export interface SzekciosorAtalakitas {
  /** Az ÚJ szekciósor — a nem érintett blokkok VÁLTOZATLAN referenciaként. */
  layout: Szekciosor
  /** Elvégzett (próbafutásban: elvégzendő) módosítások. */
  modositasok: JavitasLepes[]
  /** Kihagyások — mindegyik a maga indokával. */
  kihagyasok: JavitasLepes[]
}

/** A kurzus előny-sorainak átalakítási eredménye. */
export interface ElonyAtalakitas {
  /** A beírandó sorok, vagy `null`, ha nem szabad írni (a mező nem üres). */
  cardHighlights: ElonySorok | null
  modositasok: JavitasLepes[]
  kihagyasok: JavitasLepes[]
}

/** A /rolunk fejléc-kép cseréjének eredménye. */
export interface HeroKepAtalakitas {
  /** A beírandó média-azonosító, vagy `null`, ha nem szabad írni. */
  heroImage: number | null
  modositasok: JavitasLepes[]
  kihagyasok: JavitasLepes[]
}

/** Naplózható alak: `null`/`undefined` helyett beszédes jelölés. */
const ertekCimke = (ertek: string | null | undefined): string =>
  typeof ertek === 'string' ? `„${ertek}”` : '(nincs megadva)'

// ---------------------------------------------------------------------------
// 1–2. javítás — a kezdőlap szekciósorának tiszta átalakítása.
// ---------------------------------------------------------------------------

/**
 * A kezdőlap szekciósorára alkalmazza az 1. és 2. javítást.
 *
 * Tiszta függvény: nem olvas és nem ír adatbázist, nem naplóz — a naplósorokat
 * visszaadja, a futtató dönt róluk. Ezért közvetlenül tesztelhető.
 *
 * SZIGORÚ EGYEZÉS: a `courseCards.heading` csak akkor cserélődik, ha pontosan a
 * régi cím (trimmelés és kis/nagybetű-tűrés NÉLKÜL); az `about.stats[].value`
 * csak akkor, ha pontosan „5000+”. Minden más érték — üres, `null`, hasonló
 * szöveg, vagy ugyanez az érték MÁS mezőben (pl. `stats[].label`) — érintetlen
 * marad, és indokolt kihagyásként naplózódik.
 */
export const alkalmazKezdolapJavitasok = (
  layout: Szekciosor | null | undefined,
): SzekciosorAtalakitas => {
  const modositasok: JavitasLepes[] = []
  const kihagyasok: JavitasLepes[] = []

  if (!Array.isArray(layout) || layout.length === 0) {
    const indok = 'a kezdőlapnak nincs szekciósora (Pages → Szekciók üres), így nincs mit javítani'
    kihagyasok.push({ szabaly: 'kurzus-szekcio-cim', uzenet: 'Kurzus-szekció címe', indok })
    kihagyasok.push({ szabaly: 'paciens-szam', uzenet: 'Páciensszám', indok })
    return { layout: [], modositasok, kihagyasok }
  }

  let voltKurzusSzekcio = false
  let voltPaciensTalalat = false

  const ujLayout: Szekciosor = layout.map((blokk, index) => {
    const helye = `${index + 1}. szekció`

    if (blokk.blockType === 'courseCards') {
      voltKurzusSzekcio = true
      if (blokk.heading === REGI_KURZUS_SZEKCIO_CIM) {
        modositasok.push({
          szabaly: 'kurzus-szekcio-cim',
          uzenet: `Kurzus-szekció címe (${helye}): ${ertekCimke(blokk.heading)} → ${ertekCimke(
            UJ_KURZUS_SZEKCIO_CIM,
          )}`,
          indok: null,
        })
        return { ...blokk, heading: UJ_KURZUS_SZEKCIO_CIM }
      }
      kihagyasok.push({
        szabaly: 'kurzus-szekcio-cim',
        uzenet: `Kurzus-szekció címe (${helye})`,
        indok: `a jelenlegi cím ${ertekCimke(
          blokk.heading,
        )}, ami nem PONTOSAN a cserélendő ${ertekCimke(
          REGI_KURZUS_SZEKCIO_CIM,
        )} — a script csak pontos egyezésnél ír át`,
      })
      return blokk
    }

    if (blokk.blockType === 'about') {
      const statok = blokk.stats
      if (!Array.isArray(statok) || statok.length === 0) {
        return blokk
      }
      let valtozott = false
      const ujStatok = statok.map((sor, sorIndex) => {
        if (sor.value !== REGI_PACIENS_ERTEK) {
          return sor
        }
        valtozott = true
        voltPaciensTalalat = true
        modositasok.push({
          szabaly: 'paciens-szam',
          uzenet: `Statisztika-érték (${helye}, ${sorIndex + 1}. szám, „${
            sor.label
          }”): ${ertekCimke(REGI_PACIENS_ERTEK)} → ${ertekCimke(UJ_PACIENS_ERTEK)}`,
          indok: null,
        })
        return { ...sor, value: UJ_PACIENS_ERTEK }
      })
      return valtozott ? { ...blokk, stats: ujStatok } : blokk
    }

    return blokk
  })

  if (!voltKurzusSzekcio) {
    kihagyasok.push({
      szabaly: 'kurzus-szekcio-cim',
      uzenet: 'Kurzus-szekció címe',
      indok:
        'a kezdőlap szekciósorában nincs Kurzuskártyák (courseCards) szekció — a címet nincs hol átírni',
    })
  }
  if (!voltPaciensTalalat) {
    kihagyasok.push({
      szabaly: 'paciens-szam',
      uzenet: 'Páciensszám',
      indok: `a szekciósor egyetlen statisztika-értéke sem PONTOSAN ${ertekCimke(
        REGI_PACIENS_ERTEK,
      )} — vagy már javítva van, vagy a szerkesztő időközben átírta`,
    })
  }

  return { layout: modositasok.length > 0 ? ujLayout : layout, modositasok, kihagyasok }
}

// ---------------------------------------------------------------------------
// 3. javítás — a kurzuskártya előny-sorai.
// ---------------------------------------------------------------------------

/** Egy előny-sor akkor számít kitöltöttnek, ha a szövege nem csak whitespace. */
const kitoltottElony = (sor: ElonySorok[number]): boolean =>
  typeof sor.text === 'string' && sor.text.trim().length > 0

/**
 * A kurzus `cardHighlights` mezőjének tiszta átalakítása.
 *
 * KIZÁRÓLAG üres (hiányzó, `null`, üres tömb, vagy csak whitespace-sorokat
 * tartalmazó) mezőt tölt fel — bármilyen meglévő szerkesztői tartalom esetén
 * `null`-lal tér vissza, azaz a futtató NEM ír. A csak whitespace-ből álló sor
 * azért számít üresnek, mert a kártyán sem jelenik meg (`cardHighlightTexts`,
 * src/components/content/ProductCard.tsx).
 */
export const alkalmazKurzusElonyok = (
  jelenlegi: Product['cardHighlights'] | undefined,
): ElonyAtalakitas => {
  const meglevo = Array.isArray(jelenlegi) ? jelenlegi : []
  const kitoltott = meglevo.filter(kitoltottElony)

  if (kitoltott.length > 0) {
    return {
      cardHighlights: null,
      modositasok: [],
      kihagyasok: [
        {
          szabaly: 'kurzus-elonyok',
          uzenet: `Kurzus előny-sorai („${KURZUS_SKU}”)`,
          indok: `a mezőben MÁR VAN ${kitoltott.length} kitöltött sor (${kitoltott
            .map((sor) => `„${sor.text.trim()}”`)
            .join(', ')}) — szerkesztői tartalmat a script sosem ír felül`,
        },
      ],
    }
  }

  return {
    cardHighlights: KURZUS_ELONYOK.map((text) => ({ text })),
    modositasok: [
      {
        szabaly: 'kurzus-elonyok',
        uzenet: `Kurzus előny-sorai („${KURZUS_SKU}”): ${KURZUS_ELONYOK.map(
          (text) => `„${text}”`,
        ).join(', ')}`,
        indok: null,
      },
    ],
    kihagyasok: [],
  }
}

// ---------------------------------------------------------------------------
// 4. javítás — a /rolunk oldal fejléc-képe.
// ---------------------------------------------------------------------------

/**
 * A `heroImage` mező jelenlegi értékéből a média-azonosító.
 *
 * A mező `depth: 0` mellett szám, mélyebb lekérdezésnél viszont a teljes Media
 * dokumentum — a script `depth: 0`-val olvas, de a függvény mindkét alakot
 * elfogadja, hogy tesztből és más hívóból is használható legyen.
 */
export const heroKepAzonosito = (ertek: Page['heroImage']): number | null => {
  if (typeof ertek === 'number') {
    return ertek
  }
  if (typeof ertek === 'object' && ertek !== null && typeof ertek.id === 'number') {
    return ertek.id
  }
  return null
}

/**
 * A /rolunk fejléc-képének tiszta átalakítása.
 *
 * A két média-azonosítót a HÍVÓ deríti ki fájlnév-prefix alapján (a Média
 * collection webp-re konvertál, ezért fix azonosító nem használható); ez a
 * függvény már csak a döntést hozza meg, adatbázis nélkül.
 *
 * Csere KIZÁRÓLAG akkor, ha a mező pontosan a szóló portréra mutat. Minden más
 * érték — üres, más kép, vagy már a páros fotó — érintetlen marad, indokolt
 * kihagyással. Ha a páros fotó nincs a Médiatárban, a lépés HANGOSAN kimarad.
 */
export const alkalmazRolunkHeroKep = (input: {
  /** A `rolunk` oldal jelenlegi `heroImage` értéke. */
  jelenlegi: Page['heroImage']
  /** A szóló portré média-azonosítója, vagy `null`, ha nincs ilyen rekord. */
  regiMediaId: number | null
  /** A páros csapatfotó média-azonosítója, vagy `null`, ha nincs ilyen rekord. */
  ujMediaId: number | null
}): HeroKepAtalakitas => {
  const { jelenlegi, regiMediaId, ujMediaId } = input
  const jelenlegiId = heroKepAzonosito(jelenlegi)
  const uzenet = 'A /rolunk oldal fejléc-képe'

  const kihagyas = (indok: string, hangos = false): HeroKepAtalakitas => ({
    heroImage: null,
    modositasok: [],
    kihagyasok: [{ szabaly: 'rolunk-hero-kep', uzenet, indok, hangos }],
  })

  // Idempotencia: ha már a páros fotó van beállítva, kész vagyunk.
  if (ujMediaId !== null && jelenlegiId === ujMediaId) {
    return kihagyas(
      `a fejléc-kép MÁR a páros csapatfotó („${UJ_ROLUNK_HERO_PREFIX}…”, azonosító: ${ujMediaId}) — nincs teendő`,
    )
  }

  if (ujMediaId === null) {
    return kihagyas(
      `a Médiatárban NINCS „${UJ_ROLUNK_HERO_PREFIX}” kezdetű fájlnevű kép — a páros csapatfotót előbb fel kell tölteni, addig a fejléc-kép érintetlen marad`,
      true,
    )
  }

  if (jelenlegiId === null) {
    return kihagyas(
      'az oldalnak jelenleg nincs fejléc-képe — a script csak a szóló portrét cseréli le, üres mezőt nem tölt ki',
    )
  }

  if (regiMediaId === null) {
    return kihagyas(
      `a Médiatárban nincs „${REGI_ROLUNK_HERO_PREFIX}” kezdetű fájlnevű kép, a mostani fejléc-kép (azonosító: ${jelenlegiId}) tehát nem a cserélendő szóló portré — érintetlen marad`,
      true,
    )
  }

  if (jelenlegiId !== regiMediaId) {
    return kihagyas(
      `a fejléc-kép nem a cserélendő szóló portréra mutat (mostani azonosító: ${jelenlegiId}, várt: ${regiMediaId}) — a script csak pontos egyezésnél ír át`,
    )
  }

  return {
    heroImage: ujMediaId,
    modositasok: [
      {
        szabaly: 'rolunk-hero-kep',
        uzenet: `${uzenet}: szóló portré („${REGI_ROLUNK_HERO_PREFIX}…”, azonosító: ${regiMediaId}) → páros csapatfotó („${UJ_ROLUNK_HERO_PREFIX}…”, azonosító: ${ujMediaId})`,
        indok: null,
      },
    ],
    kihagyasok: [],
  }
}

// ---------------------------------------------------------------------------
// 5. javítás — a /rolunk szakmai háttere: örökölt óriás-blokk → rövid rész +
// harmonika (`accordion` blokk).
// ---------------------------------------------------------------------------

/** A szakmai háttér szekció horgonya — a régi és az új blokk is ezt viseli. */
export const SZAKMAI_HATTER_HORGONY = 'szakmai-hatter'

/**
 * Kulcs-sorrendtől független JSON-alak mély összevetéshez.
 *
 * MIÉRT KELL: a rich-text tartalom Postgresben `jsonb` oszlopban él, ami a
 * kulcsok sorrendjét NEM őrzi meg — a visszaolvasott objektum ezért
 * `JSON.stringify`-jal hamisan különbözhetne a kódból generált változattól.
 * A tömbök sorrendje (a tényleges tartalom) változatlan marad, azt az
 * összevetés figyeli.
 */
export const stabilJson = (ertek: unknown): string => {
  if (Array.isArray(ertek)) {
    return `[${ertek.map(stabilJson).join(',')}]`
  }
  if (ertek !== null && typeof ertek === 'object') {
    const kulcsok = Object.keys(ertek as Record<string, unknown>).sort()
    return `{${kulcsok
      .map((kulcs) => `${JSON.stringify(kulcs)}:${stabilJson((ertek as Record<string, unknown>)[kulcs])}`)
      .join(',')}}`
  }
  return JSON.stringify(ertek) ?? 'null'
}

/** A szakmai háttér cseréjének eredménye. */
export interface SzakmaiHarmonikaAtalakitas {
  /** Az ÚJ szekciósor, vagy `null`, ha nem szabad írni. */
  layout: Szekciosor | null
  modositasok: JavitasLepes[]
  kihagyasok: JavitasLepes[]
}

/**
 * Az ÚJ két blokk (rövid, mindig látható rész + harmonika) kinyerése a
 * seed-builderből — így a csere pontosan azt a szerkezetet hozza létre, amit
 * egy friss adatbázisban a seed építene. A builder alakjának megváltozása
 * esetén `null`-t adunk, és a futtató hangosan kihagy.
 */
export const rolunkSzakmaiUjBlokkok = (): {
  rovid: Szekciosor[number] | null
  harmonika: Szekciosor[number] | null
} => {
  const layout = buildRolunkLayout()
  const harmonikaIndex = layout.findIndex(
    (blokk) =>
      blokk.blockType === 'accordion' &&
      blokk.sectionSettings?.anchorId === SZAKMAI_HATTER_HORGONY,
  )
  if (harmonikaIndex < 1) {
    return { rovid: null, harmonika: null }
  }
  const elozo = layout[harmonikaIndex - 1]
  return {
    rovid: elozo.blockType === 'richText' ? elozo : null,
    harmonika: layout[harmonikaIndex],
  }
}

/**
 * A /rolunk szekciósorában az ÖRÖKÖLT szakmai-háttér blokk (egyetlen óriás
 * richText a `szakmai-hatter` horgonyon) cseréje a rövid richText + harmonika
 * párra.
 *
 * VÉDŐFELTÉTELEK:
 *  - csak a `szakmai-hatter` horgonyú, `richText` típusú blokkot cseréljük;
 *  - azt is CSAK akkor, ha a tartalma byte-ra a seedelt örökölt tartalom
 *    (kulcs-sorrendtől független összevetés, lásd `stabilJson`) — ha a
 *    szerkesztő időközben átírta, a blokk érintetlen marad;
 *  - ha a horgonyon már `accordion` blokk áll, nincs teendő (idempotencia);
 *  - minden más eset hangos kihagyás (hiányzó előfeltétel).
 */
export const alkalmazSzakmaiHarmonika = (input: {
  layout: Page['layout']
  /** A seedelt örökölt blokk elvárt rich-text tartalma. */
  orokoltTartalom: unknown
  ujRovidBlokk: Szekciosor[number] | null
  ujHarmonikaBlokk: Szekciosor[number] | null
}): SzakmaiHarmonikaAtalakitas => {
  const { layout, orokoltTartalom, ujRovidBlokk, ujHarmonikaBlokk } = input
  const uzenet = 'A /rolunk szakmai hátterének harmonikába szervezése'

  const kihagyas = (indok: string, hangos = false): SzakmaiHarmonikaAtalakitas => ({
    layout: null,
    modositasok: [],
    kihagyasok: [{ szabaly: 'szakmai-harmonika', uzenet, indok, hangos }],
  })

  if (ujRovidBlokk === null || ujHarmonikaBlokk === null) {
    return kihagyas(
      'a seed-builder (buildRolunkLayout) nem a várt rövid richText + harmonika párt adta vissza — a kód és a csere-logika szétcsúszott, kézi átnézés kell',
      true,
    )
  }

  if (!Array.isArray(layout) || layout.length === 0) {
    return kihagyas('a Rólunk oldalnak nincs szekciósora — nincs mit harmonikába szervezni', true)
  }

  const horgonyIndex = layout.findIndex(
    (blokk) => blokk.sectionSettings?.anchorId === SZAKMAI_HATTER_HORGONY,
  )
  if (horgonyIndex === -1) {
    return kihagyas(
      `a szekciósorban nincs „${SZAKMAI_HATTER_HORGONY}” horgonyú blokk — a szakmai háttér szekció hiányzik vagy más horgonyt kapott`,
      true,
    )
  }

  const regiBlokk = layout[horgonyIndex]
  if (regiBlokk.blockType === 'accordion') {
    return kihagyas('a szakmai háttér MÁR harmonika (accordion) blokk — nincs teendő')
  }
  if (regiBlokk.blockType !== 'richText') {
    return kihagyas(
      `a „${SZAKMAI_HATTER_HORGONY}” horgonyú blokk típusa „${regiBlokk.blockType}”, nem a cserélendő richText — kézi átnézés kell`,
      true,
    )
  }

  if (stabilJson(regiBlokk.content) !== stabilJson(orokoltTartalom)) {
    return kihagyas(
      'a szakmai-háttér blokk tartalma eltér a seedelt örökölttől — a szerkesztő időközben átírta, a script nem nyúl hozzá (a harmonikát az adminban, kézzel érdemes bevezetni)',
    )
  }

  const ujLayout: Szekciosor = [
    ...layout.slice(0, horgonyIndex),
    ujRovidBlokk,
    ujHarmonikaBlokk,
    ...layout.slice(horgonyIndex + 1),
  ]

  return {
    layout: ujLayout,
    modositasok: [
      {
        szabaly: 'szakmai-harmonika',
        uzenet: `${uzenet}: az örökölt óriás richText blokk (${horgonyIndex + 1}. szekció) → rövid, mindig látható rész (elérhetőség + partnerek) + nyitható-csukható önéletrajz-harmonika`,
        indok: null,
      },
    ],
    kihagyasok: [],
  }
}

// ---------------------------------------------------------------------------
// 6. javítás — a három jogi oldal LÉTREHOZÁSA (felülírás soha).
// ---------------------------------------------------------------------------

/** Egy létrehozandó jogi oldal teljes Pages-adata. */
export interface JogiOldalAdat {
  title: string
  slug: string
  content: Page['content']
  seoDescription: string
  /** A storefront a saját `status` mezőre szűr, a verziózás a `_status`-ra. */
  status: 'published'
  _status: 'published'
}

/** A jogi oldalak létrehozásának eredménye. */
export interface JogiOldalAtalakitas {
  /** A LÉTREHOZANDÓ oldalak — a már létező webcímek nincsenek benne. */
  letrehozando: JogiOldalAdat[]
  modositasok: JavitasLepes[]
  kihagyasok: JavitasLepes[]
}

/**
 * A három jogi oldal (ÁSZF, adatkezelés, impresszum) CREATE-ONLY átalakítása.
 *
 * Tiszta függvény: a hívó adja meg, mely webcímek léteznek már; a függvény a
 * hiányzókhoz felépíti a teljes Pages-adatot (a szó szerinti jogi szövegből
 * generált Lexical tartalommal), a meglévőket pedig CSENDBEN kihagyja.
 *
 * MIÉRT CSAK LÉTREHOZÁS: a jogi szöveg felelőse a tulajdonos és az ügyvédje.
 * Ha az oldal már létezik — akár a lányok szerkesztették, akár egy korábbi
 * futás hozta létre —, a script hozzá sem nyúl; a szöveg frissítése tudatos,
 * emberi döntés (admin vagy külön, jóváhagyott lépés).
 */
export const alkalmazJogiOldalak = (input: {
  /** A `pages` collectionben MÁR LÉTEZŐ webcímek (bármelyik státuszban). */
  letezoSlugok: readonly string[]
  /** A létrehozandó oldalak leírásai — alapból mind a három. */
  oldalak?: readonly JogiOldalLeiras[]
}): JogiOldalAtalakitas => {
  const oldalak = input.oldalak ?? JOGI_OLDALAK
  const letezo = new Set(input.letezoSlugok)
  const letrehozando: JogiOldalAdat[] = []
  const modositasok: JavitasLepes[] = []
  const kihagyasok: JavitasLepes[] = []

  for (const oldal of oldalak) {
    const uzenet = `Jogi oldal („${oldal.cim}”, webcím: „/${oldal.slug}”)`
    if (letezo.has(oldal.slug)) {
      kihagyasok.push({
        szabaly: 'jogi-oldalak',
        uzenet,
        indok:
          'a webcím MÁR LÉTEZIK — a script jogi oldalt sosem ír felül, a szöveg frissítése emberi döntés (admin)',
      })
      continue
    }
    const content = jogiOldalTartalom(oldal)
    letrehozando.push({
      title: oldal.cim,
      slug: oldal.slug,
      content,
      seoDescription: oldal.seoLeiras,
      status: 'published',
      _status: 'published',
    })
    modositasok.push({
      szabaly: 'jogi-oldalak',
      uzenet: `${uzenet}: LÉTREHOZÁS közzétett állapotban, ${content.root.children.length} bekezdés/címsor a jogász szó szerinti szövegéből`,
      indok: null,
    })
  }

  return { letrehozando, modositasok, kihagyasok }
}

// ---------------------------------------------------------------------------
// 7. javítás — az SOS villámkurzus webcíme.
// ---------------------------------------------------------------------------

/** A kurzus-slug átalakításának eredménye. */
export interface SlugAtalakitas {
  /** A beírandó webcím, vagy `null`, ha nem szabad írni. */
  slug: string | null
  modositasok: JavitasLepes[]
  kihagyasok: JavitasLepes[]
}

/**
 * Az SOS villámkurzus `slug` mezőjének tiszta átalakítása.
 *
 * KIZÁRÓLAG ÜRES mezőt tölt ki (hiányzó, `null`, vagy csak whitespace). Bármi
 * más — akár már a jóváhagyott slug, akár a szerkesztő saját webcíme —
 * érintetlen marad: a közzétett kurzus webcímének megváltoztatása élő URL-t
 * törne el, amiről nincs átirányítás.
 */
export const alkalmazSosKurzusSlug = (jelenlegi: Product['slug']): SlugAtalakitas => {
  const uzenet = `Az SOS kurzus webcíme („${SOS_COURSE_SKU}”)`
  const meglevo = typeof jelenlegi === 'string' ? jelenlegi.trim() : ''

  if (meglevo === SOS_KURZUS_SLUG) {
    return {
      slug: null,
      modositasok: [],
      kihagyasok: [
        {
          szabaly: 'sos-kurzus-slug',
          uzenet,
          indok: `a webcím MÁR „${SOS_KURZUS_SLUG}” — nincs teendő`,
        },
      ],
    }
  }

  if (meglevo.length > 0) {
    return {
      slug: null,
      modositasok: [],
      kihagyasok: [
        {
          szabaly: 'sos-kurzus-slug',
          uzenet,
          indok: `a kurzusnak MÁR VAN webcíme („${meglevo}”) — a script csak ÜRES mezőt tölt ki, meglévő webcímet sosem ír át (az élő URL törne el alatta)`,
        },
      ],
    }
  }

  return {
    slug: SOS_KURZUS_SLUG,
    modositasok: [
      {
        szabaly: 'sos-kurzus-slug',
        uzenet: `${uzenet}: (üres) → „${SOS_KURZUS_SLUG}”. A régi, id-alapú URL tovább él: a kurzus-route a numerikus szegmenst a kanonikus címre irányítja.`,
        indok: null,
      },
    ],
    kihagyasok: [],
  }
}

// ---------------------------------------------------------------------------
// 8. javítás — a rendelői szekció horgonya a /szolgaltatasok oldalon.
// ---------------------------------------------------------------------------

/** A horgony-javítás eredménye. */
export interface HorgonyAtalakitas {
  /** Az ÚJ szekciósor, vagy `null`, ha nem szabad írni. */
  layout: Szekciosor | null
  modositasok: JavitasLepes[]
  kihagyasok: JavitasLepes[]
}

/**
 * A rendelői szekció megkeresése a szekciósorban, TARTALMI jegy alapján.
 *
 * A szekció rich-text blokk, és a `Rendelői kezelések…` címsorral kezdődik. A
 * keresés a blokk TELJES szövegében néz sor-elejei egyezést (a
 * `richTextSzoveg` blokkonként új sorral tagol), így akkor is talál, ha a
 * szerkesztő a szekció elé bekezdést szúrt.
 */
const rendeloiSzekcioIndexek = (layout: Szekciosor): number[] => {
  const talalatok: number[] = []
  layout.forEach((blokk, index) => {
    if (blokk.blockType !== 'richText') {
      return
    }
    const sorok = richTextSzoveg(blokk.content).split('\n')
    if (sorok.some((sor) => sor.trimStart().startsWith(RENDELOI_SZEKCIO_CIMKEZDET))) {
      talalatok.push(index)
    }
  })
  return talalatok
}

/**
 * A `/szolgaltatasok` oldal rendelői szekciójának horgony-javítása.
 *
 * A fejléc-menü „Rendelői kezelések” pontja a `/szolgaltatasok#rendeloi`
 * címre visz (src/lib/menu-seed.ts `CLINIC_TREATMENTS_PATH`), az élő szekció
 * viszont más horgonyt (`arlista`) visel — a kattintás ezért nem csinál semmit.
 *
 * VÉDŐFELTÉTELEK (kétes esetben HANGOS kihagyás, írás nélkül):
 *  - a szekciósornak léteznie kell;
 *  - a rendelői szekciónak EGYÉRTELMŰEN azonosíthatónak kell lennie (pontosan
 *    egy találat a tartalmi jegyre);
 *  - ha a horgonyt MÁR MÁS blokk viseli, nem írunk (két azonos id ütközne, és
 *    a böngésző az elsőre ugrana — kézi átnézés kell);
 *  - ha a szekció horgonya már a helyes, nincs teendő (idempotencia).
 */
export const alkalmazRendeloiHorgony = (layout: Page['layout']): HorgonyAtalakitas => {
  const uzenet = 'A rendelői kezelések szekció horgonya (/szolgaltatasok)'

  const kihagyas = (indok: string, hangos = false): HorgonyAtalakitas => ({
    layout: null,
    modositasok: [],
    kihagyasok: [{ szabaly: 'rendeloi-horgony', uzenet, indok, hangos }],
  })

  if (!Array.isArray(layout) || layout.length === 0) {
    return kihagyas(
      'a Szolgáltatások oldalnak nincs szekciósora — a horgonyt nincs mire tenni',
      true,
    )
  }

  const talalatok = rendeloiSzekcioIndexek(layout)
  if (talalatok.length === 0) {
    return kihagyas(
      `a szekciósorban nincs olyan szövegblokk, amely a „${RENDELOI_SZEKCIO_CIMKEZDET}…” címsorral kezdődne — a szekció hiányzik vagy átírták, kézi átnézés kell`,
      true,
    )
  }
  if (talalatok.length > 1) {
    return kihagyas(
      `a tartalmi jegyre („${RENDELOI_SZEKCIO_CIMKEZDET}…”) ${talalatok.length} szekció is illeszkedik (${talalatok
        .map((index) => `${index + 1}.`)
        .join(', ')}) — nem egyértelmű, melyik a menüpont célja, ezért a script nem ír`,
      true,
    )
  }

  const index = talalatok[0]
  const blokk = layout[index]
  const jelenlegiHorgony = blokk.sectionSettings?.anchorId ?? null

  if (jelenlegiHorgony === CLINIC_TREATMENTS_ANCHOR) {
    return kihagyas(
      `a szekció horgonya MÁR „${CLINIC_TREATMENTS_ANCHOR}” — a menüpont célba ér, nincs teendő`,
    )
  }

  const utkozo = layout.findIndex(
    (masik, masikIndex) =>
      masikIndex !== index && masik.sectionSettings?.anchorId === CLINIC_TREATMENTS_ANCHOR,
  )
  if (utkozo !== -1) {
    return kihagyas(
      `a „${CLINIC_TREATMENTS_ANCHOR}” horgonyt MÁR a(z) ${utkozo + 1}. szekció viseli — két azonos horgony ütközne, ezért a script nem ír; nézd át az adminban`,
      true,
    )
  }

  const ujLayout: Szekciosor = layout.map((elem, elemIndex) =>
    elemIndex === index
      ? { ...elem, sectionSettings: { ...elem.sectionSettings, anchorId: CLINIC_TREATMENTS_ANCHOR } }
      : elem,
  )

  return {
    layout: ujLayout,
    modositasok: [
      {
        szabaly: 'rendeloi-horgony',
        uzenet: `${uzenet}: ${ertekCimke(jelenlegiHorgony)} → ${ertekCimke(
          CLINIC_TREATMENTS_ANCHOR,
        )} (${index + 1}. szekció) — a fejléc-menü „Rendelői kezelések” pontja ezután ide ugrik`,
        indok: null,
      },
    ],
    kihagyasok: [],
  }
}

// ---------------------------------------------------------------------------
// Futtatás — a tiszta átalakításokat köti az adatbázishoz.
// ---------------------------------------------------------------------------

/** Egy kapu akkor nyitott, ha a környezeti változó pontosan „igen” (kis/nagybetű mindegy). */
const kapuNyitva = (nev: string): boolean => process.env[nev]?.trim().toLowerCase() === 'igen'

/** A módosítás- és kihagyás-sorok naplózása (a próbafutás csak a szóhasználatban tér el). */
const naplozdLepeseket = (
  lepesek: { modositasok: JavitasLepes[]; kihagyasok: JavitasLepes[] },
  dryRun: boolean,
): void => {
  for (const lepes of lepesek.modositasok) {
    logger.info(`Tartalom-javítás — ${dryRun ? 'MÓDOSÍTANÁ' : 'MÓDOSÍTVA'}: ${lepes.uzenet}`)
  }
  for (const lepes of lepesek.kihagyasok) {
    const sor = `Tartalom-javítás — ${dryRun ? 'KIHAGYNÁ' : 'KIHAGYVA'}: ${lepes.uzenet} (${
      lepes.indok
    })`
    if (lepes.hangos === true) {
      logger.error(sor)
      continue
    }
    logger.warn(sor)
  }
}

/**
 * Média-rekord keresése FÁJLNÉV-PREFIX alapján.
 *
 * A `like` szűrő a lekérdezést szűkíti (SQL-mintaként az `_` egy tetszőleges
 * karakterre is illeszkedne), a tényleges prefix-egyezést ezért kódban
 * ellenőrizzük — így a találat biztosan a keresett fájl. Fix azonosítót
 * szándékosan nem használunk: a Média collection webp-re konvertál, a
 * kiterjesztés környezetenként eltér.
 */
const keresdMediat = async (
  payload: Payload,
  prefix: string,
): Promise<{ id: number; filename: string } | null> => {
  const talalat = await payload.find({
    collection: 'media',
    where: { filename: { like: `${prefix}%` } },
    limit: 25,
    depth: 0,
    overrideAccess: true,
  })
  const sor = talalat.docs.find(
    (doc) => typeof doc.filename === 'string' && doc.filename.startsWith(prefix),
  )
  if (sor === undefined || typeof sor.filename !== 'string') {
    return null
  }
  return { id: sor.id, filename: sor.filename }
}

/**
 * Figyelmeztetés, ha a dokumentumnak a publikáltnál FRISSEBB, még nem publikált
 * piszkozata van.
 *
 * A pages és a products collection is autosave-es piszkozatokkal fut, ezért a
 * szerkesztő mentetlen munkája a publikált változatból nem látszik. A script
 * szándékosan a PUBLIKÁLT változatot javítja (az a látogató által látott
 * tartalom), de ilyenkor a piszkozat későbbi közzététele visszahozná a régi
 * szöveget — ezt jelezni kell, nem elhallgatni. (Ugyanez a csapda:
 * src/scripts/videok-modulba.ts.)
 */
const figyelmeztessPiszkozatra = (
  cimke: string,
  publikaltFrissitve: unknown,
  piszkozatFrissitve: unknown,
): void => {
  if (
    typeof publikaltFrissitve === 'string' &&
    typeof piszkozatFrissitve === 'string' &&
    piszkozatFrissitve > publikaltFrissitve
  ) {
    logger.warn(
      `Tartalom-javítás: a(z) ${cimke} dokumentumnak a publikáltnál FRISSEBB, még nem publikált piszkozata van. A javítás a PUBLIKÁLT változatba került (ez látszik a látogatónak), de a piszkozat későbbi közzététele visszahozhatja a régi szöveget — nézd át az adminban.`,
      { publikalt: publikaltFrissitve, piszkozat: piszkozatFrissitve },
    )
  }
}

async function futtat(): Promise<void> {
  const dryRun = !kapuNyitva('OWNER_CONTENT_CONFIRM')
  const payload: Payload = await getPayload({ config })

  logger.info(
    dryRun
      ? 'Tartalom-javítás: PRÓBAFUTÁS indul (OWNER_CONTENT_CONFIRM=igen nélkül semmi nem íródik).'
      : 'Tartalom-javítás: ÉLES futás indul (OWNER_CONTENT_CONFIRM=igen).',
  )

  let modositasokSzama = 0
  let kihagyasokSzama = 0
  let hiba = false

  // --- 1–2. javítás: a kezdőlap szekciósora ---------------------------------
  const oldalTalalat = await payload.find({
    collection: 'pages',
    where: { slug: { equals: HOME_PAGE_SLUG } },
    limit: 1,
    // depth: 0 — a kapcsolt mezők (képek) azonosítóként jönnek vissza, így a
    // teljes szekciósor visszaírása nem alakítja át a hivatkozásokat.
    depth: 0,
    overrideAccess: true,
  })
  const kezdolap = oldalTalalat.docs[0]

  if (kezdolap === undefined) {
    logger.error(
      `Tartalom-javítás: nem található a kezdőlap (Pages, webcím: „${HOME_PAGE_SLUG}”) — a kezdőlapi javítások kimaradtak.`,
    )
    hiba = true
  } else {
    const eredmeny = alkalmazKezdolapJavitasok(kezdolap.layout)
    naplozdLepeseket(eredmeny, dryRun)
    modositasokSzama += eredmeny.modositasok.length
    kihagyasokSzama += eredmeny.kihagyasok.length

    if (eredmeny.modositasok.length > 0 && !dryRun) {
      await payload.update({
        collection: 'pages',
        id: kezdolap.id,
        // A blokk-mező részlegesen nem frissíthető: a TELJES szekciósor megy
        // vissza, de a nem érintett blokkok objektumai változatlanok.
        data: { layout: eredmeny.layout },
        depth: 0,
        overrideAccess: true,
      })
      const piszkozat = await payload
        .findByID({
          collection: 'pages',
          id: kezdolap.id,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })
        .catch(() => null)
      figyelmeztessPiszkozatra('kezdőlap', kezdolap.updatedAt, piszkozat?.updatedAt)
    }
  }

  // --- 3. javítás: a kurzus előny-sorai -------------------------------------
  const termekTalalat = await payload.find({
    collection: 'products',
    where: { sku: { equals: KURZUS_SKU } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const termek = termekTalalat.docs[0]

  if (termek === undefined) {
    logger.error(
      `Tartalom-javítás: nem található a kurzus (Kurzusok, azonosító: „${KURZUS_SKU}”) — az előny-sorok kimaradtak.`,
    )
    hiba = true
  } else {
    const eredmeny = alkalmazKurzusElonyok(termek.cardHighlights)
    naplozdLepeseket(eredmeny, dryRun)
    modositasokSzama += eredmeny.modositasok.length
    kihagyasokSzama += eredmeny.kihagyasok.length

    if (eredmeny.cardHighlights !== null && !dryRun) {
      await payload.update({
        collection: 'products',
        id: termek.id,
        data: { cardHighlights: eredmeny.cardHighlights },
        depth: 0,
        overrideAccess: true,
      })
      const piszkozat = await payload
        .findByID({
          collection: 'products',
          id: termek.id,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })
        .catch(() => null)
      figyelmeztessPiszkozatra(`kurzus („${KURZUS_SKU}”)`, termek.updatedAt, piszkozat?.updatedAt)
    }
  }

  // --- 4–5. javítás: a /rolunk fejléc-képe és szakmai háttere ---------------
  const rolunkTalalat = await payload.find({
    collection: 'pages',
    where: { slug: { equals: ROLUNK_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const rolunk = rolunkTalalat.docs[0]

  if (rolunk === undefined) {
    logger.error(
      `Tartalom-javítás: nem található a Rólunk oldal (Pages, webcím: „${ROLUNK_SLUG}”) — a fejléc-kép cseréje és a szakmai háttér harmonikába szervezése kimaradt.`,
    )
    hiba = true
  } else {
    const regiKep = await keresdMediat(payload, REGI_ROLUNK_HERO_PREFIX)
    const ujKep = await keresdMediat(payload, UJ_ROLUNK_HERO_PREFIX)
    logger.info('Tartalom-javítás: a fejléc-képhez tartozó média-rekordok', {
      regi: regiKep?.filename ?? '(nem található)',
      uj: ujKep?.filename ?? '(nem található)',
    })

    const eredmeny = alkalmazRolunkHeroKep({
      jelenlegi: rolunk.heroImage,
      regiMediaId: regiKep?.id ?? null,
      ujMediaId: ujKep?.id ?? null,
    })
    naplozdLepeseket(eredmeny, dryRun)
    modositasokSzama += eredmeny.modositasok.length
    kihagyasokSzama += eredmeny.kihagyasok.length

    // --- 5. javítás: a szakmai háttér harmonikába -----------------------------
    const ujBlokkok = rolunkSzakmaiUjBlokkok()
    const harmonika = alkalmazSzakmaiHarmonika({
      layout: rolunk.layout,
      orokoltTartalom: rolunkSzakmaiOrokoltTartalom(),
      ujRovidBlokk: ujBlokkok.rovid,
      ujHarmonikaBlokk: ujBlokkok.harmonika,
    })
    naplozdLepeseket(harmonika, dryRun)
    modositasokSzama += harmonika.modositasok.length
    kihagyasokSzama += harmonika.kihagyasok.length

    // A két javítás EGY frissítésben megy ki (a heroImage és a layout külön
    // mező, nem ütköznek), így egyetlen piszkozat-ellenőrzés elég.
    const irando: { heroImage?: number; layout?: Szekciosor } = {}
    if (eredmeny.heroImage !== null) {
      irando.heroImage = eredmeny.heroImage
    }
    if (harmonika.layout !== null) {
      irando.layout = harmonika.layout
    }

    if (Object.keys(irando).length > 0 && !dryRun) {
      await payload.update({
        collection: 'pages',
        id: rolunk.id,
        data: irando,
        depth: 0,
        overrideAccess: true,
      })
      const piszkozat = await payload
        .findByID({
          collection: 'pages',
          id: rolunk.id,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })
        .catch(() => null)
      figyelmeztessPiszkozatra('Rólunk oldal', rolunk.updatedAt, piszkozat?.updatedAt)
    }
  }

  // --- 6. javítás: a három jogi oldal létrehozása ---------------------------
  // A meglévő webcímeket EGY lekérdezés deríti ki (draft-ot is beleértve: a
  // publikálatlan piszkozat is „létező" oldal — ha ilyet találunk, a script
  // hozzá sem nyúl, nehogy párhuzamos, második jogi oldal keletkezzen).
  const jogiSlugok = JOGI_OLDALAK.map((oldal) => oldal.slug)
  const jogiTalalat = await payload.find({
    collection: 'pages',
    where: { slug: { in: jogiSlugok } },
    limit: jogiSlugok.length,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  const jogiEredmeny = alkalmazJogiOldalak({
    letezoSlugok: jogiTalalat.docs
      .map((doc) => doc.slug)
      .filter((slug): slug is string => typeof slug === 'string'),
  })
  naplozdLepeseket(jogiEredmeny, dryRun)
  modositasokSzama += jogiEredmeny.modositasok.length
  kihagyasokSzama += jogiEredmeny.kihagyasok.length

  if (!dryRun) {
    for (const adat of jogiEredmeny.letrehozando) {
      await payload.create({
        collection: 'pages',
        data: { ...adat, publishedAt: new Date().toISOString() },
        depth: 0,
        overrideAccess: true,
      })
    }
  }

  // --- 7. javítás: az SOS kurzus webcíme ------------------------------------
  const sosTalalat = await payload.find({
    collection: 'products',
    where: { sku: { equals: SOS_COURSE_SKU } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const sosKurzus = sosTalalat.docs[0]

  if (sosKurzus === undefined) {
    logger.error(
      `Tartalom-javítás: nem található az SOS kurzus (Kurzusok, azonosító: „${SOS_COURSE_SKU}”) — a webcím javítása kimaradt.`,
    )
    hiba = true
  } else {
    const eredmeny = alkalmazSosKurzusSlug(sosKurzus.slug)
    naplozdLepeseket(eredmeny, dryRun)
    modositasokSzama += eredmeny.modositasok.length
    kihagyasokSzama += eredmeny.kihagyasok.length

    if (eredmeny.slug !== null && !dryRun) {
      await payload.update({
        collection: 'products',
        id: sosKurzus.id,
        data: { slug: eredmeny.slug },
        depth: 0,
        overrideAccess: true,
      })
      const piszkozat = await payload
        .findByID({
          collection: 'products',
          id: sosKurzus.id,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })
        .catch(() => null)
      figyelmeztessPiszkozatra(
        `SOS kurzus („${SOS_COURSE_SKU}”)`,
        sosKurzus.updatedAt,
        piszkozat?.updatedAt,
      )
    }
  }

  // --- 8. javítás: a rendelői szekció horgonya ------------------------------
  const szolgaltatasokTalalat = await payload.find({
    collection: 'pages',
    where: { slug: { equals: SZOLGALTATASOK_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const szolgaltatasok = szolgaltatasokTalalat.docs[0]

  if (szolgaltatasok === undefined) {
    logger.error(
      `Tartalom-javítás: nem található a Szolgáltatások oldal (Pages, webcím: „${SZOLGALTATASOK_SLUG}”) — a rendelői horgony javítása kimaradt.`,
    )
    hiba = true
  } else {
    const eredmeny = alkalmazRendeloiHorgony(szolgaltatasok.layout)
    naplozdLepeseket(eredmeny, dryRun)
    modositasokSzama += eredmeny.modositasok.length
    kihagyasokSzama += eredmeny.kihagyasok.length

    if (eredmeny.layout !== null && !dryRun) {
      await payload.update({
        collection: 'pages',
        id: szolgaltatasok.id,
        data: { layout: eredmeny.layout },
        depth: 0,
        overrideAccess: true,
      })
      const piszkozat = await payload
        .findByID({
          collection: 'pages',
          id: szolgaltatasok.id,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })
        .catch(() => null)
      figyelmeztessPiszkozatra(
        'Szolgáltatások oldal',
        szolgaltatasok.updatedAt,
        piszkozat?.updatedAt,
      )
    }
  }

  // --- Összesítés -----------------------------------------------------------
  const osszesites = `${modositasokSzama} módosítás, ${kihagyasokSzama} indokolt kihagyás`

  if (dryRun) {
    logger.info(
      `Tartalom-javítás PRÓBAFUTÁS kész — összesítés: ${osszesites}. Az adatbázisba SEMMI nem íródott. Tényleges futtatás: OWNER_CONTENT_CONFIRM=igen npm run content:owner`,
    )
    if (hiba) {
      process.exitCode = 1
    }
    return
  }

  if (hiba) {
    logger.error(
      `Tartalom-javítás HIÁNYOSAN futott le — összesítés: ${osszesites}. A hiányzó dokumentum(ok) miatt nem minden javítás történt meg; nézd át a fenti hibasorokat.`,
    )
    process.exitCode = 1
    return
  }

  logger.info(`Tartalom-javítás kész — összesítés: ${osszesites}.`)
  logger.info('OWNER_CONTENT_OK')
}

// A modul mellékhatás nélkül importálható (a tiszta átalakítások így
// tesztelhetők); a futtatás csak közvetlen indításkor indul el.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  futtat()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((error: unknown) => {
      logger.error('Tartalom-javítás: hiba történt.', {
        error: error instanceof Error ? error.message : String(error),
      })
      process.exit(1)
    })
}
