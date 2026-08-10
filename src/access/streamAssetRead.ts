import type { FieldAccess } from 'payload'

import { hasUserPurchased } from '../lib/courses'
import { hasStaffOrOwnerRole } from './roles'

/**
 * A products `videos[].streamAssetId` mező OLVASÁSI joga (sec-review, S2/b).
 *
 * ═══ MIT VÉD ═══
 * A mező a VÉDETT Bunny Stream library videó-GUID-ja — a fizetős tartalom
 * kulcsa. A products collection olvasása nyilvános (`adminOrPublishedStatus`:
 * a published termékeket bárki lekérdezheti), tehát a mező védelme nélkül egy
 * `GET /api/products` az ÖSSZES published kurzus összes videó-GUID-ját
 * visszaadja anonim kérőnek is. A GUID önmagában (aláírt jegy nélkül) nem
 * játszható le a védett libraryből, de a paywall mögötti katalógus teljes
 * leltára, és egy Bunny-oldali beállítási hiba (pl. véletlenül publikussá tett
 * library) esetén azonnal lejátszható tartalommá válik.
 *
 * ═══ A SZABÁLY ═══
 * - staff/owner: MINDIG olvassa (admin-szerkesztés, videó-feltöltés folyamata);
 * - bejelentkezett customer: csak ha a `purchases` listája tartalmazza a
 *   szülő-terméket — ugyanaz a szemantika, mint a stream-token paywallé
 *   (`hasUserPurchased`, src/lib/courses.ts);
 * - anonim látogató: SOHA.
 *
 * ═══ MIÉRT NEM TÖRI EL A LEJÁTSZÁST ═══
 * A field-access csak akkor fut, ha `overrideAccess !== true`
 * (payload/dist/fields/hooks/afterRead/promise.js: `overrideAccess ? true :
 * await field.access.read(...)`). A lejátszási út MINDEN szerver-oldali
 * termék-olvasása `overrideAccess: true`-val megy — a stream-token szolgáltatás
 * (src/lib/stream/issue-stream-token.ts), a lejátszó-oldal
 * (src/app/(frontend)/kurzusaim/[id]/page.tsx) és a haladás-jelölés
 * (src/lib/course-progress/mark-watched.ts) is —, tehát a szigorítás kizárólag
 * a NYILVÁNOS REST-felületet érinti. Az admin felület staff/owner-ként olvas,
 * neki a szabály első ága ad true-t.
 *
 * ═══ A SZÜLŐ-TERMÉK AZONOSÍTÁSA ═══
 * Array-almezőnél a Payload a TOP-LEVEL dokumentumot adja `doc`-ként és annak
 * kulcsát `id`-ként (ugyanott: `field.access.read({ id: doc.id, data: doc,
 * doc, req, siblingData: siblingDoc })`), tehát a vevő-ellenőrzéshez nincs
 * szükség extra adatbázis-körre. Ha az azonosító mégsem állapítható meg, a
 * szabály FAIL-CLOSED: a mező nem olvasható.
 *
 * Tiltott olvasáskor a Payload egyszerűen TÖRLI a mezőt a válaszból
 * (`delete siblingDoc[field.name]`); a videó-sor többi almezője (cím, hossz,
 * állapot) nyilvános marad, így a kurzusoldal epizódlistája változatlan.
 */
export const streamAssetReadAccess: FieldAccess = ({ doc, id, req }) => {
  if (hasStaffOrOwnerRole(req.user)) {
    return true
  }
  const user = req.user
  if (!user) {
    return false
  }
  const productId = resolveProductId(id, doc)
  if (productId === null) {
    return false
  }
  return hasUserPurchased(user.purchases, productId)
}

/** A szülő-termék numerikus azonosítója az `id`, majd a `doc.id` argumentumból. */
function resolveProductId(id: unknown, doc: unknown): number | null {
  const fromId = toProductId(id)
  if (fromId !== null) {
    return fromId
  }
  if (typeof doc === 'object' && doc !== null && 'id' in doc) {
    return toProductId((doc as { id?: unknown }).id)
  }
  return null
}

function toProductId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim())
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}
