import type { Access } from 'payload'

/**
 * Dokumentum-tulajdonos (ecommerce): a bejelentkezett felhasználó csak a saját
 * customer-kapcsolatú dokumentumait látja (orders/carts). Látogatónak semmi.
 *
 * A plugin ezt az isAdmin-nel kombinálva használja (staff/owner mindent lát,
 * customer csak a sajátját) — önmagában NEM ad admin-jogot.
 */
export const isDocumentOwner: Access = ({ req }) =>
  req.user ? { customer: { equals: req.user.id } } : false
