import type { Access, Where } from 'payload'

import { hasOwnerRole, hasStaffOrOwnerRole } from './roles'

/**
 * A `users` collection ÍRÁSI (update) szabálya — a legkisebb jogosultság elve.
 *
 * ═══ MIÉRT NEM AZ isSelfOrAdmin ═══
 * Az olvasás (`read`) továbbra is az `isSelfOrAdmin`: a staffnak az admin
 * felületen minden felhasználót látnia kell (rendelés-egyeztetés,
 * ügyfélszolgálat). Az ÍRÁS viszont eddig ugyanazt a szabályt használta, tehát
 * egy staff bármely rekordot módosíthatta — beleértve a TULAJDONOS és a többi
 * staff rekordját is. A Payload beépített `password`/`email` mezőin nincs
 * mezőszintű `access`, ezért ez gyakorlatilag idegen fiók hitelesítési
 * adatainak átírását (fiókátvételt) jelentette volna, a vevői fiókoknál pedig
 * GDPR-kockázatot.
 *
 * ═══ A SZABÁLY ═══
 *  - owner        → minden rekord (`true`);
 *  - staff        → a SAJÁT rekordja + a `customer` szerepkörű rekordok
 *                   (where-kényszer); owner/staff rekordot nem módosíthat;
 *  - customer     → kizárólag a saját rekordja (where-kényszer az id-re);
 *  - látogató     → semmi (`false`).
 *
 * A staff ágon a két feltétel VAGY-kapcsolatban áll, mert a staff saját
 * rekordjának `role`-ja nem `customer` — enélkül a staff a saját profilját
 * (nevét, számlázási adatait, jelszavát) sem tudná menteni.
 *
 * ═══ MI VÉDI MÉG A REKORDOT ═══
 * A where-kényszer önmagában NEM elég: a `role` és a `purchases` mező
 * MEZŐSZINTEN védett (owner-only, illetve rendszer-írású), a jelszó- és
 * e-mail-csere idegen rekordon pedig a Users collection
 * `blockForeignCredentialChange` beforeChange hookján bukik el. A három réteg
 * szándékosan független: egy jövőbeli refaktor, amely az egyiket elrontja, a
 * másik kettőn még fennakad.
 */
export const canUpdateUser: Access = ({ req }) => {
  if (hasOwnerRole(req.user)) {
    return true
  }
  if (hasStaffOrOwnerRole(req.user) && req.user) {
    // A `Where[]` annotáció kell: enélkül a TypeScript a két objektum-literálból
    // olyan uniót következtet, amelyben a hiányzó kulcs `undefined` típust kap
    // (`role?: undefined`), az pedig nem illeszkedik a Where index-szignatúrájára.
    const sajatVagyVevo: Where[] = [
      { id: { equals: req.user.id } },
      { role: { equals: 'customer' } },
    ]
    return { or: sajatVagyVevo }
  }
  if (req.user) {
    const csakSajat: Where = { id: { equals: req.user.id } }
    return csakSajat
  }
  return false
}
