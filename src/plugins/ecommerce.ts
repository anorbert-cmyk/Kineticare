import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import type { CollectionOverride, Currency } from '@payloadcms/plugin-ecommerce/types'
import type { JSONSchema4 } from 'json-schema'
import type { Config, Field, FieldAccess } from 'payload'

import {
  adminOrPublishedStatus,
  applyCollectionAccessPolicies,
  isAdmin,
  isAdminFieldAccess,
  isDocumentOwner,
  isOwnerFieldAccess,
} from '../access'
import { courseSlugField } from '../fields/course-slug'
import { orderIntegrityBeforeChange } from '../lib/order-integrity'
import { withoutPluginPaymentEndpoints } from '../lib/payments/barion-adapter'

/**
 * HUF deviza — a forintban nincs tizedesjegy (decimals: 0).
 */
export const HUF: Currency = {
  code: 'HUF',
  decimals: 0,
  label: 'Magyar forint',
  symbol: 'Ft',
}

/**
 * Az access-függvények az src/access/ központi modulból jönnek (T-011).
 * A plugin kötelező bekötése:
 * - isAdmin = staff+owner (a rendszer "admin" szintje)
 * - adminOnlyFieldAccess: a plugin pénzügyi default mezői (pl. amount,
 *   transactions) csak staff+owner-nek látszanak
 * - adminOrPublishedStatus: products read — staff/owner draftot is lát,
 *   mások csak a published draft-verziót (`_status` mező!)
 * - isDocumentOwner: customer csak a saját orders/carts dokumentumait
 */
const adminOnlyFieldAccess = isAdminFieldAccess

/**
 * Rekurzív mezőfa-bejárás: a plugin gyári mezői group/row/tabs-struktúrába
 * ágyazottak (pl. a products ár-mezői egy group → row alatt, az orders items
 * egy tabs alatt), ezért a mezőszintű access- és snapshot-bekötés így éri el őket.
 */
const mapFieldsDeep = (fields: Field[], visit: (field: Field) => Field): Field[] =>
  fields.map((field) => {
    const visited = visit(field)
    if ('fields' in visited && Array.isArray(visited.fields)) {
      return { ...visited, fields: mapFieldsDeep(visited.fields as Field[], visit) } as Field
    }
    if (visited.type === 'tabs' && Array.isArray(visited.tabs)) {
      return {
        ...visited,
        tabs: visited.tabs.map((tab) => ({
          ...tab,
          fields: mapFieldsDeep(tab.fields as Field[], visit),
        })),
      } as Field
    }
    return visited
  })

interface FieldAccessShape {
  create?: FieldAccess
  read?: FieldAccess
  update?: FieldAccess
  delete?: FieldAccess
}

type NamedField = Field & { name: string; access?: FieldAccessShape }

const namedField = (field: Field): NamedField | null =>
  'name' in field && typeof field.name === 'string' && field.type !== 'ui'
    ? (field as NamedField)
    : null

/**
 * T-011: a products ár-mezői (priceInHUF, priceInHUFEnabled) create/update
 * kizárólag ownernek — a staff így nem módosíthat árat.
 */
const ownerOnlyProductFieldNames = new Set(['priceInHUF', 'priceInHUFEnabled'])

const withOwnerOnlyPriceAccess = (field: Field): Field => {
  const named = namedField(field)
  if (!named || !ownerOnlyProductFieldNames.has(named.name)) {
    return field
  }
  return {
    ...named,
    access: {
      ...named.access,
      create: isOwnerFieldAccess,
      update: isOwnerFieldAccess,
    },
  } as Field
}

/**
 * T-017: item-szintű snapshot-mezők az orders items tömbjébe. A hook tölti őket
 * szerver-oldalon, create-kor; a kliens által küldött érték sosem forrás
 * (create/update access zárt, a hook amúgy is felülír).
 */
const orderItemSnapshotFields: Field[] = [
  {
    name: 'titleSnapshot',
    type: 'text',
    label: 'Kurzus neve a megrendeléskor',
    access: {
      create: () => false,
      update: () => false,
    },
    admin: {
      readOnly: true,
      description:
        'A termék azonosító-neve (sku) a megrendeléskor. SZÁNDÉKOSAN a sku, nem a kurzuscím (displayTitle): a rendelés- és számlasoron a stabil azonosító a hasznos, a marketingcím változhat.',
    },
  },
  {
    name: 'priceHufSnapshot',
    type: 'number',
    label: 'Ár a megrendeléskor (Ft)',
    access: {
      create: () => false,
      update: () => false,
    },
    admin: {
      readOnly: true,
      description: 'A termék priceInHUF értéke a megrendeléskor (szerver-oldali forrás).',
    },
  },
]

const withOrderItemSnapshots = (field: Field): Field => {
  const named = namedField(field)
  if (!named || named.name !== 'items' || named.type !== 'array') {
    return field
  }
  return {
    ...named,
    fields: [...(named.fields as Field[]), ...orderItemSnapshotFields],
  } as Field
}

/**
 * Az orders.refunds json-mező ERŐS típusa a generált payload-types.ts-hez.
 *
 * A `json` mezőkből a típusgenerátor alapból `unknown`-t (bármit) csinál — a
 * refunds-t viszont pénzügyi kód olvassa (src/lib/refund/*), ezért itt kézzel
 * megadjuk a séma-alakot. Így a `npm run generate:types` újrafuttatása után is
 * a bejegyzés-szintű mezők (transactionId, amountHuf, status, refundedAt, type,
 * reason) típusosak maradnak, és a fordító elkapja az elgépeléseket.
 *
 * A séma a refund-szolgáltatás által írt alakot tükrözi — ha ott új mező kerül
 * a bejegyzésbe, ezt is bővíteni kell.
 */
const refundsTypescriptSchema: JSONSchema4 = {
  type: ['array', 'null'],
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['transactionId', 'amountHuf', 'status', 'refundedAt', 'type'],
    properties: {
      transactionId: { type: 'string' },
      amountHuf: { type: 'number' },
      status: { type: 'string' },
      refundedAt: { type: 'string' },
      type: { type: 'string', enum: ['full', 'partial'] },
      reason: { type: ['string', 'null'] },
    },
  },
}

/**
 * T-021/T-063: az orders `status` mező üzleti állapotgépe.
 *
 * A plugin gyári állapotait (processing/completed/cancelled/refunded) a
 * pénzügyi főlánc állapotgépe váltja:
 *   created → payment_pending → paid | payment_failed (+ cancelled/refunded).
 * A `paid` átmenet KIZÁRÓLAG a Barion-callback-útvonal (T-022) joga — sem a
 * plugin confirmOrder-je (ismert beta-hiba: nem ellenőrzi a fizetés tényleges
 * státuszát), sem a checkout-start nem állíthat paid-re.
 *
 * DB-megjegyzés: az enum-értékcsere migrációt igényel (az enum_orders_status
 * újraépül); a régi processing/completed értékek kódoldalon megszűnnek.
 */
const orderStatusStateMachineOptions = [
  { label: 'Created', value: 'created' },
  { label: 'Payment pending', value: 'payment_pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Payment failed', value: 'payment_failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
]

const withOrderStatusStateMachine = (field: Field): Field => {
  const named = namedField(field)
  if (!named || named.name !== 'status' || named.type !== 'select') {
    return field
  }
  return {
    ...named,
    defaultValue: 'created',
    options: orderStatusStateMachineOptions,
  } as Field
}

const visitOrderFields = (field: Field): Field =>
  withOrderStatusStateMachine(withOrderItemSnapshots(field))

/**
 * Admin-csoport a webshop-collectionöknek: a plugin gyári collectionjei
 * egységesen a „Webshop" fül alá kerülnek, magyar megnevezéssel — így a
 * szerkesztő az oldalsávban elkülönítve látja a tartalmat és a webshopot.
 */
const WEBSHOP_GROUP = 'Webshop'

/**
 * Products override: a plugin gyári mezői (inventory, priceInHUF…) megmaradnak,
 * a kurzus-specifikus mezők mögéjük kerülnek.
 *
 * `useAsTitle: 'sku'` marad a `displayTitle` bevezetése után is: a displayTitle
 * a régi sorokon üres, és a useAsTitle-t rá állítva az admin listája ezeknél
 * csak az azonosítót mutatná.
 */
const productsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  labels: {
    singular: 'Kurzus',
    plural: 'Kurzusok',
  },
  admin: {
    ...defaultCollection.admin,
    useAsTitle: 'sku',
    group: WEBSHOP_GROUP,
    description: 'A megvásárolható kurzusok. Az árat és a közzétételt csak tulajdonos állíthatja.',
    // KÖTELEZŐ felülírás: a plugin `defaultColumns: ['prices']`-t állít be
    // (createProductsCollection), DE nincs `prices` nevű mező — a pricesField
    // egy NÉVTELEN group → row alá teszi a `priceInHUFEnabled` + `priceInHUF`
    // mezőket. A nem létező oszlopnév miatt a lista NULLA oszloppal rendelődik
    // ki: nincs cím, nincs kattintható link, a kurzus nem nyitható meg. A
    // `...defaultCollection.admin` ezt öröklené, ezért itt explicit lista kell.
    // Az első oszlop a dokumentumra mutató link, ezért `sku` (kötelező, egyedi,
    // és ez a useAsTitle) — a displayTitle a régi sorokon üres lehet.
    defaultColumns: ['sku', 'displayTitle', 'audience', 'priceInHUF', 'status', 'updatedAt'],
  },
  fields: [
    ...mapFieldsDeep(defaultCollection.fields, withOwnerOnlyPriceAccess),
    {
      // C3: a látogatónak szóló kurzuscím. A `sku` egyszerre volt eddig
      // azonosító és megjelenő név; a displayTitle ezt szétválasztja, és ez a
      // slug ELSŐDLEGES forrása is (src/lib/course-url.ts). Nem kötelező: ha
      // üres, a megjelenő név a `sku` marad (src/lib/courses.ts courseTitle).
      name: 'displayTitle',
      type: 'text',
      label: 'Kurzus címe',
      admin: {
        description:
          'A kurzus címe, ahogy a látogató látja (pl. „Kéztorna otthon — 8 hetes program"). Ebből készül a webcím is. Ha üresen hagyod, a lenti „Kurzus neve (azonosító)" jelenik meg.',
      },
    },
    courseSlugField,
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Rövid leírás',
      admin: {
        description: '1–3 mondat. A kurzuskártyákon és a kezdőlapon ez látszik.',
      },
    },
    {
      name: 'longDescription',
      type: 'richText',
      label: 'Részletes leírás',
      admin: {
        description: 'A kurzus oldalán megjelenő teljes szöveg.',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Borítókép',
      admin: {
        description: 'A kurzus kártyáján és az oldala tetején megjelenő kép.',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Képgaléria',
      labels: {
        singular: 'Kép',
        plural: 'Képek',
      },
      admin: {
        description: 'További képek a kurzus oldalára (nem kötelező).',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Kép',
        },
      ],
    },
    // SEO-mezők — a Pages/Posts collectionök mintájára, azonos mezőnevekkel,
    // label-ekkel és pozícióval (a borítókép UTÁN), hogy a szerkesztő minden
    // tartalomtípusnál ugyanazt lássa ugyanott. A kurzusoldal fallback-lánca
    // ezekre épül (src/lib/seo.ts: seoTitle → név, seoDescription → rövid
    // leírás, ogImage → borítókép).
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO-cím',
      admin: {
        description: 'Ha üresen hagyod, a Google a kurzus nevét használja.',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      label: 'SEO-leírás',
      admin: {
        description: 'A Google találati listáján megjelenő rövid leírás (kb. 150 karakter).',
      },
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Megosztási kép',
      admin: {
        description:
          'Ez a kép jelenik meg, ha valaki Facebookon vagy Messengeren megosztja a kurzust.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Kategória',
      admin: {
        description: 'Kötelező. Ha nincs megfelelő, előbb hozd létre a Tartalom → Kategóriák alatt.',
      },
    },
    {
      // Kétirányú kurzusstruktúra: a kínálat két ága. NEM kötelező, mert a mező
      // bevezetése előtti sorokban NULL marad — a felület minden nem-'szakember'
      // értéket a laikus ágba sorol (src/lib/course-audience.ts).
      name: 'audience',
      type: 'select',
      label: 'Kinek szól',
      defaultValue: 'laikus',
      options: [
        { label: 'Otthoni gyakorlóknak', value: 'laikus' },
        { label: 'Szakembereknek', value: 'szakember' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Ez dönti el, hogy a Kurzusok oldalon melyik sávban jelenik meg: „Otthoni gyakorlóknak" vagy „Szakembereknek". Ha üresen marad, az otthoni sávba kerül.',
      },
    },
    {
      name: 'previewVideoStreamId',
      type: 'text',
      label: 'Bemutató videó azonosítója',
      admin: {
        description:
          'Az ingyenes előzetes Bunny videó GUID-ja — a PUBLIKUS (jegy nélküli) libraryből, a Bunny felületén a videó adatlapján található. Ha nem tudod, hagyd üresen.',
      },
    },
    {
      name: 'videos',
      type: 'array',
      label: 'Videók',
      labels: {
        singular: 'Videó',
        plural: 'Videók',
      },
      admin: {
        description: 'A kurzus videói — a vásárlók ezeket nézhetik meg.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Videó címe',
        },
        {
          name: 'streamAssetId',
          type: 'text',
          label: 'Videó azonosítója',
          admin: {
            description:
              'A Bunny Stream videó GUID-ja — a VÉDETT libraryből, a Bunny felületén a videó adatlapján található. Kézzel másolandó be.',
          },
        },
        {
          name: 'durationSec',
          type: 'number',
          label: 'Hossz (másodperc)',
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'processing',
          label: 'Videó állapota',
          options: [
            { label: 'Feldolgozás alatt', value: 'processing' },
            { label: 'Kész', value: 'ready' },
            { label: 'Hiba', value: 'error' },
          ],
          admin: {
            description:
              'A videó feldolgozottsága. Nincs feltöltő-automatizmus, ezért KÉZZEL kell „Kész"-re állítani, miután a Bunny végzett a feldolgozással — csak a Kész állapotú videó játszható le.',
          },
        },
      ],
    },
    {
      name: 'accessDurationDays',
      type: 'number',
      label: 'Hozzáférés hossza (nap)',
      admin: {
        description:
          'Hány napig érvényes a hozzáférés vásárlás után. Üres (null) = örök hozzáférés.',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Állapot',
      // A Payload a drafts `_status` mezőnek ugyanazt az enum-nevet generálná
      // (toSnakeCase('_status') === 'status'), így az alapértelmezett névütközés
      // miatt a 'archived' érték elveszne az adatbázis-enumokból. Külön enum-név
      // a products és a _products_v (versions) táblában is — az oszlopnév és az
      // API-mezőnév változatlanul `status` marad.
      enumName: ({ tableName }) => `enum_${tableName}_product_status`,
      options: [
        { label: 'Piszkozat', value: 'draft' },
        { label: 'Közzétéve', value: 'published' },
        { label: 'Archivált', value: 'archived' },
      ],
      admin: {
        description: 'Csak a közzétett kurzus látszik az oldalon. Ezt csak tulajdonos állíthatja.',
      },
      // T-011: a publikálás/archiválás (status create/update) kizárólag owneri
      // döntés — a staff draftot készíthet, de nem publikálhat.
      access: {
        create: isOwnerFieldAccess,
        update: isOwnerFieldAccess,
      },
    },
    {
      name: 'sku',
      type: 'text',
      unique: true,
      label: 'Kurzus neve (azonosító)',
      admin: {
        description:
          'A kurzus egyedi azonosítója — két kurzusnak nem lehet ugyanaz. Ez jelenik meg a rendeléseken és a számlán. Ha a fenti „Kurzus címe" üres, a látogató is ezt látja.',
      },
    },
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Kapcsolódó kurzusok',
      admin: {
        description: 'A kurzus oldalán ajánlott további kurzusok.',
      },
    },
  ],
})

/**
 * Orders override: a plugin gyári mezői (items, customer, status, amount…) megmaradnak,
 * a Barion-/számlázás-specifikus mezők mögéjük kerülnek.
 *
 * T-011 mezőszintű védelem:
 * - a pénzügyi/személyes mezők (customerSnapshot, ipAddress, invoiceNumber,
 *   barionPaymentId) read-access-e owner-only — a staff ugyan olvashatja a
 *   rendelést (collection-szint), de ezeket a mezőket nem;
 * - refundedAt/refundReason update owner-only (a refund-folyamat későbbi ticket).
 *
 * T-017 rendelés-integritás:
 * - orderNumber + totalHufSnapshot + item-snapshotok (titleSnapshot,
 *   priceHufSnapshot) — mindegyiket az orderIntegrityBeforeChange hook tölti
 *   szerver-oldalon, kizárólag create-kor; update-kor újraszámolás nincs.
 *   A kliens ezeket nem írhatja (create/update access zárt).
 */
const ordersCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  labels: {
    singular: 'Rendelés',
    plural: 'Rendelések',
  },
  admin: {
    ...defaultCollection.admin,
    group: WEBSHOP_GROUP,
    description:
      'A leadott rendelések és a fizetésük állapota. A rendeléseket a rendszer kezeli — kézzel ne módosítsd őket.',
  },
  fields: [
    ...mapFieldsDeep(defaultCollection.fields, visitOrderFields),
    {
      name: 'orderNumber',
      type: 'text',
      label: 'Rendelésszám',
      // Postgresben a unique index több NULL-t is megenged, így gyakorlatilag sparse.
      unique: true,
      index: true,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          'Szerver-oldalon generált rendelésszám (KH-<év>-<6 jegyű sorszám>); create-kor töltődik, update-kor sosem számolódik újra.',
      },
    },
    {
      name: 'totalHufSnapshot',
      type: 'number',
      label: 'Végösszeg a megrendeléskor (Ft)',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          'A rendelés végösszege a megrendeléskor (az item-snapshotok ár × mennyiség összege). A plugin amount mezője ugyanezt tükrözi.',
      },
    },
    {
      name: 'barionPaymentId',
      type: 'text',
      label: 'Barion fizetésazonosító',
      // Postgresben a unique index több NULL-t is megenged, így gyakorlatilag sparse.
      unique: true,
      index: true,
      access: {
        read: isOwnerFieldAccess,
      },
      admin: {
        description: 'A Barion oldali fizetés azonosítója — hibakereséshez.',
      },
    },
    {
      name: 'barionPaymentRequestId',
      type: 'text',
      label: 'Barion kérésazonosító',
    },
    {
      name: 'invoiceNumber',
      type: 'text',
      label: 'Számla sorszáma',
      access: {
        read: isOwnerFieldAccess,
      },
    },
    {
      name: 'invoicePdfUrl',
      type: 'text',
      label: 'Számla PDF linkje',
    },
    {
      name: 'invoiceStatus',
      type: 'select',
      defaultValue: 'none',
      label: 'Számla állapota',
      options: [
        { label: 'Nincs', value: 'none' },
        { label: 'Függőben', value: 'pending' },
        { label: 'Kiállítva', value: 'issued' },
        { label: 'Sikertelen', value: 'failed' },
      ],
      admin: {
        description: 'A számlázás állapota. A rendszer állítja — ne írd át.',
      },
    },
    {
      // A Számlázz.hu hivatalos szabálya (A14): ugyanaz a kérés legfeljebb
      // ötször küldhető be, utána emberi beavatkozás kell — a perzisztens
      // számláló a job-újrapróbálás és a resweep együttesét is plafonozza.
      name: 'invoiceAttempts',
      type: 'number',
      defaultValue: 0,
      label: 'Számla-kísérletek száma',
      admin: {
        readOnly: true,
        description:
          'A számlakiállítási kísérletek száma (legfeljebb 5, utána emberi beavatkozás kell). A rendszer állítja.',
      },
    },
    {
      name: 'invoiceLastError',
      type: 'text',
      label: 'Számlázás utolsó hibája',
      admin: {
        readOnly: true,
        description: 'Az utolsó sikertelen számlakiállítási kísérlet hibaüzenete — hibakereséshez.',
      },
    },
    {
      // Az eredeti számla teljesítési dátuma (ÉÉÉÉ-HH-NN). A helyesbítő számla
      // dátumszabálya (NAV): a helyesbítő teljesítési dátumának naptári hónapja
      // nem térhet el az eredetiétől — a bevett gyakorlat az eredeti dátum
      // megismétlése, ezért a kiállításkor küldött teljesítési dátum itt rögzül.
      name: 'invoiceCompletionDate',
      type: 'text',
      label: 'Számla teljesítési dátuma',
      admin: {
        readOnly: true,
        description:
          'Az eredeti számla teljesítési dátuma (ÉÉÉÉ-HH-NN) — a helyesbítő számla ezt ismétli meg. A rendszer állítja.',
      },
    },
    {
      // Stornó-számla állapota (C4). Az invoiceStatus mintáját követi: a
      // rendszer (refund-folyamat + storno-issue job) állítja, kézzel nem
      // írandó. A 'storned' a végállapot — az issueStornoForOrder ezt (vagy a
      // stornoNumber meglétét) látva idempotens no-opot ad.
      name: 'stornoStatus',
      type: 'select',
      defaultValue: 'none',
      label: 'Stornó-számla állapota',
      options: [
        { label: 'Nincs', value: 'none' },
        { label: 'Függőben', value: 'pending' },
        { label: 'Stornózva', value: 'storned' },
        { label: 'Sikertelen', value: 'failed' },
      ],
      admin: {
        description: 'A stornó-számla állapota. A rendszer állítja — ne írd át.',
      },
    },
    {
      // A kiállított stornó-számla száma — az invoiceNumber mezővel azonos
      // mezőszintű olvasás-védelemmel (pénzügyi bizonylatazonosító).
      name: 'stornoNumber',
      type: 'text',
      label: 'Stornó-számla sorszáma',
      access: {
        read: isOwnerFieldAccess,
      },
    },
    {
      name: 'stornoAttempts',
      type: 'number',
      defaultValue: 0,
      label: 'Stornó-kísérletek száma',
      admin: {
        readOnly: true,
        description:
          'A stornó-kiállítási kísérletek száma (legfeljebb 5, utána emberi beavatkozás kell). A rendszer állítja.',
      },
    },
    {
      name: 'stornoLastError',
      type: 'text',
      label: 'Stornó utolsó hibája',
      admin: {
        readOnly: true,
        description: 'Az utolsó sikertelen stornó-kísérlet hibaüzenete — hibakereséshez.',
      },
    },
    {
      // Helyesbítő (módosító) számla állapota RÉSZLEGES visszatérítéshez (C5).
      // Teljes refundnál stornó készül, részlegesnél helyesbítő számla — a
      // döntést a refund összege hozza meg (src/lib/refund/refund-order.ts).
      name: 'correctiveInvoiceStatus',
      type: 'select',
      defaultValue: 'none',
      label: 'Helyesbítő számla állapota',
      options: [
        { label: 'Nincs', value: 'none' },
        { label: 'Függőben', value: 'pending' },
        { label: 'Kiállítva', value: 'issued' },
        { label: 'Sikertelen', value: 'failed' },
      ],
      admin: {
        description: 'A helyesbítő (módosító) számla állapota. A rendszer állítja — ne írd át.',
      },
    },
    {
      // A LEGUTÓBB kiállított helyesbítő számla száma (több részrefund esetén
      // a korábbiak a naplóban és a Számlázz.hu-fiókban követhetők).
      name: 'correctiveInvoiceNumber',
      type: 'text',
      label: 'Helyesbítő számla sorszáma',
      access: {
        read: isOwnerFieldAccess,
      },
    },
    {
      // Idempotencia-horgony a helyesbítőhöz: a refunds-nyom hányadik (1-alapú)
      // bejegyzéséhez tartozik a legutóbbi helyesbítő számla. Ismételt futás
      // (job-retry) ezt látva no-opot ad; a provider-oldali horgony a
      // szamlaKulsoAzon = `${orderNumber}-HELYESBITO-<sorszám>`.
      name: 'correctiveInvoiceSeq',
      type: 'number',
      defaultValue: 0,
      label: 'Helyesbített visszatérítés sorszáma',
      admin: {
        readOnly: true,
        description:
          'A refunds-nyom hányadik bejegyzéséhez tartozik a legutóbbi helyesbítő számla (idempotencia). A rendszer állítja.',
      },
    },
    {
      // A14: a helyesbítő-kiállítás kísérletei is plafonozva (max. 5).
      name: 'correctiveInvoiceAttempts',
      type: 'number',
      defaultValue: 0,
      label: 'Helyesbítő-kísérletek száma',
      admin: {
        readOnly: true,
        description:
          'A helyesbítő-kiállítási kísérletek száma (legfeljebb 5, utána emberi beavatkozás kell). A rendszer állítja.',
      },
    },
    {
      name: 'correctiveInvoiceLastError',
      type: 'text',
      label: 'Helyesbítő utolsó hibája',
      admin: {
        readOnly: true,
        description: 'Az utolsó sikertelen helyesbítő-kísérlet hibaüzenete — hibakereséshez.',
      },
    },
    {
      // A helyesbítő-számláló BIZONYLAT-szintű kulcsa: melyik refund-sorszámhoz
      // tartozik a correctiveInvoiceAttempts. Eltérő sorszámú új bizonylatnál a
      // számláló nulláról indul — a hivatalos „ugyanaz a kérés max. 5×" szabály
      // kérésenként (bizonylatonként) értendő, nem rendelésenként.
      name: 'correctiveInvoiceAttemptsSeq',
      type: 'number',
      defaultValue: 0,
      label: 'Helyesbítő-kísérletek refund-sorszáma',
      admin: {
        readOnly: true,
        description:
          'Melyik refund-sorszámú helyesbítőhöz tartozik a kísérletszámláló. A rendszer állítja.',
      },
    },
    {
      name: 'customerSnapshot',
      type: 'json',
      label: 'Vásárlói adatok a megrendeléskor',
      access: {
        read: isOwnerFieldAccess,
      },
      admin: {
        description: 'A számlázási adatok mentett másolata a rendelés idejéből.',
      },
    },
    {
      name: 'consentWithdrawalWaiver',
      type: 'checkbox',
      defaultValue: false,
      label: 'Lemondott az elállási jogról',
      admin: {
        description:
          'A vásárló a megrendeléskor kérte az azonnali hozzáférést, és tudomásul vette, hogy ezzel elveszti a 14 napos elállási jogát.',
      },
    },
    {
      name: 'consentWithdrawalWaiverAt',
      type: 'date',
      label: 'Elállási jogról lemondás időpontja',
    },
    {
      // Visszatérítés-panel (UI-mező, NEM tárol adatot → nincs séma-változás,
      // migrációt nem igényel). A meglévő, kész refund-szolgáltatás fölé épült
      // felület: a kliens-komponens a POST /api/admin/orders/[orderNumber]/refund
      // végpontot hívja (owner-only, minden szabályt a szerver kényszerít ki).
      name: 'refundPanel',
      type: 'ui',
      label: 'Visszatérítés',
      admin: {
        components: {
          Field: '/components/admin/RefundPanel#RefundPanel',
        },
      },
    },
    {
      name: 'refundReason',
      type: 'text',
      label: 'Visszatérítés indoka',
      access: {
        update: isOwnerFieldAccess,
      },
    },
    {
      name: 'refundedAt',
      type: 'date',
      label: 'Visszatérítés időpontja',
      access: {
        update: isOwnerFieldAccess,
      },
    },
    {
      // Refund-nyom (pénzügyi audit): minden visszatérítés egy bejegyzés —
      // { transactionId, amountHuf, status (Barion RefundedTransactions-státusz),
      //   refundedAt, type: 'full' | 'partial', reason? }.
      // Kizárólag a refund-szolgáltatás írja (overrideAccess: true); a read
      // owner-only, mert pénzügyi tranzakció-adatokat hordoz.
      name: 'refunds',
      type: 'json',
      label: 'Visszatérítések',
      // A generált típus erős marad (lásd refundsTypescriptSchema). A kapott
      // sémát nem eldobjuk, hanem kiegészítjük — így az admin.description-ből
      // származó JSDoc-komment is megmarad a generált típuson.
      typescriptSchema: [({ jsonSchema }) => ({ ...jsonSchema, ...refundsTypescriptSchema })],
      access: {
        read: isOwnerFieldAccess,
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          'Visszatérítési nyom: tranzakciós refund-bejegyzések (transactionId, összeg, Barion-státusz, időpont, típus).',
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      label: 'IP-cím a megrendeléskor',
      access: {
        read: isOwnerFieldAccess,
      },
      admin: {
        description: 'A megrendelés IP-címe — csalásgyanús eset kivizsgálásához.',
      },
    },
  ],
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), orderIntegrityBeforeChange],
  },
})

/**
 * Az ecommerce plugin bekötése.
 *
 * - Variants kikapcsolva: egy kurzus = egy ár.
 * - Addresses kikapcsolva: digitális termék, a számlázási cím a users-en él.
 *   A plugin 3.86.0 sanitizePluginConfig-ja az `addresses: false` értéket is
 *   alapértelmezett mezőkkel tölti fel (azaz a boolean false önmagában nem
 *   tiltja le a collectiont), ezért a plugin lefutása után szűrjük ki az
 *   `addresses` slugot.
 * - Guest cart kikapcsolva: nincs guest checkout, a fiók kötelező.
 * - paymentMethods üres (T-063 plugin-adapter-kontroll): a saját Barion
 *   PaymentAdapter az src/lib/payments/barion-adapter.ts-ben él, de NINCS
 *   regisztrálva itt, mert a plugin initiate/confirm végpontjai KOSÁR-
 *   szemantikát követelnek (cartID kötelező), ami ütközik a kosármentes
 *   checkout-folyamatunkkal (POST /api/checkout/start). Így a plugin
 *   /payments/* végpontjai létre sem jönnek — a confirmOrder (ismert
 *   beta-hiba: nem ellenőrzi a fizetés tényleges státuszát) HTTP-n nem
 *   hívható; a paid átmenet kizárólag a Barion-callback-útvonal (T-022) joga.
 *   Védelemképpen a plugin lefutása után a withoutPluginPaymentEndpoints
 *   szűrő akkor is eltávolít minden /payments/* végpontot, ha egy későbbi
 *   módosítás mégis regisztrálná az adaptert.
 * - A saját collectionök (pages/posts/menus/categories/media) access-politikája
 *   szintén itt, központilag kapcsolódik be (applyCollectionAccessPolicies) —
 *   a collection-fájlok a koordinátor fájl-scope-ján kívül esnek; a mátrix és a
 *   leképezés az src/access/policies.ts-ben dokumentált. A users collection
 *   politikája közvetlenül az src/collections/Users.ts-ben él.
 */
export const ecommerce = async (config: Config): Promise<Config> => {
  const withEcommerce = await ecommercePlugin({
    access: {
      adminOnlyFieldAccess,
      adminOrPublishedStatus,
      isAdmin,
      isDocumentOwner,
    },
    addresses: false,
    carts: {
      allowGuestCarts: false,
      cartsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: 'Kosár',
          plural: 'Kosarak',
        },
        admin: {
          ...defaultCollection.admin,
          group: WEBSHOP_GROUP,
          description: 'A vásárlók félbehagyott kosarai. Automatikusan keletkezik — ne szerkeszd.',
        },
      }),
    },
    currencies: {
      defaultCurrency: 'HUF',
      supportedCurrencies: [HUF],
    },
    customers: {
      slug: 'users',
    },
    orders: {
      ordersCollectionOverride,
    },
    payments: {
      paymentMethods: [],
    },
    products: {
      productsCollectionOverride,
      variants: false,
    },
    transactions: {
      transactionsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        labels: {
          singular: 'Tranzakció',
          plural: 'Tranzakciók',
        },
        admin: {
          ...defaultCollection.admin,
          group: WEBSHOP_GROUP,
          description: 'A fizetési tranzakciók nyoma. Csak a rendszer írja — ne szerkeszd.',
        },
      }),
    },
  })(config)

  withEcommerce.collections = applyCollectionAccessPolicies(
    (withEcommerce.collections ?? []).filter((collection) => collection.slug !== 'addresses'),
  )

  // T-063: a plugin /payments/* végpontjai (initiate + confirm-order) sosem
  // maradhatnak a végleges configban — lásd a fejléc- és a payments-kommentet.
  withEcommerce.endpoints = withoutPluginPaymentEndpoints(withEcommerce.endpoints)

  // A plugin typescript.schema-hookja az addresses-collectionre is $ref-et generál
  // (a fenti sanitize-hiba miatt) — mivel a collectiont kiszűrtük, a hivatkozást is
  // el kell távolítani, különben a generate:types hibára fut.
  withEcommerce.typescript = {
    ...withEcommerce.typescript,
    schema: [
      ...(withEcommerce.typescript?.schema ?? []),
      ({ jsonSchema }) => {
        const collections = jsonSchema.properties?.ecommerce?.properties?.collections as
          { properties?: Record<string, unknown>; required?: string[] } | undefined
        if (collections?.properties) {
          delete collections.properties.addresses
          if (Array.isArray(collections.required)) {
            collections.required = collections.required.filter((slug) => slug !== 'addresses')
          }
        }
        return jsonSchema
      },
    ],
  }

  return withEcommerce
}
