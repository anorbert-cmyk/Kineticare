import { describe, expect, it } from 'vitest'

import {
  buildContentSecurityPolicy,
  CLOUDFLARE_STREAM_WILDCARD_SOURCE,
  cloudflareStreamCustomerSource,
} from '../../lib/security/csp'

/**
 * CSP-regressziós tesztek (C2).
 *
 * A legfontosabb védendő hiba: a `https://customer-*.cloudflarestream.com`
 * alak ÉRVÉNYTELEN CSP-forrás (a joker csak a legbaloldalibb, TELJES címke
 * helyén állhat), amit a böngésző NÉMÁN eldob — a hiba csak a Cloudflare
 * Stream élesítésekor derülne ki, fekete lejátszó formájában. Böngészőben
 * bizonyítva: lásd docs/video-stream-keszenlet.md „A CSP-javítás bizonyítéka".
 */

/** A fejléc egy direktívájának forrásait adja vissza (a direktíva neve nélkül). */
function directive(csp: string, name: string): string[] {
  const found = csp.split('; ').find((entry) => entry === name || entry.startsWith(`${name} `))
  expect(found, `hiányzó direktíva: ${name}`).toBeDefined()
  return (found as string).split(' ').slice(1)
}

describe('cloudflareStreamCustomerSource', () => {
  it('fiókkód nélkül a SZABÁLYOS, egy címkés jokerre esik vissza', () => {
    expect(cloudflareStreamCustomerSource(undefined)).toBe(CLOUDFLARE_STREAM_WILDCARD_SOURCE)
    expect(cloudflareStreamCustomerSource('')).toBe(CLOUDFLARE_STREAM_WILDCARD_SOURCE)
    expect(cloudflareStreamCustomerSource('   ')).toBe(CLOUDFLARE_STREAM_WILDCARD_SOURCE)
  })

  it('ismert fiókkóddal a PONTOS hostot adja (joker nélkül)', () => {
    expect(cloudflareStreamCustomerSource('f33zs165nr7gyrs8')).toBe(
      'https://customer-f33zs165nr7gyrs8.cloudflarestream.com',
    )
    expect(cloudflareStreamCustomerSource('  abc123  ')).toBe(
      'https://customer-abc123.cloudflarestream.com',
    )
  })

  it('gyanús (nem alfanumerikus) env-értéket nem enged a fejlécbe — fejléc-injekció ellen', () => {
    for (const evil of ['abc; script-src *', 'abc def', 'abc.def', 'abc/def', '*']) {
      expect(cloudflareStreamCustomerSource(evil)).toBe(CLOUDFLARE_STREAM_WILDCARD_SOURCE)
    }
  })
})

describe('buildContentSecurityPolicy — a bizonyított hiba nem térhet vissza', () => {
  it('SEHOL nem szerepel az érvénytelen customer-* minta', () => {
    expect(buildContentSecurityPolicy()).not.toContain('customer-*')
    expect(buildContentSecurityPolicy('abc123')).not.toContain('customer-*')
  })

  it('a Stream hostja mindhárom érintett direktívában ott van', () => {
    const csp = buildContentSecurityPolicy()
    for (const name of ['frame-src', 'img-src', 'media-src']) {
      expect(directive(csp, name), name).toContain(CLOUDFLARE_STREAM_WILDCARD_SOURCE)
    }
  })

  it('fiókkóddal a pontos host kerül a három direktívába, joker nélkül', () => {
    const csp = buildContentSecurityPolicy('abc123')
    const exact = 'https://customer-abc123.cloudflarestream.com'
    for (const name of ['frame-src', 'img-src', 'media-src']) {
      expect(directive(csp, name), name).toContain(exact)
      expect(directive(csp, name), name).not.toContain(CLOUDFLARE_STREAM_WILDCARD_SOURCE)
    }
  })
})

describe('buildContentSecurityPolicy — direktívák', () => {
  const csp = buildContentSecurityPolicy()

  it('media-src blob: — enélkül a kezdőlap filmsávja (ScrollScrub) elhal', () => {
    expect(directive(csp, 'media-src')).toContain('blob:')
  })

  it('worker-src blob: — a PostHog session replay tömörítő workeréhez', () => {
    expect(directive(csp, 'worker-src')).toEqual(["'self'", 'blob:'])
  })

  it("connect-src 'self' — a PostHog a /ingest elsőfél-proxyn megy", () => {
    expect(directive(csp, 'connect-src')).toEqual(["'self'"])
  })

  it('script-src: Turnstile igen, Cloudflare Stream nem (az csak iframe)', () => {
    const sources = directive(csp, 'script-src')
    expect(sources).toContain('https://challenges.cloudflare.com')
    expect(sources.some((source) => source.includes('cloudflarestream.com'))).toBe(false)
  })

  it("script-src: 'unsafe-eval' TILOS (a Next.js inline bootstrap miatt csak 'unsafe-inline' kell)", () => {
    expect(directive(csp, 'script-src')).toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('frame-src: a hero-, a kurzus- és a szerkesztői videó-beágyazás hostjai', () => {
    const sources = directive(csp, 'frame-src')
    expect(sources).toContain('https://iframe.cloudflarestream.com')
    expect(sources).toContain('https://www.youtube-nocookie.com')
    expect(sources).toContain('https://player.vimeo.com')
    expect(sources).toContain('https://challenges.cloudflare.com')
  })

  it('a szigorító alapdirektívák megvannak', () => {
    expect(directive(csp, 'default-src')).toEqual(["'self'"])
    expect(directive(csp, 'object-src')).toEqual(["'none'"])
    expect(directive(csp, 'base-uri')).toEqual(["'self'"])
    expect(directive(csp, 'form-action')).toEqual(["'self'"])
    expect(directive(csp, 'frame-ancestors')).toEqual(["'self'"])
    expect(directive(csp, 'font-src')).toEqual(["'self'"])
  })

  it('a fejléc szintaktikailag ép: nincs üres vagy duplikált direktíva', () => {
    const names = csp.split('; ').map((entry) => entry.split(' ')[0])
    expect(names.every((name) => name.length > 0)).toBe(true)
    expect(new Set(names).size).toBe(names.length)
    expect(csp).not.toContain(';;')
    expect(csp.endsWith(';')).toBe(false)
  })
})
