import type { Access } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * Nyilvános tartalom read-szabálya (pages/posts):
 *
 * - staff/owner: minden rekord, draftot is (true)
 * - látogató/customer: csak a published státuszúak (where-kényszer)
 *
 * Fontos: ez a saját `status` select-mezőre szűr (draft/published), NEM a
 * Payload drafts `_status` mezőjére — a pages/posts collectionök nem használnak
 * draft-verziózást. (Az ecommerce plugin adminOrPublishedStatus-a ezzel
 * szemben a products `_status` mezőjére szűr, mert ott a drafts be van kapcsolva.)
 */
export const publishedOrAdmin: Access = ({ req }) =>
  hasStaffOrOwnerRole(req.user) ? true : { status: { equals: 'published' } }
