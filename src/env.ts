/**
 * Induláskori környezeti-változó-ellenőrzés (ENV assert).
 *
 * A kötelező kulcsok listája itt, egy helyen kezelve — új kötelező ENV
 * esetén csak a megfelelő tömbhöz kell hozzáadni a kulcsot: `requiredEnvVars`
 * (minden környezetben kötelező), illetve a párban érvényes kulcsokhoz a
 * `turnstileEnvPair` mintája (élesben konzisztencia-ellenőrzés).
 * A tényleges ellenőrzés az `src/instrumentation.ts` `register()` függvényéből
 * fut le a szerver indulásakor, így hiányzó ENV esetén az app nem indul el.
 *
 * A fájlban SOSEM szerepel érték — csak kulcsnév; a titkok a
 * futtatókörnyezetben élnek.
 */

// Barion-kliens: a BARION_API_URL és BARION_PAYEE_EMAIL minden környezetben
// kötelező (a kliens részletes, környezetfüggő assertja az src/lib/barion/client.ts-ben él).
export const requiredEnvVars = [
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'NEXT_PUBLIC_SERVER_URL',
  'BARION_API_URL',
  'BARION_PAYEE_EMAIL',
] as const

export type RequiredEnvVar = (typeof requiredEnvVars)[number]

/**
 * Cloudflare Turnstile (kapcsolat-űrlap spam-védelem) — PÁRBAN érvényes kulcsok.
 *
 * - `TURNSTILE_SITE_KEY` — a kliensoldali widget kulcsa (a /kapcsolat oldal
 *   szerver-oldalon olvassa kérés-időben; hiányában a widget nem kerül a DOM-ba).
 * - `TURNSTILE_SECRET_KEY` — TITOK, a szerveri ellenőrzés kulcsa; hiányában a
 *   `verifyTurnstile` (src/payload.config.ts) korán visszatér.
 *
 * Élesben (NODE_ENV=production) az induláskori assert a pár KONZISZTENCIÁJÁT
 * követeli meg, mert a fél-lábas állapot mindkét iránya hibás:
 * - site key secret nélkül → a widget látszik, de a szerver némán mindent
 *   átenged (csendben kikapcsolt védelem);
 * - secret site key nélkül → a szerver tokent vár, amit a kliens sosem küld,
 *   tehát minden beküldés elakad.
 * Ha EGYIK sincs beállítva, az app elindul (a Turnstile még nincs élesítve),
 * de induláskori warn-riasztás jelzi, hogy a nyilvános, e-mailt küldő
 * form-submissions végpont egyetlen féke az IP-keret. Az élesítéshez MINDKÉT
 * kulcsot be kell állítani — egyik sem NEXT_PUBLIC_, tehát újrabuild nem kell.
 *
 * Az értéket ide SOSEM írjuk: a kulcsnevek az `.env.example`-ben szerepelnek,
 * a tényleges titok kizárólag a futtatókörnyezetben él.
 */
export const turnstileEnvPair = ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'] as const

/**
 * Bunny Stream (videó-kiszolgálás) — mind OPCIONÁLIS, szándékosan NEM
 * induláskori kötelező kulcs: a hiányuk nem dönti el az appot, hanem
 * kérés-időben, lazy módon derül ki (503 + magyar üzenet a token-végponton,
 * `null` embed-URL → magyar „nem érhető el" a lejátszóban). Így a rendszer a
 * kulcsok megérkezése ELŐTT is elindul és használható; a videó élesítése
 * kizárólag Railway-env-beállítás + újrabuild (a NEXT_PUBLIC_ kulcsok a build
 * pillanatában égnek bele az oldalba).
 *
 * - `BUNNY_STREAM_TOKEN_AUTH_KEY` — TITOK, a védett library token-kulcsa
 *   (src/lib/stream/issue-stream-token.ts).
 * - `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID` — a védett library id-ja (embed-URL).
 * - `NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID` — a publikus library id-ja
 *   (hero-videó, kurzus-előzetes — token nélkül).
 * - `NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST` — `vz-….b-cdn.net`, a CSP
 *   img-src/media-src forrása és a poszterképek hosztja.
 */
export const optionalBunnyStreamEnvVars = [
  'BUNNY_STREAM_TOKEN_AUTH_KEY',
  'NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID',
  'NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID',
  'NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST',
] as const

/**
 * Analitika (PostHog + Google Analytics 4) — mind OPCIONÁLIS, szándékosan NEM
 * induláskori kötelező kulcs: hiányukban a mérés teljes egészében no-op, az
 * app és a felület változatlanul működik.
 *
 * Ezek `NEXT_PUBLIC_` kulcsok, tehát a BUILD pillanatában égnek bele az
 * oldalba — beállításuk után ÚJRA KELL BUILDELNI (a CSP-fejléc is build-időben
 * dől el, lásd src/lib/security/csp.ts).
 *
 * - `NEXT_PUBLIC_POSTHOG_KEY` — a PostHog nyilvános projekt-kulcsa (docs/posthog.md).
 * - `NEXT_PUBLIC_POSTHOG_HOST` — felülírható PostHog-host (alap: EU-cloud).
 * - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 mérési azonosító (`G-…`, docs/ga4.md).
 *   Egyik sem titok: mindhárom nyilvános, kliensoldali azonosító.
 */
export const optionalAnalyticsEnvVars = [
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
] as const

/**
 * A Barion POSKey környezetfüggő: BARION_ENVIRONMENT=prod esetén az éles
 * kulcs (BARION_POSKEY_PROD), egyébként (alapértelmezett test) a tesztkulcs
 * (BARION_POSKEY_TEST) kötelező — így stagingen nem kell éles kulcs, élesben
 * pedig nem indul az app tesztkulccsal.
 */
function requiredBarionPosKeyEnv(): string {
  return process.env.BARION_ENVIRONMENT === 'prod' ? 'BARION_POSKEY_PROD' : 'BARION_POSKEY_TEST'
}

/** Ki van-e töltve (nem üres) a környezeti változó? */
function isEnvSet(key: string): boolean {
  const value = process.env[key]
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Éles futás-e. A `NODE_ENV` a Next.js production buildjében/indításában
 * ('next build' + 'next start') automatikusan 'production' — a tesztek és a
 * fejlesztői szerver nem ezen az ágon futnak.
 */
function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function assertRequiredEnv(
  warn?: (message: string, context?: Record<string, unknown>) => void,
): void {
  const missing: string[] = requiredEnvVars.filter((key) => !isEnvSet(key))

  const posKeyEnv = requiredBarionPosKeyEnv()
  if (!isEnvSet(posKeyEnv)) {
    missing.push(posKeyEnv)
  }

  if (missing.length > 0) {
    throw new Error(
      `Az alkalmazás nem indulhat el. Hiányzó kötelező környezeti változó(k): ${missing.join(', ')}. ` +
        'Állítsd be őket a környezetben (pl. helyben .env fájlban), majd indítsd újra a szervert.',
    )
  }

  if (isProductionRuntime()) {
    const [siteKeyEnv, secretKeyEnv] = turnstileEnvPair
    const siteSet = isEnvSet(siteKeyEnv)
    const secretSet = isEnvSet(secretKeyEnv)
    if (siteSet !== secretSet) {
      throw new Error(
        `Az alkalmazás nem indulhat el. Fél-lábas Turnstile-konfiguráció: csak a(z) ${siteSet ? siteKeyEnv : secretKeyEnv} van beállítva. ` +
          `A spam-védelem csak PÁRBAN működik (${turnstileEnvPair.join(' + ')}) — állítsd be mindkettőt, vagy kapcsold ki mindkettő törlésével.`,
      )
    }
    if (!siteSet) {
      warn?.('turnstile_kikapcsolva', {
        reszletek:
          'Egyik Turnstile-kulcs sincs beállítva — a kapcsolat-űrlapot élesben csak az IP-keret védi. Élesítés: TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY beállítása (újrabuild nem kell).',
      })
    }
  }
}
