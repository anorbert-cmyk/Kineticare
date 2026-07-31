import { getPayload } from 'payload'

import { createStreamTokenHandler } from '../../../../lib/stream/route-handler'
import config from '../../../../payload.config'

/**
 * GET /api/stream-token — védett videókhoz signed playback token, kizárólag
 * a kurzust megvásárló, bejelentkezett felhasználónak (paywall API-szinten).
 *
 * Query: ?productId=<szám> [&videoId=<streamAssetId|sor-id>]
 * Válasz: 200 { token, expiresAt } | 401 | 403 | 404 | 409 | 503 — magyar
 * üzenettel; a technikai részletek csak a naplóba kerülnek (requestId).
 *
 * A handler a src/lib/stream/route-handler.ts-ben él (függőség-injekcióval,
 * egységtesztelhetően); itt csak a valódi config bekötése történik.
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik.
 */
export const GET = createStreamTokenHandler({
  getPayload: () => getPayload({ config }),
})
