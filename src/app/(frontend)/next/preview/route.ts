import { draftMode } from 'next/headers'
import { getPayload } from 'payload'

import { createPreviewHandler } from '../../../../lib/preview/route-handler'
import config from '../../../../payload.config'

/**
 * GET /next/preview — a piszkozat-előnézetet bekapcsoló route.
 *
 * A handler az src/lib/preview/route-handler.ts-ben él (függőség-injekcióval,
 * egységtesztelhetően); itt csak a valódi Payload-config és a Next draft mode
 * bekötése történik.
 *
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik
 * (checkout-start / barion-callback / refund route-minta).
 */
export const dynamic = 'force-dynamic'

export const GET = createPreviewHandler({
  getPayload: () => getPayload({ config }),
  enableDraftMode: async () => {
    const draft = await draftMode()
    draft.enable()
  },
})
