import type { FieldAccess, PayloadRequest } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * "Admin" szint — a rendszerben az owner és a staff szerepkör együtt.
 * Az ecommerce plugin kötelező access-bekötése ezt használja (isAdmin);
 * a szemantika megegyezik az isStaffOrOwner-rel, külön néven marad a
 * plugin-kompatibilitás és a korábbi kód olvashatósága miatt.
 */
export const isAdmin = ({ req }: { req: PayloadRequest }): boolean =>
  hasStaffOrOwnerRole(req.user)

/** Ugyanaz mezőszinten (a plugin adminOnlyFieldAccess bekötése). */
export const isAdminFieldAccess: FieldAccess = ({ req }) => hasStaffOrOwnerRole(req.user)
