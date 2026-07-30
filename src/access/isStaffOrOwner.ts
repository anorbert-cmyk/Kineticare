import type { FieldAccess, PayloadRequest } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * Staff vagy owner — tartalom-kezelés (pages/posts/menus/categories/media írás)
 * és az admin felület elérésének szintje.
 * Szándékosan boolean-visszatérésű: így Access- és admin-access-kontextusban
 * is használható.
 */
export const isStaffOrOwner = ({ req }: { req: PayloadRequest }): boolean =>
  hasStaffOrOwnerRole(req.user)

/** Ugyanaz mezőszinten. */
export const isStaffOrOwnerFieldAccess: FieldAccess = ({ req }) => hasStaffOrOwnerRole(req.user)
