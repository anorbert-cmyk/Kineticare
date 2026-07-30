import { getPayload } from 'payload'

import { createCheckoutStartHandler } from '../../../../../lib/checkout/route-handler'
import config from '../../../../../payload.config'

/**
 * POST /api/checkout/start — bejelentkezett vevő fizetésindítása (T-021).
 *
 * A handler a src/lib/checkout/route-handler.ts-ben él (függőség-injekcióval,
 * egységtesztelhetően); itt csak a valódi config bekötése történik.
 *
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik.
 */
export const POST = createCheckoutStartHandler({
  getPayload: () => getPayload({ config }),
})
