import type { Access } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * Vélemények olvasási szabálya:
 *
 * - staff/owner: minden véleményt lát (true) — az adminban a levett
 *   (visible=false) rekordok is szerkeszthetők maradnak;
 * - látogató/customer: csak a visible=true sorok (where-kényszer) — az
 *   elrejtett vélemény a nyilvános API-n sem jelenik meg.
 *
 * Szándékosan a Menus `visibleMenusOrAdmin` mintáját követi (ugyanaz a
 * „látható-vagy-admin" szemantika), így a jogosultsági mátrix egységes marad.
 * A kiemelés (`featured`) NEM jogosultsági kérdés: azt a storefront-lekérdezés
 * szűri, nem az access-politika.
 *
 * Bekötés: a centrális politika (src/access/policies.ts → a végleges configra
 * az applyCollectionAccessPolicies applikálja).
 */
export const visibleTestimonialsOrAdmin: Access = ({ req }) =>
  hasStaffOrOwnerRole(req.user) ? true : { visible: { equals: true } }
