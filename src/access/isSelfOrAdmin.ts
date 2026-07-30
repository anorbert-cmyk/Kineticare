import type { Access } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * Saját rekord vagy admin (staff/owner) — a users collection read/update szabálya.
 *
 * - staff/owner: minden rekord (true)
 * - bejelentkezett customer: csak a saját rekordja (where-kényszer az id-re)
 * - látogató: semmi (false)
 *
 * Megjegyzés: az érzékeny mezők (role, purchases) ettől függetlenül
 * mezőszinten védettek, így a saját-rekord update sem emelhet jogosultságot.
 */
export const isSelfOrAdmin: Access = ({ req }) => {
  if (hasStaffOrOwnerRole(req.user)) {
    return true
  }
  if (req.user) {
    return { id: { equals: req.user.id } }
  }
  return false
}
