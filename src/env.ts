/**
 * Induláskori környezeti-változó-ellenőrzés (ENV assert).
 *
 * A kötelező kulcsok listája itt, egy helyen kezelve — új kötelező ENV
 * esetén csak ehhez a tömbhöz kell hozzáadni a kulcsot.
 * A tényleges ellenőrzés az `src/instrumentation.ts` `register()` függvényéből
 * fut le a szerver indulásakor, így hiányzó ENV esetén az app nem indul el.
 */

export const requiredEnvVars = ['DATABASE_URI', 'PAYLOAD_SECRET'] as const

export type RequiredEnvVar = (typeof requiredEnvVars)[number]

export function assertRequiredEnv(): void {
  const missing = requiredEnvVars.filter((key) => {
    const value = process.env[key]
    return typeof value !== 'string' || value.trim().length === 0
  })

  if (missing.length > 0) {
    throw new Error(
      `Az alkalmazás nem indulhat el. Hiányzó kötelező környezeti változó(k): ${missing.join(', ')}. ` +
        'Állítsd be őket a környezetben (pl. helyben .env fájlban), majd indítsd újra a szervert.',
    )
  }
}
