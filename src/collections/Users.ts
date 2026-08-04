import type { CollectionConfig } from 'payload'
import { APIError, AuthenticationError, LockedAuth } from 'payload'

import { isOwner, isOwnerFieldAccess } from '../access/isOwner'
import { isSelfOrAdmin } from '../access/isSelfOrAdmin'
import { isStaffOrOwner } from '../access/isStaffOrOwner'
import { logger } from '../lib/logger'
import {
  formatPasswordPolicyErrors,
  validatePasswordStrength,
} from '../lib/security/password-policy'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    // OWASP A07: a sikertelen kísérletek korlátozása — 5 hibás próbálkozás
    // után 10 perces zárolás (a credential-stuffing/brute-force megelőzése).
    maxLoginAttempts: 5,
    lockTime: 600_000, // 10 perc, ezredmásodpercben
    // A forgot-password token élettartama explicit (2 óra) — a reset-link
    // így nem használható korlátlan ideig.
    tokenExpiration: 7_200_000,
  },
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
    beforeChange: [
      // OWASP A07: jelszó-erősségi politika. A Payload 3.86-ban nincs natív
      // passwordMinLength/komplexitási beállítás, ezért hookból érvényesítjük.
      // A collection beforeChange hook a hash-elés ELŐTT fut (a create/update
      // műveletek csak a hookok után generálják a salt/hash párost), így a
      // data.password itt még nyers szöveg.
      ({ data, originalDoc }) => {
        // Csak akkor ellenőrzünk, ha ténylegesen jelszót állítanak be vagy
        // módosítanak — a többi profilmező-mentést a hook érintetlenül hagyja.
        if (typeof data.password !== 'string' || data.password.length === 0) {
          return data
        }
        // Update-nél az e-mail gyakran nincs a payloadban — ilyenkor a
        // meglévő rekord e-mail-címével vetjük össze a jelszót.
        const email =
          typeof data.email === 'string'
            ? data.email
            : (originalDoc?.email as string | undefined)
        const errors = validatePasswordStrength({ password: data.password, email })
        if (errors.length > 0) {
          throw new APIError(formatPasswordPolicyErrors(errors), 400)
        }
        return data
      },
    ],
    afterError: [
      // Sikertelen bejelentkezés naplózása. A Payload 3.86-ban NINCS
      // afterFailedLogin hook; a REST /api/users/login hibák (hibás jelszó →
      // AuthenticationError, zárolt fiók → LockedAuth) a routeError-en át a
      // collection afterError hookjában landolnak. Jelszót sosem naplózunk —
      // a logger redact-listája is védi az ilyen kulcsokat.
      ({ error, req }) => {
        const isLoginRequest = typeof req.url === 'string' && req.url.includes('/login')
        if (!isLoginRequest || !(error instanceof AuthenticationError || error instanceof LockedAuth)) {
          return
        }
        const email = typeof req.data?.email === 'string' ? req.data.email : undefined
        const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        const ip = forwardedFor || req.headers.get('x-real-ip') || undefined
        logger.warn('Sikertelen bejelentkezési kísérlet', {
          event: 'auth.login.failed',
          collection: 'users',
          email,
          ip,
          reason: error instanceof LockedAuth ? 'account-locked' : 'invalid-credentials',
        })
      },
    ],
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
