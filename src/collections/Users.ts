// A jelszó-politika hook (OWASP A07) + login-hiba naplózás (afterError).
// A beforeChange hook a hash-elés ELŐTT fut (a create/update műveletek csak a
// hookok után generálják a salt/hash párost), így a data.password itt még nyers szöveg.
import {
  formatPasswordPolicyErrors,
  validatePasswordStrength,
} from '../lib/security/password-policy'
import { createLogger } from '../lib/logger'
import {
  APIError,
  AuthenticationError,
  LockedAuth,
  type CollectionAfterErrorHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

const logger = createLogger({ module: 'users' })

// OWASP A07: jelszó-erősségi politika. A Payload 3.86-ban nincs natív
// passwordMinLength/komplexitási beállítás, ezért hookból érvényesítjük.
// A collection beforeChange hook a hash-elés ELŐTT fut (a create/update
// műveletek csak a hookok után generálják a salt/hash párost), így a
// data.password itt még nyers szöveg. ASYNC — az első user ellenőrzéséhez
// a users-darabszámot a DB-ből kell lekérni.
const enforcePasswordPolicy: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  // Csak akkor ellenőrzünk, ha ténylegesen jelszót állítanak be vagy
  // módosítanak — a többi profilmező-mentést a hook érintetlenül hagyja.
  if (typeof data.password !== 'string' || data.password.length === 0) {
    return data
  }
  // Az első felhasználó (create-first-user / seed / első admin) létrehozásakor
  // a politika NEM érvényesül — különben az első admin létrehozása is
  // elbukna egy gyengébb jelszón, és a rendszer elérhetetlenné válna.
  // A politika csak a 2. usertől kezdve él (a create műveletnél).
  if (operation === 'create') {
    const count = await req.payload.count({ collection: 'users' })
    if (count.totalDocs === 0) {
      return data
    }
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
}

// Sikertelen bejelentkezés naplózása. A Payload 3.86-ban NINCS
// afterFailedLogin hook; a REST /api/users/login hibák (hibás jelszó →
// AuthenticationError, zárolt fiók → LockedAuth) a routeError-en át a
// collection afterError hookjában landolnak. Jelszót sosem naplózunk —
// a logger redact-listája is védi az ilyen kulcsokat.
const logFailedLogin: CollectionAfterErrorHook = ({ error, req }) => {
  const isLoginRequest = typeof req.url === 'string' && req.url.includes('/login')
  if (!isLoginRequest || !(error instanceof AuthenticationError || error instanceof LockedAuth)) {
    return
  }
  const email = typeof req.data?.email === 'string' ? req.data.email : undefined
  const ip =
    req.headers?.get?.('x-forwarded-for') ?? req.headers?.get?.('x-real-ip') ?? 'ismeretlen'
  logger.warn('Sikertelen bejelentkezés', {
    email,
    ip,
    reason: error instanceof LockedAuth ? 'zárolt fiók' : 'hibás jelszó',
  })
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600_000, // 10 perc zárolás 5 sikertelen próbálkozás után
    tokenExpiration: 7_200_000, // 2 óra
  },
  fields: [
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
      admin: {
        description: 'A felhasználó által megvásárolt kurzusok (hozzáférés).',
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
    beforeChange: [enforcePasswordPolicy],
    afterError: [logFailedLogin],
  },
}

function isOwnerFieldAccess({ req }: { req: { user?: { role?: string } | null } }) {
  return req.user?.role === 'owner'
}
