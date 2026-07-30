import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { visibleMenusOrAdmin } from '../access/menus-visibility'
import {
  validateMenuParentChain,
  validateMenuTypeConsistency,
  type MenuValidationIssue,
} from '../lib/menu-validation'

/**
 * Menüfa-validáció (T-013): max 2 szint (gyökér → gyermek), nincs önmagára
 * mutatás/ciklus, és type-konzisztens cél (url → url kötelező; egyéb type →
 * ref kötelező és a type-hoz tartozó collectionre mutat). A szabálylogika az
 * src/lib/menu-validation.ts-ben él, DB nélkül unit-tesztelhető.
 */
const validateMenu: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const issues: MenuValidationIssue[] = [
    ...validateMenuTypeConsistency(data),
    ...(await validateMenuParentChain({
      docId: originalDoc?.id ?? null,
      parent: data.parent,
      fetchById: async (id) => {
        try {
          const doc = await req.payload.findByID({
            collection: 'menus',
            id,
            depth: 0,
            overrideAccess: true,
          })
          return doc ? { id: doc.id, parent: doc.parent } : null
        } catch {
          return null
        }
      },
    })),
  ]

  if (issues.length > 0) {
    throw new ValidationError({
      collection: 'menus',
      errors: issues.map((issue) => ({ message: issue.message, path: issue.path })),
    })
  }

  return data
}

export const Menus: CollectionConfig = {
  slug: 'menus',
  admin: {
    useAsTitle: 'label',
  },
  access: {
    // T-013: nyilvános olvasás, de nem-admin csak a visible=true sorokat látja.
    // A centrális politika (src/access/policies.ts) ugyanezt a függvényt
    // applikálja — a kettő szándékosan azonos.
    read: visibleMenusOrAdmin,
  },
  hooks: {
    beforeValidate: [validateMenu],
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
      required: true,
      defaultValue: 'page',
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
      admin: {
        description: 'Legfeljebb 2 szintű menüfa: csak gyökér menüpont választható szülőnek.',
      },
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
