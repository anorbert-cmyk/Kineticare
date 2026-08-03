/**
 * Hero-videó konfiguráció (kezdőlap fejléc).
 *
 * A hero-videó a Cloudflare Streamben él (PUBLIKUS, aláírás nélküli — ez
 * marketing-tartalom, nem a védett kurzusvideó-folyamat). A videó azonosítóját
 * (UID) ide kell beírni a feltöltés után — a tulajdonosok Claude/ChatGPT-vel
 * végzett szerkesztési munkafolyamatába ez így természetesen illeszkedik
 * (egy sor, egy commit). A feltöltés lépései: docs/hero-video-feltoltes.md.
 *
 * null = nincs hero-videó → a hero a CMS heroImage-re esik vissza.
 */
export const HERO_VIDEO_STREAM_ID: string | null = null

/** A Cloudflare Stream publikus iframe-beágyazás URL-je (háttérvideó-paraméterekkel). */
export function buildHeroStreamEmbedUrl(streamId: string): string {
  const id = streamId.trim()
  if (id.length === 0) {
    throw new Error('buildHeroStreamEmbedUrl: üres stream-azonosító.')
  }
  // autoplay csak muted mellett engedélyezett a böngészőkben; controls=false,
  // loop, playsInline (mobil), és NINCS aláírás (publikus marketing-videó).
  const params = new URLSearchParams({
    autoplay: 'true',
    muted: 'true',
    loop: 'true',
    controls: 'false',
    preload: 'auto',
    playsinline: 'true',
  })
  return `https://iframe.cloudflarestream.com/${encodeURIComponent(id)}?${params.toString()}`
}

/** A Stream automatikus poszterképe (a videó első kockája / beállított thumbnail). */
export function buildHeroStreamPosterUrl(streamId: string): string {
  const id = streamId.trim()
  if (id.length === 0) {
    throw new Error('buildHeroStreamPosterUrl: üres stream-azonosító.')
  }
  return `https://videodelivery.net/${encodeURIComponent(id)}/thumbnails/thumbnail.jpg?time=0s&height=720`
}
