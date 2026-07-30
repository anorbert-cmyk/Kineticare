import type { Access } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * Az ecommerce plugin adminOrPublishedStatus bekötése (products read):
 *
 * - staff/owner: minden rekord, draftot is (true)
 * - látogató/customer: csak a published draft-verziók (where-kényszer)
 *
 * Fontos: ez a Payload drafts `_status` mezőjére szűr (a products collectionben
 * a draft-verziózás be van kapcsolva) — NE keverendő össze a publishedOrAdmin-nel,
 * amely a pages/posts saját `status` select-mezőjére szűr.
 */
export const adminOrPublishedStatus: Access = ({ req }) =>
  hasStaffOrOwnerRole(req.user) ? true : { _status: { equals: 'published' } }
