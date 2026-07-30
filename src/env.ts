/**
 * Induláskori környezeti-változó-ellenőrzés (ENV assert).
 *
 * A kötelező kulcsok listája itt, egy helyen kezelve — új kötelező ENV
 * esetén csak ehhez a tömbhöz kell hozzáadni a kulcsot.
 * A tényleges ellenőrzés az `src/instrumentation.ts` `register()` függvényéből
 * fut le a szerver indulásakor, így hiányzó ENV esetén az app nem indul el.
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
 * A Barion POSKey környezetfüggő: BARION_ENVIRONMENT=prod esetén az éles
 * kulcs (BARION_POSKEY_PROD), egyébként (alapértelmezett test) a tesztkulcs
 * (BARION_POSKEY_TEST) kötelező — így stagingen nem kell éles kulcs, élesben
 * pedig nem indul az app tesztkulccsal.
 */
function requiredBarionPosKeyEnv(): string {
  return process.env.BARION_ENVIRONMENT === 'prod' ? 'BARION_POSKEY_PROD' : 'BARION_POSKEY_TEST'
}

export function assertRequiredEnv(): void {
  const missing: string[] = requiredEnvVars.filter((key) => {
    const value = process.env[key]
    return typeof value !== 'string' || value.trim().length === 0
  })

  const posKeyEnv = requiredBarionPosKeyEnv()
  const posKeyValue = process.env[posKeyEnv]
  if (typeof posKeyValue !== 'string' || posKeyValue.trim().length === 0) {
    missing.push(posKeyEnv)
  }

  if (missing.length > 0) {
    throw new Error(
      `Az alkalmazás nem indulhat el. Hiányzó kötelező környezeti változó(k): ${missing.join(', ')}. ` +
        'Állítsd be őket a környezetben (pl. helyben .env fájlban), majd indítsd újra a szervert.',
    )
  }
}
