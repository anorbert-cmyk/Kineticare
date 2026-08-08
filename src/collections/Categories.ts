import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

/**
 * Kategóriák (blog- és termék-témakörök).
 *
 * A slug a közös `slugField('title')` factoryból jön: a korábbi kézi text mező
 * pontosan ugyanazokat az oszlop-tulajdonságokat kapja (name: 'slug', type:
 * 'text', required, unique) — a séma tehát változatlan —, cserébe a szerkesztőnek
 * nem kell kézzel webcímet írnia: a címből ékezetmentesített, kötőjeles slug
 * generálódik, és a duplikálás-kezelés is egységes lesz a Pages/Posts-szal.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Kategória',
    plural: 'Kategóriák',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Tartalom',
    defaultColumns: ['title', 'slug', 'type', 'parent', 'updatedAt'],
    description: 'Témakörök a blogbejegyzésekhez és a kurzusokhoz.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Név',
      admin: {
        description: 'A kategória neve, ahogy az olvasó látja (pl. „Kézrehabilitáció").',
      },
    },
    slugField('title'),
    {
      name: 'type',
      type: 'select',
      label: 'Mihez tartozik',
      options: [
        { label: 'Blogbejegyzésekhez', value: 'content' },
        { label: 'Kurzusokhoz', value: 'product' },
      ],
      admin: {
        description:
          'Blogkategória a Tudástár cikkeihez, kurzuskategória a webshop termékeihez. A blog csak a blogkategóriákat mutatja.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Fölérendelt kategória',
      admin: {
        description: 'Csak akkor töltsd ki, ha ez egy nagyobb témakör alkategóriája.',
      },
    },
  ],
}
