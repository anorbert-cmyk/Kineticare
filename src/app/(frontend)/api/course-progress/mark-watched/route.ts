import { getPayload } from 'payload'

import { createMarkWatchedHandler } from '../../../../../lib/course-progress/route-handler'
import config from '../../../../../payload.config'

/**
 * POST /api/course-progress/mark-watched — „megnéztem ezt a videót" jelölés a
 * bejelentkezett, a kurzust megvásárolt (és még érvényes hozzáférésű)
 * felhasználónak.
 *
 * Törzs: { productId, videoRef } — a videoRef a videó STABIL azonosítója
 * (src/lib/stream/contract.ts `streamVideoRef()`), sosem sorszám.
 * Válasz: 200 { productId, videoRef, watchedAt, alreadyWatched } | 400 | 401 |
 * 403 | 404 | 500 — magyar üzenettel; a technikai részletek csak a naplóba
 * kerülnek (requestId).
 *
 * A route a `(frontend)` route-groupban él, a repó többi API-végpontjával
 * egy helyen (a route-group nem része az URL-nek, az útvonal
 * `/api/course-progress/mark-watched`). A handler a
 * src/lib/course-progress/route-handler.ts-ben él (függőség-injekcióval,
 * egységtesztelhetően); itt csak a valódi config bekötése történik.
 *
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik.
 */
export const POST = createMarkWatchedHandler({
  getPayload: () => getPayload({ config }),
})
