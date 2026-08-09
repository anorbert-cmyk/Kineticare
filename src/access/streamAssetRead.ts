import type { FieldAccess } from 'payload'

import { hasStaffOrOwnerRole } from './roles'

/**
 * A products videos[].streamAssetId mező olvasási joga (sec-review).
 *
 * A Cloudflare Stream azonosító a fizetős tartalom kulcsa — anonim és nem-vevő
 * customer felé nem kerülhet ki a REST API-n:
 * - staff/owner mindig olvassa (admin + feltöltés-folyamat);
 * - bejelentkezett customer csak akkor, ha a `purchases` listája tartalmazza a
 *   szülő-terméket (a Barion-callback írja, ld. issue-stream-token hasPurchased);
 * - anonim látogató sosem.
 *
 * A szülő-termék a FieldAccess `doc` argumentumából jön (array-soroknál is a
 * top-level dokumentum), így a vevő-ellenőrzéshez nem kell extra DB-lekérdezés:
 * az autholt `req.user` a purchases relationship-et id-listaként hordozza.
 *
 * A storefront oldalak (kurzus-oldal epizódlistája, /kurzusaim lejátszó,
 * stream-token végpont) overrideAccess: true-val olvasnak szerver-oldalon —
 * azokat a mezőszűrés nem érinti. A mező tiltott olvasáskor egyszerűen
 * undefined marad a válaszban (a Payload törli), a title/durationSec/status
 * almezők nyilvánosak maradnak.
 */
export const streamAssetReadAccess: FieldAccess = ({ doc, req }) => {
  if (hasStaffOrOwnerRole(req.user)) {
    return true
  }
  const user = req.user
  if (!user) {
    return false
  }
  const productId =
    typeof doc === 'object' && doc !== null && 'id' in doc
      ? (doc as { id?: unknown }).id
      : undefined
  const purchases = (user as { purchases?: unknown }).purchases
  if (!Array.isArray(purchases)) {
    return false
  }
  return purchases.some((entry) => {
    if (typeof entry === 'number') {
      return entry === productId
    }
    if (typeof entry === 'object' && entry !== null && 'id' in entry) {
      return (entry as { id?: unknown }).id === productId
    }
    return false
  })
}
