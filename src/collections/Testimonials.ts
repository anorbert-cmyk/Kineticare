import type { CollectionConfig } from 'payload'

/**
 * Vélemények (páciens-visszajelzések).
 *
 * A kezdőlap M6 modulja ebből a collectionből épül: legfeljebb 3 kiemelt
 * (`featured`) és látható (`visible`) vélemény jelenik meg, `order` szerint.
 * Szándékosan EGYSZERŰ collection: nincs verziózás/piszkozat — egy vélemény
 * vagy látszik, vagy nem, ezt a `visible` pipa dönti el.
 *
 * FONTOS tartalmi szabály: ide kizárólag VALÓS, elhangzott vélemények
 * kerülhetnek, betűhíven. Kitalált vagy „szépített" visszajelzés tilos.
 *
 * Access: a centrális politika (src/access/policies.ts) applikálja rá a
 * `visibleTestimonialsOrAdmin` read-szabályt és a staff/owner írást — a
 * bekötés az src/plugins/ecommerce.ts config-pipeline-jában történik
 * (applyCollectionAccessPolicies), ahogy a pages/posts/menus/categories/media
 * esetében is.
 */

/** A rövid változat felső határa — ennél hosszabb már nem „1–2 mondat". */
export const SHORT_QUOTE_MAX_LENGTH = 260

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: {
    singular: 'Vélemény',
    plural: 'Vélemények',
  },
  admin: {
    useAsTitle: 'authorName',
    group: 'Tartalom',
    defaultColumns: ['authorName', 'authorTitle', 'featured', 'order', 'visible'],
    description:
      'Páciensek valódi visszajelzései. A kezdőlapon legfeljebb 3 kiemelt vélemény jelenik meg.',
  },
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
      label: 'Vélemény szövege (teljes)',
      admin: {
        description: 'A vélemény teljes, eredeti szövege — pontosan úgy, ahogy elhangzott.',
      },
    },
    {
      name: 'shortQuote',
      type: 'textarea',
      label: 'Vélemény szövege (rövid)',
      admin: {
        description:
          'Rövid, 1–2 mondatos változat a főoldalra; ha üres, a teljes szöveg rövidsége esetén az jelenik meg.',
      },
      validate: (value: string | null | undefined) => {
        if (typeof value === 'string' && value.trim().length > SHORT_QUOTE_MAX_LENGTH) {
          return `A rövid változat legfeljebb ${SHORT_QUOTE_MAX_LENGTH} karakter lehet (jelenleg ${value.trim().length}).`
        }
        return true
      },
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
      label: 'Név',
      admin: {
        description: 'Aki a véleményt mondta (pl. „Garami Gábor" vagy „P. Benjámin").',
      },
    },
    {
      name: 'authorTitle',
      type: 'text',
      label: 'Titulus, foglalkozás',
      admin: {
        description: 'Nem kötelező — pl. „zenész, műsorvezető".',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Kiemelt',
      admin: {
        description: 'Főoldalon megjelenik (legfeljebb 3 kiemelt).',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Sorrend',
      admin: {
        description: 'A megjelenés sorrendje (kisebb szám = előrébb).',
      },
    },
    {
      name: 'visible',
      type: 'checkbox',
      defaultValue: true,
      label: 'Látható',
      admin: {
        description: 'Ha kiveszed a pipát, a vélemény sehol nem jelenik meg, de nem vész el.',
      },
    },
  ],
}
