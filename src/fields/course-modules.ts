import type { ArrayField, Field } from 'payload'

import { streamAssetReadAccess } from '../access/streamAssetRead'

/**
 * A kurzus TANANYAG-szerkezete: modulok (fejezetek) → leckék (`products.modules`).
 *
 * ═══ MIÉRT ÚJ MEZŐ, ÉS MIÉRT MARAD A RÉGI `videos` ═══
 * A kurzusok eddig EGY lapos videó-listát (`products.videos`) hordoztak. A
 * megrendelői elvárás viszont fejezetekre bontott tananyag („1. ALAPOK",
 * „2. MIÉRT FÁJ?", „BÓNUSZOK"…), és a leckék nem mind videók: van köztük
 * szöveges anyag, letölthető segédlet és külső link (pl. Facebook-csoport).
 *
 * A `videos` tömb ezért ÉRINTETLEN marad, és a `modules` MELLÉ kerül:
 * - a meglévő kurzusok egyetlen sor adatmozgatás nélkül tovább működnek,
 * - a migráció NEM destruktív (nincs DROP, nincs adatátírás),
 * - a már rögzített haladás-sorok (`course-progress.videoRef`) érvényben
 *   maradnak, mert a régi videó-sorok azonosítói változatlanok.
 * A felület a kettőt egyetlen tananyag-modellben egyesíti
 * (src/lib/curriculum/curriculum.ts): ha van `modules`, azt mutatja; ha nincs,
 * a `videos` tömbből képez egyetlen, implicit modult.
 *
 * ═══ AZONOSÍTÓ-NÉVTÉR: MIÉRT NEM ÜTKÖZHET A KÉT TÖMB ═══
 * A haladás a videó/lecke STABIL azonosítójára hivatkozik (`streamVideoRef`,
 * src/lib/stream/contract.ts) — elsődlegesen az array-SOR saját `id`-ja. A
 * Payload ezt az `id`-t BSON ObjectID hex-stringként generálja
 * (node_modules/payload/dist/fields/baseFields/baseIDField.js:9 —
 * `defaultValue: () => new ObjectId().toHexString()`), tehát NEM tábla-szintű
 * sorszám: egyetlen, globálisan egyedi generátorból jön minden array-tömbhöz.
 * (Élesben ellenőrizve: ugyanazon a mentésen a `products_gallery` sorai
 * …9972/…9973, a `products_videos` sorai …9974/…9975 azonosítót kaptak.)
 * Következmény: egy `products_modules_lessons` sor azonosítója SOSEM eshet
 * egybe egy `products_videos` sor azonosítójával — a `videoRef` névtér közös
 * használata biztonságos, és a haladás nem mutathat idegen leckére.
 *
 * ═══ BIZTONSÁG ═══
 * A lecke `streamAssetId` mezője UGYANAZT a mezőszintű olvasás-védelmet kapja,
 * mint a régi videó-soré (`streamAssetReadAccess`, src/access/streamAssetRead.ts) —
 * a szabály VÁLTOZATLANUL kerül újrafelhasználásra, nem módosul. Enélkül az új
 * szerkezet kinyitná azt a rést, amit az S2/b sec-review a régin bezárt: a
 * nyilvános `GET /api/products` kiadná a fizetős tartalom Bunny-GUID-jait.
 * Az access-függvény tetszőleges mélységű array-almezőn működik, mert a Payload
 * a TOP-LEVEL dokumentumot adja át (`doc`/`id`) — lásd a függvény fejlécét.
 */

/** A lecke típusai — a felület ez alapján dönti el, mit és hogyan jelenít meg. */
export const LESSON_KIND_VIDEO = 'video'
export const LESSON_KIND_TEXT = 'szoveg'
export const LESSON_KIND_LINK = 'link'

/**
 * A videó-állapot opciói — SZÓ SZERINT a `products.videos.status` mezőé
 * (src/plugins/ecommerce.ts), hogy a szerkesztő ugyanazt a három állapotot
 * lássa mindkét helyen, és a lejátszhatóság szabálya se térhessen el.
 */
const lessonStatusOptions = [
  { label: 'Feldolgozás alatt', value: 'processing' },
  { label: 'Kész', value: 'ready' },
  { label: 'Hiba', value: 'error' },
]

/** `siblingData.kind` kiolvasása típusszűkítéssel (`any` tilos). */
function lessonKindOf(siblingData: unknown): string | null {
  if (typeof siblingData !== 'object' || siblingData === null) {
    return null
  }
  const value = (siblingData as { kind?: unknown }).kind
  return typeof value === 'string' ? value : null
}

/**
 * A videó-almezők csak videó-leckén látszanak. A `condition` KIZÁRÓLAG
 * admin-megjelenítés (nincs séma- vagy adathatása), a szerver-oldali
 * lejátszhatóság-szabály ettől függetlenül a `kind`-ot is nézi
 * (src/lib/curriculum/curriculum.ts).
 *
 * A `kind` a mező bevezetése előtti (nem létező) soroknál üres lehet — az üres
 * érték a videó-ágba sorolódik, egyezően a modell `normalizeLessonKind`-jével.
 */
const showForVideo = (_data: unknown, siblingData: unknown): boolean => {
  const kind = lessonKindOf(siblingData)
  return kind === null || kind === LESSON_KIND_VIDEO
}

const showForLink = (_data: unknown, siblingData: unknown): boolean =>
  lessonKindOf(siblingData) === LESSON_KIND_LINK

/** Egy lecke mezői. */
const lessonFields: Field[] = [
  {
    name: 'title',
    type: 'text',
    required: true,
    label: 'Lecke címe',
    admin: {
      description: 'Ez jelenik meg a tananyag-listában, pl. „Ismerd meg a kezed”.',
    },
  },
  {
    name: 'kind',
    type: 'select',
    required: true,
    defaultValue: LESSON_KIND_VIDEO,
    label: 'Lecke típusa',
    options: [
      { label: 'Videó', value: LESSON_KIND_VIDEO },
      { label: 'Szöveges lecke', value: LESSON_KIND_TEXT },
      { label: 'Külső link', value: LESSON_KIND_LINK },
    ],
    admin: {
      description:
        'Videó = Bunny Stream felvétel. Szöveges lecke = csak írott anyag és/vagy letölthető fájl. Külső link = máshová vezet (pl. Facebook-csoport).',
    },
  },
  {
    name: 'summary',
    type: 'textarea',
    label: 'Rövid összefoglaló',
    admin: {
      description: '1–2 mondat a lecke alatt. Nem kötelező.',
    },
  },
  {
    name: 'streamAssetId',
    type: 'text',
    label: 'Videó azonosítója',
    // Ugyanaz a mezőszintű védelem, mint a régi videó-soron (S2/b).
    access: {
      read: streamAssetReadAccess,
    },
    admin: {
      condition: showForVideo,
      // A zsargon („GUID", „library") az admin UX-audit szerint a kurzusfeltöltés
      // leggyakoribb elakadási pontja volt: a szerkesztő nem tudta, MELYIK
      // értéket kell a Bunny felületéről kimásolni — és rossz érték mellett a
      // videó némán nem indul el.
      description:
        'A videó azonosítója. A Bunny felületén nyisd meg a videót, és másold ki a „Video ID” mezőt (hosszú, kötőjeles kód). A fizetős kurzusvideók a VÉDETT videótárban vannak (csak vásárlás után nézhetők), az ingyenes előzetesek a nyilvánosban.',
    },
  },
  {
    name: 'durationSec',
    type: 'number',
    label: 'Hossz (másodperc)',
    admin: {
      condition: showForVideo,
      description:
        'A videó hossza másodpercben. A lejátszási jegy kiállításához KÖTELEZŐ — nélküle a videó nem indul el.',
    },
  },
  {
    name: 'status',
    type: 'select',
    defaultValue: 'processing',
    label: 'Videó állapota',
    options: lessonStatusOptions,
    admin: {
      condition: showForVideo,
      description:
        'Nincs feltöltő-automatizmus, ezért KÉZZEL kell „Kész”-re állítani, miután a Bunny végzett a feldolgozással — csak a Kész állapotú videó játszható le és számít bele a haladásba.',
    },
  },
  {
    name: 'url',
    type: 'text',
    label: 'Külső webcím',
    // A code review mérte: a lecke-almezők közül korábban csak a Bunny-GUID
    // volt védett, miközben a külső link, a szöveges tananyag és a mellékletek
    // UGYANÚGY a fizetős tartalom hordozói — a nyilvános GET /api/products
    // kiadta volna őket nem vásárlónak. Ugyanaz a MEGLÉVŐ szabály védi mindet
    // (streamAssetReadAccess, VÁLTOZATLANUL újrahasznosítva): staff/owner
    // mindig, vevő csak megvett kurzusnál, anonim soha.
    access: {
      read: streamAssetReadAccess,
    },
    admin: {
      condition: showForLink,
      description: 'Teljes webcím (https://…), ahová a lecke gombja visz.',
    },
  },
  {
    name: 'content',
    type: 'richText',
    label: 'Lecke szövege',
    access: {
      read: streamAssetReadAccess,
    },
    admin: {
      description:
        'A lecke alatt megjelenő írott anyag — videós leckénél jegyzet vagy gyakorlásleírás is lehet. Nem kötelező.',
    },
  },
  {
    name: 'attachments',
    type: 'array',
    label: 'Letölthető anyagok',
    labels: {
      singular: 'Melléklet',
      plural: 'Mellékletek',
    },
    access: {
      read: streamAssetReadAccess,
    },
    admin: {
      description: 'PDF, kép vagy egyéb segédlet a leckéhez. Bármelyik lecketípushoz adható.',
    },
    fields: [
      {
        name: 'label',
        type: 'text',
        label: 'Megnevezés',
        admin: {
          description: 'Ha üresen hagyod, a fájl neve jelenik meg.',
        },
      },
      {
        name: 'file',
        type: 'upload',
        relationTo: 'media',
        required: true,
        label: 'Fájl',
      },
    ],
  },
]

/**
 * A `products.modules` mező.
 *
 * Az `initCollapsed` szándékos: egy 27 leckés kurzusnál a nyitott állapot
 * kezelhetetlen szerkesztői felületet adna. Az összecsukás viszont CSAK
 * beszédes sorfelirattal működik — enélkül (az admin UX-audit mérése szerint) a
 * hét modul nyolc teljesen egyforma, „Modul 01…08" feliratú szürke csík volt, és
 * a szerkesztő egyesével nyitogatta ki őket, hogy megtalálja a keresettet.
 * Ezért kap a modul- és a lecke-sor is `RowLabel`-t: a felirat a CÍM (a leckék
 * számával, illetve a lecke típusával és lejátszhatóságával).
 * A feliratképzés tiszta logikája: src/components/admin/curriculum-row-label.ts.
 */
export const courseModulesField: ArrayField = {
  name: 'modules',
  type: 'array',
  label: 'Tananyag (modulok)',
  labels: {
    singular: 'Modul',
    plural: 'Modulok',
  },
  admin: {
    initCollapsed: true,
    components: {
      RowLabel: '/components/admin/CurriculumRowLabels#ModuleRowLabel',
    },
    description:
      'A kurzus tananyaga fejezetekre bontva. A vásárló ebben a sorrendben látja a leckéket. Ha üresen hagyod, a lenti „Videók” lista jelenik meg egyetlen fejezetként.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Modul címe',
      admin: {
        description: 'Pl. „1. ALAPOK — Így kezdj neki”.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Modul rövid leírása',
      admin: {
        description: 'Egy mondat a fejezetről a tananyag-listában. Nem kötelező.',
      },
    },
    {
      name: 'lessons',
      type: 'array',
      label: 'Leckék',
      labels: {
        singular: 'Lecke',
        plural: 'Leckék',
      },
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '/components/admin/CurriculumRowLabels#LessonRowLabel',
        },
      },
      fields: lessonFields,
    },
  ],
}
