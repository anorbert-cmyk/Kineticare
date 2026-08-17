import { getPayload } from 'payload'

import { createFreeCourseRequestHandler } from '../../../../../lib/free-course/route-handler'
import config from '../../../../../payload.config'

/**
 * POST /api/free-course/request — ingyenes kurzus igénylése (név + e-mail).
 *
 * A handler a src/lib/free-course/route-handler.ts-ben él (függőség-
 * injekcióval, egységtesztelhetően); itt csak a valódi config bekötése történik
 * — pontosan úgy, mint a checkout-start végponton.
 *
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik.
 */
export const POST = createFreeCourseRequestHandler({
  getPayload: () => getPayload({ config }),
})
