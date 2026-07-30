import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import type { CollectionOverride, Currency } from '@payloadcms/plugin-ecommerce/types'
import type { Config, Field, FieldAccess } from 'payload'

import {
  adminOrPublishedStatus,
  applyCollectionAccessPolicies,
  isAdmin,
  isAdminFieldAccess,
  isDocumentOwner,
  isOwnerFieldAccess,
} from '../access'
import { orderIntegrityBeforeChange } from '../lib/order-integrity'

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
    access: {
      create: () => false,
      update: () => false,
    },
    admin: {
      readOnly: true,
      description:
        'A termék neve (sku) a megrendeléskor — a products collectionben nincs külön title mező, a sku a display-név.',
    },
  },
  {
    name: 'priceHufSnapshot',
    type: 'number',
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
 * Products override: a plugin gyári mezői (inventory, priceInHUF…) megmaradnak,
 * a kurzus-specifikus mezők mögéjük kerülnek.
 */
const productsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    useAsTitle: 'sku',
  },
  fields: [
    ...mapFieldsDeep(defaultCollection.fields, withOwnerOnlyPriceAccess),
    {
      name: 'shortDescription',
      type: 'textarea',
    },
    {
      name: 'longDescription',
      type: 'richText',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'previewVideoStreamId',
      type: 'text',
    },
    {
      name: 'videos',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'streamAssetId',
          type: 'text',
        },
        {
          name: 'durationSec',
          type: 'number',
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'processing',
          options: [
            { label: 'Processing', value: 'processing' },
            { label: 'Ready', value: 'ready' },
            { label: 'Error', value: 'error' },
          ],
        },
      ],
    },
    {
      name: 'accessDurationDays',
      type: 'number',
      admin: {
        description:
          'Hány napig érvényes a hozzáférés vásárlás után. Üres (null) = örök hozzáférés.',
      },
    },
    {
      name: 'status',
      type: 'select',
      // A Payload a drafts `_status` mezőnek ugyanazt az enum-nevet generálná
      // (toSnakeCase('_status') === 'status'), így az alapértelmezett névütközés
      // miatt a 'archived' érték elveszne az adatbázis-enumokból. Külön enum-név
      // a products és a _products_v (versions) táblában is — az oszlopnév és az
      // API-mezőnév változatlanul `status` marad.
      enumName: ({ tableName }) => `enum_${tableName}_product_status`,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
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
    },
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
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
  fields: [
    ...mapFieldsDeep(defaultCollection.fields, withOrderItemSnapshots),
    {
      name: 'orderNumber',
      type: 'text',
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
      // Postgresben a unique index több NULL-t is megenged, így gyakorlatilag sparse.
      unique: true,
      index: true,
      access: {
        read: isOwnerFieldAccess,
      },
    },
    {
      name: 'barionPaymentRequestId',
      type: 'text',
    },
    {
      name: 'invoiceNumber',
      type: 'text',
      access: {
        read: isOwnerFieldAccess,
      },
    },
    {
      name: 'invoicePdfUrl',
      type: 'text',
    },
    {
      name: 'invoiceStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Pending', value: 'pending' },
        { label: 'Issued', value: 'issued' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'customerSnapshot',
      type: 'json',
      access: {
        read: isOwnerFieldAccess,
      },
    },
    {
      name: 'consentWithdrawalWaiver',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'consentWithdrawalWaiverAt',
      type: 'date',
    },
    {
      name: 'refundReason',
      type: 'text',
      access: {
        update: isOwnerFieldAccess,
      },
    },
    {
      name: 'refundedAt',
      type: 'date',
      access: {
        update: isOwnerFieldAccess,
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      access: {
        read: isOwnerFieldAccess,
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
 * - paymentMethods üres: a confirmOrder/initiatePayment endpointok így nem
 *   jönnek létre; a fizetésjóváhagyás később saját Barion-callback-vezérelt lesz.
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
    transactions: true,
  })(config)

  withEcommerce.collections = applyCollectionAccessPolicies(
    (withEcommerce.collections ?? []).filter((collection) => collection.slug !== 'addresses'),
  )

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
