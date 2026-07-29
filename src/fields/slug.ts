import type { FieldHook, TextField } from 'payload'

import { slugify } from '../lib/slugify'

/**
 * A slugot a `sourceField` (alapból a title) értékéből generálja, ha az üres.
 * Ha a szerkesztő kézzel ad meg slugot, azt nem írja felül — szerkeszthető marad.
 */
const generateFromTitle =
  (sourceField: string): FieldHook =>
  ({ data, value }) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      return slugify(value)
    }
    const source = data?.[sourceField]
    if (typeof source === 'string' && source.trim().length > 0) {
      return slugify(source)
    }
    return value
  }

export const slugField = (sourceField = 'title'): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  hooks: {
    beforeValidate: [generateFromTitle(sourceField)],
  },
})
