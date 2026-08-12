/**
 * A CoursePlayer lejátszóállapotának token-érkezési szabálya — tiszta,
 * DOM-független függvény, hogy egységtesztelhető legyen (a komponens
 * node-környezetű tesztjei nem futtathatnak időzítőket).
 *
 * ═══ A HIBA, AMIT BEZÁR ═══
 * A token-frissítés a lejárat előtt 5 perccel ÚJ jegyet kér — de a friss jegy
 * az iframe `src`-be került, ami újramountolta a lejátszót, és a vevő elvesztette
 * a pozícióját (a „lejátszás nem szakad meg" frissítés maga szakította meg a
 * lejátszást). A szabály most: frissítéskor a tárolt jegy/frissítési ütemezés
 * megújul, de az iframe által TÉNYLEGESEN betöltött src (`loadedSrc`) CSAK
 * explicit epizód-betöltéskor változik.
 */

/** A „playing" állapot — a token a legfrissebb, a loadedSrc az iframe-ben lévő. */
export interface PlayingSession {
  videoIndex: number
  token: string
  expiresAtEpochSec: number
  /** Az iframe által TÉNYLEGESEN betöltött embed-URL (csak explicit betöltéskor változik). */
  loadedSrc: string | null
}

/** A frissen kiállított jegy és a belőle épített embed-URL. */
export interface FreshPlayingToken {
  videoIndex: number
  token: string
  expiresAtEpochSec: number
  /** Az ÚJ jegyből épített embed-URL (explicit betöltésnél kerül az iframe-be). */
  src: string | null
}

/**
 * A lejátszóállapot összefésülése a token-válasszal.
 *
 * - token-FRISSÍTÉS (isRefresh) ugyanarra az epizódra: a `loadedSrc` MEGMARAD
 *   (az iframe nem mountol újra — nincs pozícióvesztés), csak a tárolt jegy és
 *   lejárat újul (ezek egy későbbi explicit betöltés alapjai);
 * - minden más eset (explicit epizód-váltás, „Újrapróbálom", első betöltés):
 *   az új src kerül az iframe-be — ilyenkor szándékos az újramount.
 *
 * @param previous az aktuális lejátszási állapot, vagy null, ha nem „playing"
 * @param next a frissen kiállított jegy + src
 * @param isRefresh token-frissítés (true) vagy felhasználói/epizód-betöltés (false)
 */
export function mergePlayingSession(
  previous: PlayingSession | null,
  next: FreshPlayingToken,
  isRefresh: boolean,
): PlayingSession {
  if (isRefresh && previous !== null && previous.videoIndex === next.videoIndex) {
    return {
      videoIndex: next.videoIndex,
      token: next.token,
      expiresAtEpochSec: next.expiresAtEpochSec,
      loadedSrc: previous.loadedSrc,
    }
  }
  return {
    videoIndex: next.videoIndex,
    token: next.token,
    expiresAtEpochSec: next.expiresAtEpochSec,
    loadedSrc: next.src,
  }
}
