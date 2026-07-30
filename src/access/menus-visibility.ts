import type { Access } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * Menük olvasási szabálya (T-013):
 *
 * - staff/owner: minden menüsort lát (true) — az admin felületen a rejtett
 *   sorok is szerkeszthetők maradnak;
 * - látogató/customer: csak a visible=true sorok (where-kényszer) — a rejtett
 *   menüpontok a nyilvános API-n nem jelennek meg.
 *
 * A cél-entitás (page/post/product) published-szűrése a frontend-lekérés
 * feladata — ez a szabály csak a menus collection-szintű láthatóságot kezeli.
 *
 * Bekötés: a Menus collection access.read-je ÉS a centrális politika
 * (src/access/policies.ts, T-011-hez T-013-kor hozzáadva) is ezt használja.
 */
export const visibleMenusOrAdmin: Access = ({ req }) =>
  hasStaffOrOwnerRole(req.user) ? true : { visible: { equals: true } }
