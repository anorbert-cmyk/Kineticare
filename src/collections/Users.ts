// A jelszó-politika hook (OWASP A07) + login-hiba naplózás (afterError).
// A beforeChange hook a hash-elés ELŐTT fut (a create/update műveletek csak a
// hookok után generálják a salt/hash párost), így a data.password itt még nyers szöveg.
import {
  formatPasswordPolicyErrors,
  validatePasswordStrength,
} from '../lib/security/password-policy'
import { createLogger } from '../lib/logger'
import { resolveClientIp } from '../lib/client-ip'
import {
  APIError,
  AuthenticationError,
  LockedAuth,
  type CollectionAfterErrorHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type PayloadRequest,
} from 'payload'
import {
  isOwner,
  isOwnerFieldAccess,
  isSelfOrAdmin,
  isStaffOrOwner,
} from '../access'

const logger = createLogger({ module: 'users' })

/** A kérésen belül megosztott users-darabszám kulcsa a `req.context`-ben. */
const EXISTING_USER_COUNT = 'kineticareExistingUserCount'

/**
 * A meglévő felhasználók száma — kérésenként EGYSZER kérdezve le.
 *
 * A `promoteFirstUserToOwner` és az `enforcePasswordPolicy` ugyanazt kérdezi
 * („van-e már felhasználó?"), és mindkettő ugyanabban a beforeChange-láncban,
 * a beszúrás ELŐTT fut — a válasz a kérésen belül nem változhat, tehát a két
 * külön `count` ugyanazt a számot adta. A Payload `req.context`-je a hookok közt
 * megosztott, ezért az elsőként lefutó hook eredményét a másik onnan olvassa:
 * create-enként egy DB-kérdés kettő helyett.
 *
 * A hiányzó `context`-et is elviseli (unit-tesztek egyszerűsített req-mockja):
 * ilyenkor nincs megosztás, csak a friss lekérdezés — a visszaadott érték
 * mindkét ágon ugyanaz.
 */
async function countExistingUsers(req: PayloadRequest): Promise<number> {
  const cached = req.context?.[EXISTING_USER_COUNT]
  if (typeof cached === 'number') {
    return cached
  }
  const { totalDocs } = await req.payload.count({ collection: 'users' })
  if (req.context) {
    req.context[EXISTING_USER_COUNT] = totalDocs
  }
  return totalDocs
}

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
  if (operation === 'create' && (await countExistingUsers(req)) === 0) {
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
}

// Az ELSŐ felhasználó owner-szerepkört kap.
//
// Enélkül a rendszer telepítés után zárva marad: a `role` mező field-access-e
// owner-only (`isOwnerFieldAccess`), owner viszont még nincs, ezért a
// create-first-user form nem tudja elküldeni a role-t, és az új user a
// `defaultValue: 'customer'` szerepkörrel jön létre. A collection
// `access.admin` viszont `isStaffOrOwner` — vagyis az első user NEM jut be az
// adminba, törölni sem lehet (`access.delete: isOwner`), és a szerepkörét sem
// írhatja át senki. A hook ezt a patthelyzetet oldja fel: ha a DB-ben még
// nincs user, a létrejövő rekord owner lesz. A 2. usertől a hook nem nyúl a
// role-hoz, tehát a jogemelés elleni védelem (owner-only field access)
// változatlanul él.
const promoteFirstUserToOwner: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create') {
    return data
  }
  if ((await countExistingUsers(req)) > 0) {
    return data
  }
  logger.info('Az első felhasználó owner szerepkörrel jön létre')
  return { ...data, role: 'owner' }
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
  // Az x-forwarded-for a teljes proxy-láncot tartalmazza — csak az első,
  // kliens-oldali elem naplózandó (lásd src/lib/client-ip.ts).
  const ip = resolveClientIp(req.headers) ?? 'ismeretlen'
  logger.warn('Sikertelen bejelentkezés', {
    email,
    ip,
    reason: error instanceof LockedAuth ? 'zárolt fiók' : 'hibás jelszó',
  })
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Felhasználó',
    plural: 'Felhasználók',
  },
  admin: {
    useAsTitle: 'email',
    group: 'Felhasználók',
    defaultColumns: ['name', 'email', 'role', 'lastLoginAt'],
    description: 'Szerkesztők és vásárlók. A szerepkört csak tulajdonos állíthatja át.',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600_000, // 10 perc zárolás 5 sikertelen próbálkozás után
    tokenExpiration: 7_200_000, // 2 óra
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
      label: 'Név',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      label: 'Szerepkör',
      options: [
        { label: 'Tulajdonos', value: 'owner' },
        { label: 'Munkatárs', value: 'staff' },
        { label: 'Vásárló', value: 'customer' },
      ],
      admin: {
        description:
          'Tulajdonos: mindent lát és állít. Munkatárs: tartalmat kezel. Vásárló: csak a saját fiókját. Átállítani csak tulajdonos tud.',
      },
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
      label: 'Megvásárolt kurzusok',
      // A vásárlásokat kizárólag rendszerfolyamat írja (fizetésjóváhagyás),
      // sem az admin, sem az API nem szerkesztheti közvetlenül.
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        description:
          'A felhasználó által megvásárolt kurzusok (hozzáférés). A fizetés után magától töltődik — kézzel nem szerkeszthető.',
      },
    },
    {
      // Kézi kurzus-hozzáférés panel (UI-mező, NEM tárol adatot → nincs
      // séma-változás, migrációt nem igényel). A purchases mező field-access-e
      // változatlanul rendszer-írású marad: a panel nem ír közvetlenül, hanem a
      // POST /api/admin/grant-purchase végpontot hívja (staff/owner, idempotens,
      // audit-naplózott) — ugyanaz a szolgáltatás, amit a CLI-script használ.
      name: 'grantPurchasePanel',
      type: 'ui',
      label: 'Kurzus-hozzáférés adása',
      admin: {
        components: {
          Field: '/components/admin/GrantPurchasePanel#GrantPurchasePanel',
        },
      },
    },
    {
      name: 'billingName',
      type: 'text',
      label: 'Számlázási név',
    },
    {
      name: 'billingZip',
      type: 'text',
      label: 'Irányítószám',
    },
    {
      name: 'billingCity',
      type: 'text',
      label: 'Település',
    },
    {
      name: 'billingStreet',
      type: 'text',
      label: 'Utca, házszám',
    },
    {
      name: 'taxNumber',
      type: 'text',
      label: 'Adószám',
      admin: {
        description: 'Csak céges vásárlásnál kell.',
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      label: 'Utolsó belépés',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [promoteFirstUserToOwner, enforcePasswordPolicy],
    afterError: [logFailedLogin],
  },
}
