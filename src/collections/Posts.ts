import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import {
  clearPublishedAtBeforeDuplicate,
  draftStatusBeforeDuplicate,
  forceDraftVersionOnDuplicate,
} from '../lib/duplicate'

/**
 * Versions × status viszony (T-012): megegyezik a Pages collection leírásával —
 * a `_status` (drafts) a technikai publikálási állapot és verziózás, a custom
 * `status` select szerkesztői jelölő; a kettő értékkészlete szándékosan azonos
 * (draft/published), ezért a közös DB-enum ütközésmentes. Duplikáláskor a slug
 * '-masodpeldany' lesz, a status draft, a publishedAt üres, a `_status` draft
 * (src/lib/duplicate.ts hookjai).
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
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
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      maxRows: 3,
    },
  ],
}
