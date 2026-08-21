/**
 * Kijelentkezés-kliens — a Payload auth REST kijelentkező végpontjához.
 *
 * API-szerződés (Payload 3, `authCollectionEndpoints`):
 * - POST /api/users/logout → 200 { message }, és a válasz `Set-Cookie` fejléce
 *   LEJÁRT süti (`generateExpiredPayloadCookie`), azaz a böngésző a session-t a
 *   válasz feldolgozásakor eldobja. Sikertelen művelet: 400 { message }.
 *   Forrás (a repóban telepített csomag): `payload/dist/auth/endpoints/logout.js`
 *   és `payload/dist/auth/endpoints/index.js` (`{ method: 'post', path: '/logout' }`).
 *
 * MIÉRT POST, ÉS MIÉRT NEM LINK. A kijelentkezés ÁLLAPOTVÁLTOZÁS. Az OWASP
 * CSRF-útmutatója egyértelmű: „Do not use GET requests for state changing
 * operations", mert a `SameSite=Lax` süti a biztonságosnak minősített
 * metódusokkal induló felső szintű navigációkon átmegy — egy GET-es kilépő
 * útvonalat idegen oldal is elsüthetne.
 * OWASP — Cross-Site Request Forgery Prevention Cheat Sheet:
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 *
 * A `fetch` injektálható, hogy a teszt VALÓDI hálózati hívás nélkül mérhesse a
 * szerződést (a repó 15. üzemeltetési tanulsága: tesztből sosem megy ki hívás).
 */

import { resetAnalyticsIdentity } from './analytics/posthog'

/** Magyar, cselekvésre irányító hibaszöveg (WCAG 3.3.1 szellemében: mit tegyen). */
export const LOGOUT_ERROR_MESSAGE =
  'A kijelentkezés most nem sikerült. Próbáld újra, vagy zárd be a böngészőt.'

export interface LogoutResult {
  ok: boolean
  message?: string
}

/**
 * Kijelentkezés + az analitikai AZONOSSÁG elengedése.
 *
 * ═══ MIÉRT KÖTELEZŐ A `reset()` (nem szépészeti kérdés) ═══
 * A belépéskor lefutó `identify()` a PostHog `distinct_id`-jét a felhasználó
 * Payload-azonosítójára állítja, és ezt a böngésző TÁROLÓJÁBAN tartja
 * (localStorage + süti — buildPostHogOptions). A `reset()` nélkül ez a
 * kijelentkezés után is ott marad, tehát MINDEN további esemény — a következő
 * látogatóé is — az ELŐZŐ felhasználó profiljára menne.
 *
 * KÖZÖS GÉPEN ez azonnali kár, és nálunk közös gép a tipikus eset: rendelői
 * tablet, családi laptop, egy háztartáson belül két beteg. Két különböző ember
 * viselkedése olvadna egy profilba — egyszerre MÉRÉSI hiba (hamis megtartás- és
 * kohorsz-számok) és ADATVÉDELMI hiba (A viselkedése B azonosítója alatt
 * tárolódna). A `resetAnalyticsIdentity` ezért itt fut, a sikeres kilépés után.
 *
 * MIÉRT CSAK SIKER UTÁN: ha a végpont hibázik, a munkamenet ÉL — az azonosság
 * eldobása ilyenkor a még bejelentkezett felhasználó eseményeit szakítaná le a
 * profiljáról.
 *
 * A `resetIdentity` injektálható (teszt), és a gyártásban használt
 * `resetAnalyticsIdentity` maga is no-op, ha nincs consent vagy nincs kulcs.
 * A hívás `try/catch`-ben fut: a mérés hibája nem ronthatja el a kijelentkezést
 * (ugyanaz a garancia, mint a LoginForm/RegisterForm követésénél).
 */
export async function logoutUser(
  fetchImpl: typeof fetch = fetch,
  resetIdentity: () => void = resetAnalyticsIdentity,
): Promise<LogoutResult> {
  try {
    const response = await fetchImpl('/api/users/logout', {
      method: 'POST',
      // A süti-alapú session nélkül a végpont 400-at adna („No User").
      credentials: 'include',
    })
    if (!response.ok) {
      return { ok: false, message: LOGOUT_ERROR_MESSAGE }
    }
    try {
      resetIdentity()
    } catch {
      // A mérés hibája nem érheti el a felhasználót — a kilépés sikeres.
    }
    return { ok: true }
  } catch {
    return { ok: false, message: LOGOUT_ERROR_MESSAGE }
  }
}
