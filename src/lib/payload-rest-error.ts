/**
 * Payload REST hibaválasz → EMBERI, magyar üzenet.
 *
 * A Payload (és a plugin-jai) a hibát `{ errors: [{ message }] }` alakban
 * adják vissza; a saját hookjaink `APIError`-jai már magyarul érkeznek (pl. a
 * kapcsolat-űrlap consent-hibái, a Turnstile-hibák, a rate-limit 429-e), ezért
 * azokat SZÓ SZERINT jelenítjük meg. Ha a válasz nem értelmezhető (nem JSON,
 * üres törzs, proxy-hibaoldal), a hívó által adott általános üzenet marad.
 *
 * Megjegyzés a duplikációról: a kapcsolat-űrlap `_lib/submit.ts`-e ma saját,
 * azonos működésű privát segédet tartalmaz (`extractErrorMessage`). Ez a modul
 * annak a KÖZÖS változata; a kapcsolat-űrlap ráállítása külön, fókuszált
 * lépés (a párhuzamos ügynök-munka miatt itt nem nyúlunk idegen fájlhoz).
 */

/**
 * @param response a sikertelen (nem `ok`) válasz
 * @param fallback általános magyar üzenet, ha a törzsből nem nyerhető ki hiba
 */
export async function extractPayloadErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      errors?: Array<{ message?: string }>
      message?: string
    }
    const first = body.errors?.find((entry) => typeof entry.message === 'string')
    if (first?.message) {
      return first.message
    }
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message
    }
  } catch {
    // Nem JSON-válasz — marad az általános üzenet.
  }
  return fallback
}
