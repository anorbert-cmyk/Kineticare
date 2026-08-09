/**
 * Hero-videó konfiguráció (kezdőlap fejléc).
 *
 * A hero-videó a Bunny Stream PUBLIKUS libraryjében él (token nélkül — ez
 * marketing-tartalom, nem a védett kurzusvideó-folyamat; a Bunnynál a
 * token-hitelesítés library-szintű, lásd docs/video-platform-dontes.md 4.4).
 * A videó GUID-ját ide kell beírni a feltöltés után — a tulajdonosok
 * Claude/ChatGPT-vel végzett szerkesztési munkafolyamatába ez így
 * természetesen illeszkedik (egy sor, egy commit). A feltöltés lépései:
 * docs/hero-video-feltoltes.md.
 *
 * null = nincs hero-videó → a hero a CMS heroImage-re esik vissza. MA EZ AZ
 * ÁLLAPOT: a kezdőlapon nem fut Stream-videó (a nyitó filmsáv ettől független,
 * LOKÁLIS fájlokból dolgozik — src/components/blocks/FilmHero.tsx).
 */
export const HERO_VIDEO_STREAM_ID: string | null = null

/** A publikus library azonosítója (hero + előzetesek), vagy üres string. */
function publicLibraryId(): string {
  return process.env.NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID?.trim() ?? ''
}

/** A pull-zone hosztneve (vz-….b-cdn.net) a poszterképhez, vagy üres string. */
function pullZoneHost(): string {
  return process.env.NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST?.trim() ?? ''
}

/**
 * A Bunny Stream publikus iframe-beágyazás URL-je (háttérvideó-paraméterekkel).
 *
 * @returns az embed-URL, vagy null, ha a publikus library-id nincs beállítva
 *   (ilyenkor a HeroVideo csak a poszterképet mutatja — nem fekete dobozt).
 */
export function buildHeroStreamEmbedUrl(streamId: string): string | null {
  const id = streamId.trim()
  if (id.length === 0) {
    throw new Error('buildHeroStreamEmbedUrl: üres stream-azonosító.')
  }
  const libraryId = publicLibraryId()
  if (libraryId.length === 0) {
    return null
  }
  // autoplay csak muted mellett engedélyezett a böngészőkben; loop + preload,
  // responsive (a Bunny player a konténerhez igazodik), és NINCS jegy
  // (publikus marketing-videó).
  //
  // ELLENŐRIZENDŐ ÉLESÍTÉS ELŐTT: a Cloudflare `controls=false` paraméterének
  // nincs pontos megfelelője az embed-URL-ben — a Bunnynál a vezérlők
  // láthatósága a library Player-beállításában (Stream → a library → Player)
  // állítható. Háttérvideóhoz ott kell kikapcsolni a kontrollokat.
  const params = new URLSearchParams({
    autoplay: 'true',
    muted: 'true',
    loop: 'true',
    preload: 'true',
    responsive: 'true',
  })
  return `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(id)}?${params.toString()}`
}

/**
 * A Bunny automatikus poszterképe a pull-zone hosztról
 * (`https://<pull-zone>/<guid>/thumbnail.jpg`).
 *
 * @returns a poszter-URL, vagy null, ha a pull-zone hoszt nincs beállítva.
 */
export function buildHeroStreamPosterUrl(streamId: string): string | null {
  const id = streamId.trim()
  if (id.length === 0) {
    throw new Error('buildHeroStreamPosterUrl: üres stream-azonosító.')
  }
  const host = pullZoneHost()
  if (host.length === 0) {
    return null
  }
  return `https://${encodeURIComponent(host)}/${encodeURIComponent(id)}/thumbnail.jpg`
}
