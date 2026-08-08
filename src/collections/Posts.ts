import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import {
  clearPublishedAtBeforeDuplicate,
  draftStatusBeforeDuplicate,
  forceDraftVersionOnDuplicate,
} from '../lib/duplicate'
import { buildAdminPreviewUrl } from '../lib/preview/preview-target'
import { setPublishedAtOnFirstPublish, syncStatusFromDraftStatus } from '../lib/publish-status'

/**
 * Versions × status viszony: megegyezik a Pages collection leírásával — a
 * `_status` (drafts + autosave) a technikai publikálási állapot, a custom
 * `status` select pedig a nyilvános szűrők (publishedOrAdmin, PUBLISHED_WHERE,
 * sitemap) mezője. A kettőt a `syncStatusFromDraftStatus` hook tartja
 * szinkronban, a custom mező az adminban rejtett — a szerkesztő csak a natív
 * Piszkozat/Közzététel gombokat látja. Duplikáláskor a slug '-masodpeldany'
 * lesz, a status draft, a publishedAt üres, a `_status` draft
 * (src/lib/duplicate.ts hookjai).
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Blogbejegyzés',
    plural: 'Blogbejegyzések',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Tartalom',
    defaultColumns: ['title', 'categories', '_status', 'publishedAt', 'updatedAt'],
    description: 'A Tudástár (blog) cikkei. A közzétett bejegyzések azonnal megjelennek az oldalon.',
    preview: (doc) => buildAdminPreviewUrl('posts', doc?.slug),
  },
  versions: {
    drafts: {
      // Automatikus piszkozat-mentés (alapértelmezett intervallum).
      autosave: true,
    },
  },
  hooks: {
    beforeValidate: [forceDraftVersionOnDuplicate],
    beforeChange: [syncStatusFromDraftStatus, setPublishedAtOnFirstPublish],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Cím',
      admin: {
        description: 'A bejegyzés címe — ez jelenik meg a listában és a Google találatai közt.',
      },
    },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Rövid bevezető',
      admin: {
        description: 'Pár mondatos ajánló; a bloglista kártyáin és a Google-ban is ez látszik.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Tartalom',
      admin: {
        description: 'A cikk szövege. A felső eszköztárral formázhatsz, listázhatsz, linkelhetsz.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Borítókép',
      admin: {
        description: 'A cikk fő képe — a bloglistán és a cikk tetején jelenik meg.',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO-cím',
      admin: {
        description: 'Ha üresen hagyod, a Google a fenti címet használja.',
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
        description: 'Ez a kép jelenik meg, ha valaki Facebookon vagy Messengeren megosztja a cikket.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Állapot',
      options: [
        { label: 'Piszkozat', value: 'draft' },
        { label: 'Közzétéve', value: 'published' },
      ],
      admin: {
        // Rejtett: a natív Piszkozat/Közzététel gomb az egyetlen kapcsoló,
        // ezt a mezőt a syncStatusFromDraftStatus hook tölti automatikusan.
        hidden: true,
      },
      hooks: {
        beforeDuplicate: [draftStatusBeforeDuplicate],
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Megjelenés dátuma',
      admin: {
        description:
          'Az első közzétételkor magától kitöltődik. A bloglista ez alapján rendez (a legfrissebb elöl).',
      },
      hooks: {
        beforeDuplicate: [clearPublishedAtBeforeDuplicate],
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Sorrend',
      admin: {
        description: 'A lista- és menürendezéshez használt sorszám (kisebb = előrébb).',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Szerző',
      // Alapból a bejelentkezett szerkesztő — átállítható, ha más nevében írsz.
      defaultValue: ({ user }) => user?.id,
      admin: {
        description: 'Alapból te vagy; ha más nevében írod a cikket, itt átállíthatod.',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Kategóriák',
      admin: {
        description: 'Melyik témakörökbe tartozik a cikk. Több is választható.',
      },
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      maxRows: 3,
      label: 'Kapcsolódó bejegyzések',
      admin: {
        description: 'Legfeljebb 3 cikk, amit a bejegyzés alján ajánlunk az olvasónak.',
      },
    },
  ],
}
