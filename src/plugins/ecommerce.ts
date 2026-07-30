import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import type { CollectionOverride, Currency } from '@payloadcms/plugin-ecommerce/types'
import type { Access, Config, FieldAccess } from 'payload'

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
 * Admin-szerepkör ellenőrzés: owner és staff tekinthető adminnak.
 * A plugin gyári collectionjei (products/carts/orders/transactions) ezeket az
 * access-függvényeket használják — ez a plugin kötelező bekötése, a végleges
 * collection-szintű access-politika külön ticketben (T-011) készül.
 */
const hasAdminRole = (role: unknown): boolean => role === 'owner' || role === 'staff'

const isAdmin: Access = ({ req }) => hasAdminRole(req.user?.role)

const adminOnlyFieldAccess: FieldAccess = ({ req }) => hasAdminRole(req.user?.role)

const adminOrPublishedStatus: Access = ({ req }) =>
  hasAdminRole(req.user?.role) ? true : { _status: { equals: 'published' } }

const isDocumentOwner: Access = ({ req }) =>
  req.user ? { customer: { equals: req.user.id } } : false

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
    ...defaultCollection.fields,
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
 */
const ordersCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  fields: [
    ...defaultCollection.fields,
    {
      name: 'barionPaymentId',
      type: 'text',
      // Postgresben a unique index több NULL-t is megenged, így gyakorlatilag sparse.
      unique: true,
      index: true,
    },
    {
      name: 'barionPaymentRequestId',
      type: 'text',
    },
    {
      name: 'invoiceNumber',
      type: 'text',
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
    },
    {
      name: 'refundedAt',
      type: 'date',
    },
    {
      name: 'ipAddress',
      type: 'text',
    },
  ],
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

  withEcommerce.collections = (withEcommerce.collections ?? []).filter(
    (collection) => collection.slug !== 'addresses',
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
