import { NextRequest } from 'next/server'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { fetchStreamToken } from '../lib/stream-token-client'
import {
  parseStreamTokenResponseBody,
  playableStreamVideos,
  streamIframeSrc,
  streamVideoRef,
} from '../lib/stream/contract'
import { createStreamTokenHandler } from '../lib/stream/route-handler'
import type { Order, Product, User } from '../payload-types'

/**
 * A stream-token lánc SZERZŐDÉS-tesztje: a valódi kliens (fetchStreamToken)
 * a valódi szerverrel (route-handler + issueStreamToken) beszél, egy olyan
 * fetch-en keresztül, amely a kliens által épített URL-t adja át a
 * route-handlernek, és annak IGAZI válaszát adja vissza.
 *
 * Miért kell: a korábbi tesztek külön-külön mockolták a két oldalt (a
 * kliens-teszt számot mockolt `expiresAt`-nek, a szerver-teszt ISO-szöveget
 * várt), így két, egymásnak ELLENTMONDÓ feltevést rögzítettek, és a valós
 * lánc törése (a fizető vevő sem tudott lejátszani) átcsúszott rajtuk.
 *
 * A paywall (vásárlás-ellenőrzés, lejárat) itt csak regresszió-őrként
 * szerepel — a szabályok forrása változatlanul az src/lib/course-access*.
 */

// DUMMY érték, egyértelműen jelölve — NEM valódi Cloudflare Stream signing key.
const DUMMY_SIGNING_KEY = 'DUMMY-CF-STREAM-SIGNING-KEY-NEM-VALODI-TITOK'

const buyerUser = {
  id: 7,
  email: 'vevo@example.test',
  role: 'customer',
  purchases: [42],
} as unknown as User

const nonBuyerUser = { ...buyerUser, id: 8, purchases: [] } as unknown as User

function decodeClaims(token: string): Record<string, unknown> {
  const parts = token.split('.')
  expect(parts).toHaveLength(3)
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>
}

type VideoRow = NonNullable<Product['videos']>[number]

const readyVideo = (id: string, streamAssetId: string, durationSec = 600): VideoRow => ({
  id,
  title: `${id} lecke`,
  streamAssetId,
  durationSec,
  status: 'ready',
})

function makeProduct(videos: VideoRow[], accessDurationDays: number | null = null): Product {
  return {
    id: 42,
    sku: 'KURZUS-ALAP',
    status: 'published',
    accessDurationDays,
    videos,
  } as unknown as Product
}

function makePaidOrder(createdAt: string): Order {
  return {
    id: 1,
    status: 'paid',
    createdAt,
    updatedAt: createdAt,
    items: [{ id: 'sor-1', product: 42, quantity: 1 }],
  } as unknown as Order
}

interface HarnessOptions {
  product?: Product
  user?: User | null
  orders?: Order[]
}

/**
 * A kliens és a szerver összekötése: a `fetchStreamToken` által épített
 * relatív URL-ből NextRequest lesz, a válasz pedig a route-handler valódi
 * NextResponse-a — semmit nem mockolunk a szerződésből.
 */
function createHarness(options: HarnessOptions = {}) {
  const requestedUrls: string[] = []
  const payload = {
    auth: vi.fn(async () => ({
      user: options.user === undefined ? buyerUser : options.user,
    })),
    findByID: vi.fn(
      async () => options.product ?? makeProduct([readyVideo('sor-1', 'elso-asset')]),
    ),
    find: vi.fn(async () => ({ docs: options.orders ?? [] })),
  } as unknown as Payload

  const GET = createStreamTokenHandler({ getPayload: async () => payload })

  const fetchImpl: typeof fetch = async (input) => {
    const requested =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    requestedUrls.push(requested)
    const url = new URL(requested, 'https://shop.example.test')
    return await GET(new NextRequest(url.toString(), { method: 'GET' }))
  }

  return { fetchImpl, payload, requestedUrls }
}

const savedSigningKey: { value: string | undefined } = { value: undefined }

beforeAll(() => {
  savedSigningKey.value = process.env.CF_STREAM_SIGNING_KEY
  process.env.CF_STREAM_SIGNING_KEY = DUMMY_SIGNING_KEY
})

afterAll(() => {
  if (savedSigningKey.value === undefined) {
    delete process.env.CF_STREAM_SIGNING_KEY
  } else {
    process.env.CF_STREAM_SIGNING_KEY = savedSigningKey.value
  }
})

describe('stream-token szerződés — a kliens a szerver VALÓDI válaszát dolgozza fel', () => {
  it('a vevő jegyet kap, és a lejárat epoch másodpercként áll elő a JWT exp claimjéből', async () => {
    const { fetchImpl } = createHarness()

    const result = await fetchStreamToken({ productId: 42 }, fetchImpl)

    expect(result.kind).toBe('token')
    if (result.kind !== 'token') {
      return
    }
    const claims = decodeClaims(result.token)
    expect(claims.sub).toBe('elso-asset')
    // A kliens időaritmetikája (frissítés exp−5 percben) epoch MÁSODPERCET vár.
    expect(result.expiresAtEpochSec).toBe(claims.exp)
    expect(result.expiresAtEpochSec).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('a 2. epizód jegye a 2. epizód assetjére szól (stabil azonosító, nem sorszám)', async () => {
    const product = makeProduct([
      readyVideo('sor-1', 'elso-asset'),
      readyVideo('sor-2', 'masodik-asset', 900),
    ])
    const { fetchImpl, requestedUrls } = createHarness({ product })

    // Amit a lejátszó tesz: a KÖZÖS segédfüggvénnyel szűrt listából a 2. elem
    // stabil azonosítóját küldi.
    const episodes = playableStreamVideos(product.videos)
    const result = await fetchStreamToken(
      { productId: 42, videoId: streamVideoRef(episodes[1]) },
      fetchImpl,
    )

    expect(requestedUrls[0]).toContain('videoId=sor-2')
    expect(requestedUrls[0]).not.toContain('videoIndex')
    expect(result.kind).toBe('token')
    if (result.kind !== 'token') {
      return
    }
    expect(decodeClaims(result.token).sub).toBe('masodik-asset')
  })

  it('feldolgozás alatti epizód nem csúsztatja el a jegyet (sorszám-független azonosítás)', async () => {
    const processing: VideoRow = {
      id: 'sor-0',
      title: 'Bevezető',
      streamAssetId: 'feldolgozas-alatti-asset',
      durationSec: 300,
      status: 'processing',
    }
    const product = makeProduct([
      processing,
      readyVideo('sor-1', 'elso-asset'),
      readyVideo('sor-2', 'masodik-asset', 900),
    ])
    const { fetchImpl } = createHarness({ product })

    const episodes = playableStreamVideos(product.videos)
    expect(episodes).toHaveLength(2)
    // A lejátszó listáján a 2. epizód a "masodik-asset"; a TELJES listában
    // ugyanez az 1-es index még az "elso-asset" lenne — a sorszám elcsúszik.
    const fullList = product.videos ?? []
    expect(fullList[1]?.streamAssetId).toBe('elso-asset')

    const result = await fetchStreamToken(
      { productId: 42, videoId: streamVideoRef(episodes[1]) },
      fetchImpl,
    )

    expect(result.kind).toBe('token')
    if (result.kind !== 'token') {
      return
    }
    expect(decodeClaims(result.token).sub).toBe('masodik-asset')
  })

  it('a szerver a streamAssetId-t is elfogadja azonosítóként (sor-id nélküli sor)', async () => {
    const product = makeProduct([
      { title: 'Egyetlen lecke', streamAssetId: 'csak-asset', durationSec: 120, status: 'ready' },
    ])
    const { fetchImpl, requestedUrls } = createHarness({ product })

    const episodes = playableStreamVideos(product.videos)
    const result = await fetchStreamToken(
      { productId: 42, videoId: streamVideoRef(episodes[0]) },
      fetchImpl,
    )

    expect(requestedUrls[0]).toContain('videoId=csak-asset')
    expect(result.kind).toBe('token')
    if (result.kind !== 'token') {
      return
    }
    expect(decodeClaims(result.token).sub).toBe('csak-asset')
  })

  it('ismeretlen videó-azonosító → a kliens általános hibaüzenetet ad (szerver 404)', async () => {
    const { fetchImpl } = createHarness()

    const result = await fetchStreamToken({ productId: 42, videoId: 'nincs-ilyen' }, fetchImpl)

    expect(result.kind).toBe('error')
  })

  it('nem-vevő → forbidden (a paywall változatlan)', async () => {
    const { fetchImpl, payload } = createHarness({ user: nonBuyerUser })

    const result = await fetchStreamToken({ productId: 42 }, fetchImpl)

    expect(result).toEqual({ kind: 'forbidden' })
    expect(payload.findByID).not.toHaveBeenCalled()
  })

  it('lejárt hozzáférésű vevő → forbidden (az A1 lejárat-szabály érintetlen)', async () => {
    const { fetchImpl } = createHarness({
      product: makeProduct([readyVideo('sor-1', 'elso-asset')], 30),
      orders: [makePaidOrder('2020-01-01T10:00:00.000Z')],
    })

    const result = await fetchStreamToken({ productId: 42 }, fetchImpl)

    expect(result).toEqual({ kind: 'forbidden' })
  })

  it('hiányzó CF signing key → unavailable (a szerver 503-a)', async () => {
    const original = process.env.CF_STREAM_SIGNING_KEY
    delete process.env.CF_STREAM_SIGNING_KEY
    try {
      const { fetchImpl } = createHarness()
      const result = await fetchStreamToken({ productId: 42 }, fetchImpl)
      expect(result).toEqual({ kind: 'unavailable' })
    } finally {
      process.env.CF_STREAM_SIGNING_KEY = original
    }
  })
})

describe('parseStreamTokenResponseBody — a válasz-szerződés egyetlen olvasója', () => {
  it('ISO-8601 expiresAt → epoch másodperc', () => {
    const parsed = parseStreamTokenResponseBody({
      token: 'jwt.abc',
      expiresAt: '2026-08-01T12:10:00.000Z',
    })
    expect(parsed).toEqual({
      token: 'jwt.abc',
      expiresAtEpochSec: Math.floor(Date.parse('2026-08-01T12:10:00.000Z') / 1000),
    })
  })

  it('szám alakú expiresAt-et NEM fogad el (a régi, hibás kliens-feltevés)', () => {
    expect(parseStreamTokenResponseBody({ token: 'jwt.abc', expiresAt: 1785588000 })).toBeNull()
  })

  it('értelmezhetetlen vagy hiányzó mezők → null', () => {
    expect(parseStreamTokenResponseBody({ token: 'jwt.abc', expiresAt: 'tegnap' })).toBeNull()
    expect(parseStreamTokenResponseBody({ token: 'jwt.abc' })).toBeNull()
    expect(parseStreamTokenResponseBody({ expiresAt: '2026-08-01T12:10:00.000Z' })).toBeNull()
    expect(parseStreamTokenResponseBody(null)).toBeNull()
  })
})

describe('streamIframeSrc — a lejátszó beágyazási URL-je', () => {
  it('customer-kóddal érvényes, kódolt URL-t ad', () => {
    const src = streamIframeSrc({
      customerCode: 'abc123',
      streamAssetId: 'elso-asset',
      token: 'jwt.abc',
    })
    expect(src).toBe('https://customer-abc123.cloudflarestream.com/elso-asset/iframe?token=jwt.abc')
    expect(new URL(src as string).origin).toBe('https://customer-abc123.cloudflarestream.com')
  })

  it('hiányzó customer-kód / asset / token esetén null (nem némán törött iframe)', () => {
    expect(
      streamIframeSrc({ customerCode: undefined, streamAssetId: 'elso-asset', token: 'jwt.abc' }),
    ).toBeNull()
    expect(streamIframeSrc({ customerCode: ' ', streamAssetId: 'a', token: 'jwt.abc' })).toBeNull()
    expect(streamIframeSrc({ customerCode: 'abc123', streamAssetId: '', token: 'x' })).toBeNull()
    expect(
      streamIframeSrc({ customerCode: 'abc123', streamAssetId: 'elso-asset', token: '' }),
    ).toBeNull()
  })

  it('a hoszt nem tágítható idegen originre (a kód és az asset kódolva megy)', () => {
    const src = streamIframeSrc({
      customerCode: 'abc/@evil.example',
      streamAssetId: '../szoke',
      token: 'jwt.abc',
    })
    expect(src).toBe(
      'https://customer-abc%2F%40evil.example.cloudflarestream.com/..%2Fszoke/iframe?token=jwt.abc',
    )
    // A hoszt-részbe nem szivárog nyers '/' vagy '@', amivel más originre
    // lehetne mutatni; a mögötte álló útvonal sem léphet ki a mappából.
    const authority = (src as string).slice('https://'.length).split('/')[0]
    expect(authority).toBe('customer-abc%2F%40evil.example.cloudflarestream.com')
    expect(authority).not.toContain('@')
  })
})
