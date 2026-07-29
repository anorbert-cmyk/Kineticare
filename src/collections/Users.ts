import type { CollectionConfig, FieldAccess } from 'payload'

/**
 * Csak owner szerepkörű felhasználó férhet hozzá (mezőszintű írás).
 * A staff így nem emelheti fel a saját (vagy más) jogosultságát.
 */
const isOwner: FieldAccess = ({ req }) => req.user?.role === 'owner'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Az email mezőt az auth automatikusan hozzáadja.
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Staff', value: 'staff' },
        { label: 'Customer', value: 'customer' },
      ],
      // A role kiosztása/módosítása kizárólag ownernek engedélyezett.
      access: {
        create: isOwner,
        update: isOwner,
      },
    },
    {
      name: 'purchases',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      // A vásárlásokat kizárólag rendszerfolyamat írja (fizetésjóváhagyás),
      // sem az admin, sem az API nem szerkesztheti közvetlenül.
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'billingName',
      type: 'text',
    },
    {
      name: 'billingZip',
      type: 'text',
    },
    {
      name: 'billingCity',
      type: 'text',
    },
    {
      name: 'billingStreet',
      type: 'text',
    },
    {
      name: 'taxNumber',
      type: 'text',
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterLogin: [
      async ({ req, user }) => {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: {
            lastLoginAt: new Date().toISOString(),
          },
          overrideAccess: true,
        })
        return user
      },
    ],
  },
}
