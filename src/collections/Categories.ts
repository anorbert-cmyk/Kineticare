import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Content', value: 'content' },
        { label: 'Product', value: 'product' },
      ],
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
    },
  ],
}
