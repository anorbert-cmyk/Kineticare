import type { FieldAccess, PayloadRequest } from 'payload'

import { hasOwnerRole } from './roles'

/**
 * Csak owner szerepkörű felhasználó férhet hozzá (collection-szint).
 * Pénzügyi/személyes adatok és jogosultság-emelés elleni védelem alapja.
 * Szándékosan boolean-visszatérésű: így Access- és admin-access-kontextusban
 * is használható.
 */
export const isOwner = ({ req }: { req: PayloadRequest }): boolean => hasOwnerRole(req.user)

/** Ugyanaz mezőszinten (pl. users.role írás, orders pénzügyi mezők). */
export const isOwnerFieldAccess: FieldAccess = ({ req }) => hasOwnerRole(req.user)
