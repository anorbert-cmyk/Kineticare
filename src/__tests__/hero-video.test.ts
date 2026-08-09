import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { HeroVideo } from '../components/content/HeroVideo'
import {
  buildHeroStreamEmbedUrl,
  buildHeroStreamPosterUrl,
  HERO_VIDEO_STREAM_ID,
} from '../lib/hero-video'

/**
 * Hero-videó egységtesztek — URL-építés (Bunny publikus library iframe +
 * pull-zone poszter), a komponens poszter-renderje, és a hero-videó
 * konfigurációs állapota.
 *
 * MA a kezdőlapon NINCS Stream-videó: a HERO_VIDEO_STREAM_ID null, ezért a
 * HomeView a CMS heroImage-et rendereli; a nyitó filmsáv pedig LOKÁLIS
 * fájlokból dolgozik (src/components/blocks/FilmHero.tsx). Ez a modul a
 * későbbi bekapcsoláshoz készen áll.
 */

const STREAM_GUID = '00000000-1111-2222-3333-444444444444'
const LIBRARY_ID = '123456'
const PULL_ZONE_HOST = 'vz-abc123.b-cdn.net'

const savedEnv = {
  library: process.env.NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID,
  pullZone: process.env.NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST,
}

function withBunnyEnv(): void {
  process.env.NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID = LIBRARY_ID
  process.env.NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST = PULL_ZONE_HOST
}

function withoutBunnyEnv(): void {
  delete process.env.NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID
  delete process.env.NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST
}

afterEach(() => {
  for (const [key, value] of [
    ['NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID', savedEnv.library],
    ['NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST', savedEnv.pullZone],
  ] as const) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('buildHeroStreamEmbedUrl / buildHeroStreamPosterUrl', () => {
  it('az embed URL a Bunny iframe-hosztja, autoplay+muted+loop paraméterekkel', () => {
    withBunnyEnv()
    const url = buildHeroStreamEmbedUrl(STREAM_GUID)
    expect(url).toContain(`https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${STREAM_GUID}?`)
    expect(url).toContain('autoplay=true')
    expect(url).toContain('muted=true')
    expect(url).toContain('loop=true')
    expect(url).toContain('responsive=true')
    // A hero-videó PUBLIKUS: nincs jegy és nincs lejárat az URL-ben.
    expect(url).not.toContain('token=')
    expect(url).not.toContain('expires=')
  })

  it('a poszter a pull-zone thumbnail-végpontja', () => {
    withBunnyEnv()
    expect(buildHeroStreamPosterUrl(STREAM_GUID)).toBe(
      `https://${PULL_ZONE_HOST}/${STREAM_GUID}/thumbnail.jpg`,
    )
  })

  it('hiányzó Bunny-konfigurációnál null (nem törött URL)', () => {
    withoutBunnyEnv()
    expect(buildHeroStreamEmbedUrl(STREAM_GUID)).toBeNull()
    expect(buildHeroStreamPosterUrl(STREAM_GUID)).toBeNull()
  })

  it('üres stream-azonosítóra dob (elgépelés ne csendben működjön)', () => {
    withBunnyEnv()
    expect(() => buildHeroStreamEmbedUrl('   ')).toThrow()
    expect(() => buildHeroStreamPosterUrl('')).toThrow()
  })
})

describe('HeroVideo komponens', () => {
  it('SSR-ben a poszterkép renderelődik (az iframe kliens-oldali, matchMedia után)', () => {
    withBunnyEnv()
    const html = renderToStaticMarkup(createElement(HeroVideo, { streamId: STREAM_GUID }))
    // A markup a & → &amp; entitásrendszert használja — normalizálva vizsgáljuk.
    const normalized = html.replace(/&amp;/g, '&')
    expect(normalized).toContain(buildHeroStreamPosterUrl(STREAM_GUID) as string)
    expect(html).toContain('aria-hidden="true"')
    // A videó iframe SSR-ben NINCS (a matchMedia csak kliensen fut) — így a
    // reduced-motion és a böngésző-autoplay-szabályok tisztán érvényesülnek.
    expect(html).not.toContain('<iframe')
  })

  it('egyedi poszter-URL felülírja a Bunny-thumbnailt', () => {
    withBunnyEnv()
    const html = renderToStaticMarkup(
      createElement(HeroVideo, { streamId: STREAM_GUID, posterUrl: '/media/hero-poszter.webp' }),
    )
    expect(html).toContain('/media/hero-poszter.webp')
    expect(html).not.toContain('b-cdn.net')
  })

  it('hiányzó Bunny-konfigurációnál nincs törött <img> (a hero a hátterével jelenik meg)', () => {
    withoutBunnyEnv()
    const html = renderToStaticMarkup(createElement(HeroVideo, { streamId: STREAM_GUID }))
    expect(html).not.toContain('<img')
    expect(html).toContain('aria-hidden="true"')
  })

  it('a hero-videó konfiguráció alapból null (heroImage-fallback él)', () => {
    // Amíg a Bunny-feltöltés nem történik meg (docs/hero-video-feltoltes.md),
    // a konfigurált GUID null — a HomeView a CMS heroImage-et rendereli.
    expect(HERO_VIDEO_STREAM_ID).toBeNull()
  })
})
