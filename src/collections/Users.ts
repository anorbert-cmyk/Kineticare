import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Az email mezőt az auth automatikusan hozzáadja.
    // További mezők a későbbi sprintekben kerülnek ide.
  ],
}
