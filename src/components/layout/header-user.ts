import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { logger } from '../../lib/logger'
import type { User } from '../../payload-types'

import config from '../../payload.config'

/**
 * A fejléc hitelesítési állapota — SZERVER-oldalon megállapítva.
 *
 * A minta AZONOS a védett oldalakéval (`src/app/(frontend)/kurzusaim/page.tsx`,
 * `src/app/(frontend)/fiok/page.tsx`, `src/app/(frontend)/belepes/page.tsx`):
 * `payload.auth({ headers: await headers() })`. Szándékosan nem vezetünk be új
 * utat — egy második auth-mechanizmus két igazságot jelentene.
 *
 * STATIKUSSÁG. A `headers()` dinamikus API, tehát dinamikussá tenné az őt
 * használó útvonalat. A `(frontend)` route-group azonban MA IS teljes egészében
 * dinamikus: a csoport layoutja (`src/app/(frontend)/layout.tsx`) kimondja, hogy
 * `export const dynamic = 'force-dynamic'`. Ez a segédlet tehát NEM vesz el
 * statikus renderelést — a build route-manifestje ellenőrizhetően ugyanannyi
 * statikus útvonalat ad, mint előtte (a mérés a jelentésben).
 *
 * FAIL-OPEN. Hibánál `null` (kijelentkezett nézet). Egy lekérdezési hiba miatt a
 * fejléc ne omoljon össze: a látogató ilyenkor „Belépés"-t lát, és mivel a
 * `/belepes` a már bejelentkezettet azonnal a `returnUrl`-re irányítja
 * (belepes/page.tsx), a vevő EGY kattintással így is a kurzusaihoz jut.
 */
export interface HeaderAuthState {
  /** Van-e élő session. A fejléc csak ezt az egy bitet használja. */
  signedIn: boolean
}

export async function getHeaderAuthState(): Promise<HeaderAuthState> {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return { signedIn: ((user as User | null) ?? null) !== null }
  } catch (error) {
    logger.warn('fejléc: a hitelesítési állapot lekérdezése sikertelen', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { signedIn: false }
  }
}
