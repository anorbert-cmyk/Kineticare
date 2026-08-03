import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HeroVideo } from '../components/content/HeroVideo'
import {
  buildHeroStreamEmbedUrl,
  buildHeroStreamPosterUrl,
  HERO_VIDEO_STREAM_ID,
} from '../lib/hero-video'

/**
 * Hero-videó egységtesztek — URL-építés (Stream publikus iframe + poszter),
 * a komponens poszter-renderje, és a hero-videó konfigurációs állapota.
 */

const STREAM_ID = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

describe('buildHeroStreamEmbedUrl / buildHeroStreamPosterUrl', () => {
  it('az embed URL a Stream iframe-hosztja, autoplay+muted+loop+controls=false paraméterekkel', () => {
    const url = buildHeroStreamEmbedUrl(STREAM_ID)
    expect(url).toContain(`https://iframe.cloudflarestream.com/${STREAM_ID}?`)
    expect(url).toContain('autoplay=true')
    expect(url).toContain('muted=true')
    expect(url).toContain('loop=true')
    expect(url).toContain('controls=false')
    expect(url).toContain('playsinline=true')
  })

  it('a poszter a videodelivery.net thumbnails-végpontja', () => {
    const url = buildHeroStreamPosterUrl(STREAM_ID)
    expect(url).toBe(
      `https://videodelivery.net/${STREAM_ID}/thumbnails/thumbnail.jpg?time=0s&height=720`,
    )
  })

  it('üres stream-azonosítóra dob (elgépelés ne csendben működjön)', () => {
    expect(() => buildHeroStreamEmbedUrl('   ')).toThrow()
    expect(() => buildHeroStreamPosterUrl('')).toThrow()
  })
})

describe('HeroVideo komponens', () => {
  it('SSR-ben a poszterkép renderelődik (az iframe kliens-oldali, matchMedia után)', () => {
    const html = renderToStaticMarkup(createElement(HeroVideo, { streamId: STREAM_ID }))
    // A markup a & → &amp; entitásrendszert használja — normalizálva vizsgáljuk.
    const normalized = html.replace(/&amp;/g, '&')
    expect(normalized).toContain(buildHeroStreamPosterUrl(STREAM_ID))
    expect(html).toContain('aria-hidden="true"')
    // A videó iframe SSR-ben NINCS (a matchMedia csak kliensen fut) — így a
    // reduced-motion és a böngésző-autoplay-szabályok tisztán érvényesülnek.
    expect(html).not.toContain('<iframe')
  })

  it('egyedi poszter-URL felülírja a Stream-thumbnailt', () => {
    const html = renderToStaticMarkup(
      createElement(HeroVideo, { streamId: STREAM_ID, posterUrl: '/media/hero-poszter.webp' }),
    )
    expect(html).toContain('/media/hero-poszter.webp')
    expect(html).not.toContain('videodelivery.net')
  })

  it('a hero-videó konfiguráció alapból null (heroImage-fallback él)', () => {
    // Amíg a Stream-feltöltés nem történik meg (docs/hero-video-feltoltes.md),
    // a konfigurált ID null — a HomeView a CMS heroImage-et rendereli.
    expect(HERO_VIDEO_STREAM_ID).toBeNull()
  })
})
