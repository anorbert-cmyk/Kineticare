import { getPayload } from 'payload'

import { createGrantPurchaseHandler } from '../../../../../lib/grant-purchase-route'
import config from '../../../../../payload.config'

/**
 * POST /api/admin/grant-purchase — kézi kurzus-hozzáférés adása (staff/owner).
 *
 * A handler az src/lib/grant-purchase-route.ts-ben él (függőség-injekcióval,
 * egységtesztelhetően); itt csak a valódi config bekötése történik — a
 * visszatérítés-végpont (src/app/(frontend)/api/admin/orders/[orderNumber]/refund)
 * mintájára.
 *
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik.
 */
export const POST = createGrantPurchaseHandler({
  getPayload: () => getPayload({ config }),
})
