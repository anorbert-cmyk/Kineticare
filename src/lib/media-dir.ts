/**
 * A feltöltött képek célkönyvtára (Payload `upload.staticDir`).
 *
 * MIÉRT KELL: a Payload local-storage adapter alapértelmezésben a collection
 * slugjával megegyező, a folyamat munkakönyvtárához képest RELATÍV mappába ír
 * (`<cwd>/media`). Railwayen ez a konténer efemer lemeze, amit MINDEN deploy
 * üresen ad vissza — a DB-ben ott maradó média-rekordokhoz tartozó fájlok
 * eltűnnek, és a `/api/media/file/...` HTTP 500-at ad. A célkönyvtárat ezért
 * környezeti változóból (`PAYLOAD_MEDIA_DIR`) a csatolt Railway Volume
 * mountpointjára állítjuk (jelenleg `/app/media`), ami túléli a deployt.
 *
 * VÁLTOZÓ NÉLKÜL SEMMI NEM VÁLTOZIK: üres/hiányzó env esetén `undefined`-ot
 * adunk vissza, és a collection `upload` blokkjába a `staticDir` kulcs be sem
 * kerül — a Payload szanitálása ilyenkor a mai alapértelmezést (a collection
 * slugja, azaz `<cwd>/media`) állítja be. A fejlesztői viselkedés így bitre
 * azonos marad.
 */

import path from 'node:path'

/** A feltöltési könyvtárat felülíró környezeti változó neve. */
export const MEDIA_DIR_ENV = 'PAYLOAD_MEDIA_DIR'

/**
 * A `staticDir` értéke a környezeti változóból.
 *
 * - üres vagy hiányzó érték → `undefined` (marad a Payload alapértelmezése),
 * - megadott érték → ABSZOLÚT útvonalra normalizálva (`path.resolve`), mert a
 *   Payload a `staticDir`-t több helyen (feltöltés, kiszolgálás, törlés) a
 *   munkakönyvtárhoz képest oldja fel; abszolút útvonalnál ez a függés eltűnik.
 */
export const resolveMediaStaticDir = (
  raw: string | undefined = process.env[MEDIA_DIR_ENV],
): string | undefined => {
  const trimmed = raw?.trim()
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined
  }
  return path.resolve(trimmed)
}
