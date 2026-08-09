/**
 * A GET /api/stream-token végpont KÖZÖS szerződése — a kliens (böngésző) és a
 * szerver (route-handler + token-kiállítás) egyetlen közös forrása.
 *
 * Miért külön modul: a szerződés két oldala korábban külön-külön volt leírva,
 * és el is tért egymástól (a kliens `videoIndex`-et küldött, a szerver
 * `videoId`-t olvasott; a szerver ISO-8601 szöveget adott vissza, a kliens
 * számot várt). Mindkét eltérés a fizető vásárló lejátszását törte, és a
 * tesztek sem fogták meg, mert mindkét oldal a SAJÁT feltevését mockolta.
 * Ez a fájl környezet-független (nincs benne node: import, sem Payload),
 * ezért a kliens-komponensek és a szerver-oldali kód is importálhatja.
 *
 * Szerződés:
 * - Kérés:  GET /api/stream-token?productId=<szám>[&videoId=<stabil azonosító>]
 * - Válasz: 200 { token: string, expiresAt: string }  — `expiresAt` ISO-8601
 *   (UTC) időbélyeg. Szándékosan NEM szám: az ISO-alak önleíró, nem keverhető
 *   össze a másodperc/ezredmásodperc alakokkal, és a repó többi API-válaszával
 *   is egyezik. A kliens-oldali időaritmetikához a
 *   `parseStreamTokenResponseBody` egyszer, a határon váltja epoch
 *   másodpercre — a mértékegység a mező NEVÉBEN szerepel.
 */

/** A végpont útvonala. */
export const STREAM_TOKEN_PATH = '/api/stream-token'

/** A termékazonosító query-paraméterének neve. */
export const STREAM_TOKEN_PRODUCT_PARAM = 'productId'

/**
 * A videó STABIL azonosítójának query-paramétere. Nem sorszám: a lejátszható
 * (ready) videók sorszáma a feldolgozási állapottól függően elcsúszik, a
 * stabil azonosító nem.
 */
export const STREAM_TOKEN_VIDEO_PARAM = 'videoId'

/** A 200-as válasz törzse — a szerver ezt adja, a kliens ezt olvassa. */
export interface StreamTokenResponseBody {
  /** Az aláírt Cloudflare Stream lejátszási JWT. */
  token: string
  /** A token lejárata ISO-8601 (UTC) alakban. */
  expiresAt: string
}

/**
 * A `products.videos` sor minimális alakja, amennyit a lejátszási lánc
 * mindkét oldala ismer (a generált `Product['videos'][number]` és a lejátszó
 * `CourseVideo` típusa is ráilleszkedik).
 */
export interface StreamVideoLike {
  id?: string | null
  streamAssetId?: string | null
  status?: 'processing' | 'ready' | 'error' | null
}

/** A kliens-oldalra parse-olt válasz — a mértékegység a névben. */
export interface ParsedStreamToken {
  token: string
  /** A lejárat Unix epoch MÁSODPERCBEN (nem ezredmásodperc). */
  expiresAtEpochSec: number
}

const trimmed = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : ''

/**
 * A videó stabil azonosítója a token-kéréshez. Elsődlegesen a CMS-sor saját
 * `id`-ja (ez az EPIZÓDOT azonosítja, és túléli a médiafájl újratöltését),
 * másodlagosan a `streamAssetId`. A szerver mindkettőt elfogadja.
 *
 * @returns az azonosító, vagy null, ha a sor egyikkel sem rendelkezik.
 */
export function streamVideoRef(video: StreamVideoLike): string | null {
  const rowId = trimmed(video.id)
  if (rowId.length > 0) {
    return rowId
  }
  const assetId = trimmed(video.streamAssetId)
  return assetId.length > 0 ? assetId : null
}

/**
 * Lejátszható-e a videó: kész (`ready`) ÉS van Cloudflare-assetje. Ez a
 * feltétel EGY helyen van definiálva — a lejátszó epizódlistája és a szerver
 * alapértelmezett videóválasztása is ezt használja, így nem térhetnek el.
 */
export function isPlayableStreamVideo(video: StreamVideoLike): boolean {
  return video.status === 'ready' && trimmed(video.streamAssetId).length > 0
}

/** A lejátszható videók a CMS-beli sorrendben (a lejátszó epizódlistája). */
export function playableStreamVideos<T extends StreamVideoLike>(
  videos: readonly T[] | null | undefined,
): T[] {
  return Array.isArray(videos) ? videos.filter((video) => isPlayableStreamVideo(video)) : []
}

/**
 * A Cloudflare Stream iframe forrása a védett lejátszóhoz. A customer-
 * subdomain a NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE-ból jön (lazy, nem
 * induláskori kötelező ENV) — hiányában null, hogy a lejátszó a magyar
 * „nem érhető el" üzenetet mutassa a némán törött iframe helyett.
 */
export function streamIframeSrc(input: {
  customerCode: string | null | undefined
  streamAssetId: string | null | undefined
  token: string
}): string | null {
  const customerCode = trimmed(input.customerCode)
  const streamAssetId = trimmed(input.streamAssetId)
  const token = trimmed(input.token)
  if (customerCode.length === 0 || streamAssetId.length === 0 || token.length === 0) {
    return null
  }
  const host = `customer-${encodeURIComponent(customerCode)}.cloudflarestream.com`
  return `https://${host}/${encodeURIComponent(streamAssetId)}/iframe?token=${encodeURIComponent(token)}`
}

/** A token-kérés relatív URL-je — a kliens EZZEL építi a kérést. */
export function buildStreamTokenRequestUrl(input: {
  productId: number
  videoId?: string | null
}): string {
  const params = new URLSearchParams({
    [STREAM_TOKEN_PRODUCT_PARAM]: String(input.productId),
  })
  const videoId = trimmed(input.videoId)
  if (videoId.length > 0) {
    params.set(STREAM_TOKEN_VIDEO_PARAM, videoId)
  }
  return `${STREAM_TOKEN_PATH}?${params.toString()}`
}

/**
 * A 200-as válasz törzsének ellenőrzése és parse-olása. A lejárat itt, a
 * határon egyszer válik epoch másodpercre.
 *
 * @returns a parse-olt token, vagy null, ha a törzs nem felel meg a
 *   szerződésnek (a hívó ilyenkor általános hibaüzenetet mutat).
 */
export function parseStreamTokenResponseBody(body: unknown): ParsedStreamToken | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const candidate = body as { token?: unknown; expiresAt?: unknown }
  if (typeof candidate.token !== 'string' || candidate.token.length === 0) {
    return null
  }
  if (typeof candidate.expiresAt !== 'string') {
    return null
  }
  const expiresAtMs = Date.parse(candidate.expiresAt)
  if (!Number.isFinite(expiresAtMs)) {
    return null
  }
  return { token: candidate.token, expiresAtEpochSec: Math.floor(expiresAtMs / 1000) }
}
