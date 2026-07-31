import { createHmac } from 'node:crypto'

/**
 * Cloudflare Stream signed playback token (JWT) — tiszta, nulla extra
 * függőségű implementáció.
 *
 * Aláírási mód (a Cloudflare Stream dokumentációja szerint): a signed
 * playback token egy HS256 (HMAC-SHA256) aláírású JWT, amelynek titka a
 * Stream signing key (CF_STREAM_SIGNING_KEY). A header opcionálisan `kid`
 * mezőt is hordozhat (a signing key azonosítója, ha több kulcs él a
 * fiókban — CF_STREAM_SIGNING_KEY_ID). Ha a későbbiekben RSA (pem/jwk)
 * kulcspárra váltanánk, az alg RS256 lesz, és a HMAC helyett
 * `createSign('RSA-SHA256')` kell — a claim-szerkezet változatlan.
 *
 * Claim-szabályok (kötött):
 * - sub = a videó azonosítója (products.videos[].streamAssetId)
 * - nbf = a kiállítás másodperce (Unix epoch)
 * - exp = nbf + videóhossz (durationSec) + 10 perc türelem, de legfeljebb
 *   nbf + 24 óra (a Cloudflare signed tokenek élettartama amúgy is max.
 *   24 óra lehet).
 */

/** A videó végéhez adott türelemidő (másodperc): 10 perc. */
export const STREAM_TOKEN_GRACE_SECONDS = 600

/** A token maximális élettartama (másodperc): 24 óra. */
export const STREAM_TOKEN_MAX_TTL_SECONDS = 24 * 60 * 60

export interface StreamPlaybackTokenInput {
  /** A Cloudflare Stream asset azonosító (a JWT `sub` claimje). */
  videoId: string
  /** A videó hossza másodpercben (a products.videos[].durationSec mezőből). */
  durationSec: number
  /** A Stream signing key (HMAC-titok) — csak szerver-oldalon, ENV-ből. */
  signingKey: string
  /** Opcionális signing key azonosító (JWT `kid` header) több kulcs esetén. */
  keyId?: string | undefined
  /** Injektálható "most" a tesztelhetőségért; alapértelmezés: Date.now(). */
  now?: Date
}

export interface StreamPlaybackTokenResult {
  /** Az aláírt JWT (header.payload.signature, base64url). */
  token: string
  /** A `nbf` claim értéke (Unix epoch másodperc). */
  nbf: number
  /** Az `exp` claim értéke (Unix epoch másodperc). */
  exp: number
}

const base64urlJson = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')

/**
 * Aláírt lejátszási token kiállítása. Szándékosan szinkron és tiszta:
 * az üzleti szabályok (ki nézheti, melyik videót) a hívó felelőssége.
 *
 * @throws Error ha a bemenet formailag hibás (programozási hiba — a
 *   felhasználói hibaágakat a service-réteg kezeli).
 */
export function createStreamPlaybackToken(
  input: StreamPlaybackTokenInput,
): StreamPlaybackTokenResult {
  const videoId = typeof input.videoId === 'string' ? input.videoId.trim() : ''
  if (videoId.length === 0) {
    throw new Error('createStreamPlaybackToken: a videoId nem lehet üres.')
  }
  if (
    typeof input.durationSec !== 'number' ||
    !Number.isFinite(input.durationSec) ||
    input.durationSec < 0
  ) {
    throw new Error('createStreamPlaybackToken: a durationSec nem negatív szám kell legyen.')
  }
  if (typeof input.signingKey !== 'string' || input.signingKey.trim().length === 0) {
    throw new Error('createStreamPlaybackToken: a signingKey nem lehet üres.')
  }

  const nowMs = input.now instanceof Date ? input.now.getTime() : Date.now()
  const nbf = Math.floor(nowMs / 1000)
  const ttl = Math.min(
    Math.floor(input.durationSec) + STREAM_TOKEN_GRACE_SECONDS,
    STREAM_TOKEN_MAX_TTL_SECONDS,
  )
  const exp = nbf + ttl

  const header: Record<string, string> = { alg: 'HS256', typ: 'JWT' }
  if (typeof input.keyId === 'string' && input.keyId.trim().length > 0) {
    header.kid = input.keyId.trim()
  }
  const claims = { sub: videoId, nbf, exp }

  const signingInput = `${base64urlJson(header)}.${base64urlJson(claims)}`
  const signature = createHmac('sha256', input.signingKey).update(signingInput).digest('base64url')

  return { token: `${signingInput}.${signature}`, nbf, exp }
}
