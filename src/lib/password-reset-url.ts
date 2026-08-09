/**
 * A jelszó-beállító (reset) oldal útvonala és linkjének felépítése — EGY helyen.
 *
 * Két, egymástól független folyamat épít ilyen linket, és a kettőnek ugyanoda
 * kell mutatnia:
 *
 *  - az „Elfelejtett jelszó" levél (`src/lib/email/users-auth.ts`), amit a
 *    Payload küld a `POST /api/users/forgot-password` hívásra, és
 *  - a vásárló-migráció aktiváló levele/linkje
 *    (`src/lib/customer-import/invite.ts`).
 *
 * Mindkettő ugyanazt a Payload-tokent használja, tehát ugyanaz a nyilvános
 * oldal fogadja: `src/app/(frontend)/jelszo-visszaallitas/page.tsx`, ami a
 * tokent QUERY-paraméterben (`?token=`) várja. Az admin felület saját
 * `/admin/reset/<token>` oldala a vásárlóknak nem való: az adminba a
 * `customer` szerepkör nem léphet be (Users.access.admin = staff+owner).
 */

/** A nyilvános (vásárlói) jelszó-beállító oldal útvonala. */
export const PASSWORD_RESET_PATH = '/jelszo-visszaallitas'

/**
 * Abszolút jelszó-beállító link a tokenből.
 *
 * A link e-mailben megy ki, ezért abszolút URL kell; a záró perjelek levágva,
 * a token URL-kódolva (a Payload tokenje hexadecimális, de a kódolás
 * elhagyása néma hibaforrás lenne, ha ez valaha változik).
 */
export function buildPasswordResetUrl(serverUrl: string, token: string): string {
  const base = serverUrl.replace(/\/+$/, '')
  return `${base}${PASSWORD_RESET_PATH}?token=${encodeURIComponent(token)}`
}
