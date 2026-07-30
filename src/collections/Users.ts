import type { CollectionConfig } from 'payload'

import { isOwner, isOwnerFieldAccess } from '../access/isOwner'
import { isSelfOrAdmin } from '../access/isSelfOrAdmin'
import { isStaffOrOwner } from '../access/isStaffOrOwner'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // Az admin felületet staff+owner éri el.
    admin: isStaffOrOwner,
    // Nyilvános regisztráció engedélyezett: a role mező owner-only
    // field-access-e miatt jogemelés így sem lehetséges (minden regisztráló
    // a default 'customer' szerepkört kapja). Owner az adminból bárkit létrehozhat.
    create: () => true,
    // Saját rekord olvasása/módosítása — staff/owner minden rekordot.
    // A role és purchases mezők ettől függetlenül mezőszinten védettek.
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    // Törlés kizárólag owner.
    delete: isOwner,
  },
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
        create: isOwnerFieldAccess,
        update: isOwnerFieldAccess,
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
