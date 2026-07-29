import type { CollectionConfig } from 'payload'

export const Menus: CollectionConfig = {
  slug: 'menus',
  admin: {
    useAsTitle: 'label',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Page', value: 'page' },
        { label: 'Post', value: 'post' },
        { label: 'URL', value: 'url' },
        { label: 'Product', value: 'product' },
      ],
    },
    {
      name: 'ref',
      type: 'relationship',
      relationTo: ['pages', 'posts', 'products'],
      admin: {
        condition: (_, siblingData) => siblingData?.type !== 'url',
        description: 'A menüpont célja — a type-nak megfelelő collectionből.',
      },
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'url',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'menus',
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'A menün belüli sorrend (kisebb = előrébb).',
      },
    },
    {
      name: 'visible',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'openInNewTab',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
