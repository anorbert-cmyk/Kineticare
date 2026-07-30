import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import {
  clearPublishedAtBeforeDuplicate,
  draftStatusBeforeDuplicate,
  forceDraftVersionOnDuplicate,
} from '../lib/duplicate'

/**
 * Versions × status viszony (T-012):
 *  - `versions.drafts` a Payload natív verziózása: a `_status` mező a technikai
 *    publikálási állapot (draft/published), piszkozat-mentésekkel.
 *  - A meglévő custom `status` select szerkesztői munkafolyamat-jelölő marad;
 *    szándékosan ugyanazokat az értékeket használja (draft/published), mint a
 *    `_status` — így a két mező közös DB-enumja ütközésmentes. Új opció felvétele
 *    előtt kötelező enumName-szétválasztás (lásd a products enum-fixet, 2e1a1fcc).
 *  - A nyilvános read-politika (src/access/publishedOrAdmin.ts) a custom
 *    `status` mezőre szűr — ez marad a szerkesztői igazság a publikáltságról.
 *  - Duplikáláskor (beépített duplicate-folyamat) a slug a slugField
 *    beforeDuplicate hookjával '<eredeti>-masodpeldany' lesz, a status/publishedAt
 *    mezőhookok draftot + üres publishedAt-et, a forceDraftVersionOnDuplicate
 *    pedig a `_status`-t is draftra állítja (lásd src/lib/duplicate.ts).
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [forceDraftVersionOnDuplicate],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'seoTitle',
      type: 'text',
    },
    {
      name: 'seoDescription',
      type: 'text',
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      hooks: {
        beforeDuplicate: [draftStatusBeforeDuplicate],
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      hooks: {
        beforeDuplicate: [clearPublishedAtBeforeDuplicate],
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'A lista- és menürendezéshez használt sorszám (kisebb = előrébb).',
      },
    },
  ],
}
