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
  labels: {
    singular: 'Menüpont',
    plural: 'Menüpontok',
  },
  admin: {
    useAsTitle: 'label',
    group: 'Navigáció',
    defaultColumns: ['label', 'type', 'order', 'visible'],
    description:
      'Az oldal tetején látszó menü. Legfeljebb 2 szint: főmenüpont és alatta almenüpontok.',
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
      label: 'Felirat',
      admin: {
        description: 'Ez a szöveg jelenik meg a menüben (pl. „Kurzusok").',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'page',
      label: 'Hová mutat',
      options: [
        { label: 'Oldal', value: 'page' },
        { label: 'Bejegyzés', value: 'post' },
        { label: 'Külső link', value: 'url' },
        { label: 'Kurzus', value: 'product' },
      ],
      admin: {
        description: 'Válaszd ki, milyen tartalomra visz a menüpont; ettől függ a következő mező.',
      },
    },
    {
      name: 'ref',
      type: 'relationship',
      relationTo: ['pages', 'posts', 'products'],
      label: 'Cél',
      admin: {
        condition: (_, siblingData) => siblingData?.type !== 'url',
        description: 'A menüpont célja — a fent választott típusnak megfelelő listából.',
      },
    },
    {
      name: 'url',
      type: 'text',
      label: 'Külső webcím',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'url',
        description: 'Teljes webcím más oldalra, https://-sel kezdve.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'menus',
      label: 'Fölérendelt menüpont',
      admin: {
        description:
          'Csak akkor töltsd ki, ha ez almenüpont. Legfeljebb 2 szintű a menü: almenüpont alá már nem tehetsz továbbit.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Sorrend',
      admin: {
        description: 'A menün belüli sorrend (kisebb szám = előrébb).',
      },
    },
    {
      name: 'visible',
      type: 'checkbox',
      defaultValue: true,
      label: 'Látható',
      admin: {
        description: 'Ha kiveszed a pipát, a menüpont eltűnik az oldalról, de nem vész el.',
      },
    },
    {
      name: 'openInNewTab',
      type: 'checkbox',
      defaultValue: false,
      label: 'Új lapon nyíljon',
      admin: {
        description: 'Külső linkeknél szokás bekapcsolni, hogy a látogató ne hagyja el az oldalt.',
      },
    },
  ],
}
