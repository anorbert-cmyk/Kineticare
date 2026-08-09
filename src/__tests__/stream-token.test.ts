import { createHmac } from 'node:crypto'

import { NextRequest } from 'next/server'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Order, Product, User } from '../payload-types'
import { ACCESS_EXPIRED_TITLE } from '../lib/course-access'
import { issueStreamToken, StreamTokenError } from '../lib/stream/issue-stream-token'
import { createStreamTokenHandler } from '../lib/stream/route-handler'
import {
  createStreamPlaybackToken,
  STREAM_TOKEN_GRACE_SECONDS,
  STREAM_TOKEN_MAX_TTL_SECONDS,
} from '../lib/stream/token'

/**
 * /api/stream-token egységtesztek — mockolt Payload local API-val, az
 * src/__tests__/checkout-start.test.ts mintáját követve.
 */

// DUMMY érték, egyértelműen jelölve — NEM valódi Cloudflare Stream signing key.
const DUMMY_SIGNING_KEY = 'DUMMY-CF-STREAM-SIGNING-KEY-NEM-VALODI-TITOK'
const DUMMY_ASSET_ID = 'cf-stream-asset-abc123'

interface DecodedJwt {
  header: Record<string, unknown>
  claims: Record<string, unknown>
  signature: string
  signingInput: string
}

function decodeJwt(token: string): DecodedJwt {
  const parts = token.split('.')
  expect(parts).toHaveLength(3)
  const [headerPart, claimsPart, signature] = parts as [string, string, string]
  return {
    header: JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >,
    claims: JSON.parse(Buffer.from(claimsPart, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >,
    signature,
    signingInput: `${headerPart}.${claimsPart}`,
  }
}

function expectedSignature(signingInput: string): string {
  return createHmac('sha256', DUMMY_SIGNING_KEY).update(signingInput).digest('base64url')
}

const buyerUser = {
  id: 7,
  email: 'vevo@example.test',
  name: 'Minta Mari',
  role: 'customer',
  purchases: [42],
} as unknown as User

const nonBuyerUser = {
  ...buyerUser,
  id: 8,
  purchases: [],
} as unknown as User

interface ProductOverrides {
  status?: 'draft' | 'published' | 'archived'
  videos?: Product['videos']
  /** A1: a hozzáférés hossza napokban (üres = korlátlan). */
  accessDurationDays?: number | null
}

function makeProduct(overrides: ProductOverrides = {}): Product {
  return {
    id: 42,
    sku: 'KURZUS-ALAP',
    status: overrides.status ?? 'published',
    accessDurationDays: overrides.accessDurationDays ?? null,
    videos:
      overrides.videos !== undefined
        ? overrides.videos
        : [
            {
              id: 'sor-1',
              title: '1. lecke',
              streamAssetId: DUMMY_ASSET_ID,
              durationSec: 1800,
              status: 'ready',
            },
          ],
  } as unknown as Product
}

/** Paid rendelés-fixtúra a vásárlás időpontjához (az orders sémában nincs paidAt). */
function makePaidOrder(createdAt: string, productId = 42): Order {
  return {
    id: 1,
    status: 'paid',
    createdAt,
    updatedAt: createdAt,
    items: [{ id: 'sor-1', product: productId, quantity: 1 }],
  } as unknown as Order
}

interface MockPayloadOptions {
  authUser?: User | null
  product?: Product | null
  /** A vevő paid rendelései (A1 — a hozzáférés kezdőpontjának forrása). */
  orders?: Order[]
}

function createMockPayload(options: MockPayloadOptions = {}) {
  const payload = {
    auth: vi.fn(async () => ({
      user: options.authUser === undefined ? buyerUser : options.authUser,
    })),
    findByID: vi.fn(async () => {
      if (options.product === null) {
        throw new Error('Not Found')
      }
      return options.product ?? makeProduct()
    }),
    find: vi.fn(async () => ({ docs: options.orders ?? [] })),
  }
  return { payload: payload as unknown as Payload }
}

const savedEnv: Record<string, string | undefined> = {}

beforeAll(() => {
  for (const key of ['CF_STREAM_SIGNING_KEY', 'CF_STREAM_SIGNING_KEY_ID']) {
    savedEnv[key] = process.env[key]
  }
  process.env.CF_STREAM_SIGNING_KEY = DUMMY_SIGNING_KEY
  delete process.env.CF_STREAM_SIGNING_KEY_ID
})

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('createStreamPlaybackToken — JWT-szerkezet és élettartam', () => {
  it('HS256 JWT: sub = videoId, nbf = most, exp = nbf + videóhossz + 10 perc', () => {
    const now = new Date('2026-08-01T12:00:00.000Z')
    const result = createStreamPlaybackToken({
      videoId: DUMMY_ASSET_ID,
      durationSec: 1800,
      signingKey: DUMMY_SIGNING_KEY,
      now,
    })

    const decoded = decodeJwt(result.token)
    expect(decoded.header).toMatchObject({ alg: 'HS256', typ: 'JWT' })
    expect(decoded.claims.sub).toBe(DUMMY_ASSET_ID)

    const nbf = decoded.claims.nbf as number
    const exp = decoded.claims.exp as number
    expect(nbf).toBe(Math.floor(now.getTime() / 1000))
    expect(result.nbf).toBe(nbf)
    expect(result.exp).toBe(exp)
    expect(exp - nbf).toBe(1800 + STREAM_TOKEN_GRACE_SECONDS)
    expect(STREAM_TOKEN_GRACE_SECONDS).toBe(600)

    // Az aláírás HMAC-SHA256, a DUMMY kulccsal újraszámolva egyeznie kell.
    expect(decoded.signature).toBe(expectedSignature(decoded.signingInput))
  })

  it('24 órás clamp: nagyon hosszú videó esetén az élettartam max. 24 óra', () => {
    const result = createStreamPlaybackToken({
      videoId: DUMMY_ASSET_ID,
      durationSec: 48 * 60 * 60,
      signingKey: DUMMY_SIGNING_KEY,
      now: new Date('2026-08-01T12:00:00.000Z'),
    })

    expect(result.exp - result.nbf).toBe(STREAM_TOKEN_MAX_TTL_SECONDS)
    expect(STREAM_TOKEN_MAX_TTL_SECONDS).toBe(24 * 60 * 60)
  })

  it('0 másodperces videóhossz esetén is megmarad a 10 perces türelem', () => {
    const result = createStreamPlaybackToken({
      videoId: DUMMY_ASSET_ID,
      durationSec: 0,
      signingKey: DUMMY_SIGNING_KEY,
      now: new Date('2026-08-01T12:00:00.000Z'),
    })
    expect(result.exp - result.nbf).toBe(STREAM_TOKEN_GRACE_SECONDS)
  })

  it('keyId megadásakor a JWT header kid mezőt kap', () => {
    const withKid = createStreamPlaybackToken({
      videoId: DUMMY_ASSET_ID,
      durationSec: 60,
      signingKey: DUMMY_SIGNING_KEY,
      keyId: 'dummy-key-id',
    })
    expect(decodeJwt(withKid.token).header.kid).toBe('dummy-key-id')

    const withoutKid = createStreamPlaybackToken({
      videoId: DUMMY_ASSET_ID,
      durationSec: 60,
      signingKey: DUMMY_SIGNING_KEY,
    })
    expect(decodeJwt(withoutKid.token).header).not.toHaveProperty('kid')
  })

  it('hibás bemenetre (üres videoId / negatív hossz / üres kulcs) hibát dob', () => {
    expect(() =>
      createStreamPlaybackToken({ videoId: '', durationSec: 60, signingKey: DUMMY_SIGNING_KEY }),
    ).toThrowError(/videoId/)
    expect(() =>
      createStreamPlaybackToken({
        videoId: DUMMY_ASSET_ID,
        durationSec: -1,
        signingKey: DUMMY_SIGNING_KEY,
      }),
    ).toThrowError(/durationSec/)
    expect(() =>
      createStreamPlaybackToken({ videoId: DUMMY_ASSET_ID, durationSec: 60, signingKey: ' ' }),
    ).toThrowError(/signingKey/)
  })
})

describe('issueStreamToken — paywall és token-kiállítás', () => {
  it('vevő + published termék → érvényes JWT (sub = streamAssetId, exp−nbf = duration + 600)', async () => {
    const { payload } = createMockPayload()

    const result = await issueStreamToken({ payload, user: buyerUser, productId: 42 })

    const decoded = decodeJwt(result.token)
    expect(decoded.claims.sub).toBe(DUMMY_ASSET_ID)
    expect((decoded.claims.exp as number) - (decoded.claims.nbf as number)).toBe(
      1800 + STREAM_TOKEN_GRACE_SECONDS,
    )
    expect(decoded.signature).toBe(expectedSignature(decoded.signingInput))
    expect(result.expiresAt).toBe(new Date((decoded.claims.exp as number) * 1000).toISOString())
  })

  it('vevő + archived termék → tovább nézheti (200-szerű token)', async () => {
    const { payload } = createMockPayload({ product: makeProduct({ status: 'archived' }) })

    const result = await issueStreamToken({ payload, user: buyerUser, productId: 42 })

    expect(decodeJwt(result.token).claims.sub).toBe(DUMMY_ASSET_ID)
  })

  it('vevő + draft termék → 403 (draftot senki sem nézhet)', async () => {
    const { payload } = createMockPayload({ product: makeProduct({ status: 'draft' }) })

    const promise = issueStreamToken({ payload, user: buyerUser, productId: 42 })
    await expect(promise).rejects.toBeInstanceOf(StreamTokenError)
    await expect(promise).rejects.toMatchObject({ status: 403 })
    await expect(promise).rejects.toThrowError(/megvásárlása szükséges/)
  })

  it('A1 — időkorlát nélküli terméknél nem indul rendelés-lekérdezés (mai viselkedés)', async () => {
    const { payload } = createMockPayload()

    await issueStreamToken({ payload, user: buyerUser, productId: 42 })

    expect(payload.find).not.toHaveBeenCalled()
  })

  it('A1 — érvényes időkorlátos hozzáférés (a vásárlás óta még nem telt le) → token', async () => {
    const { payload } = createMockPayload({
      product: makeProduct({ accessDurationDays: 365 }),
      orders: [makePaidOrder(new Date().toISOString())],
    })

    const result = await issueStreamToken({ payload, user: buyerUser, productId: 42 })

    expect(decodeJwt(result.token).claims.sub).toBe(DUMMY_ASSET_ID)
    expect(payload.find).toHaveBeenCalledTimes(1)
  })

  it('A1 — LEJÁRT hozzáférés → 403, magyar üzenettel és a lejárat napjával', async () => {
    const { payload } = createMockPayload({
      product: makeProduct({ accessDurationDays: 30 }),
      orders: [makePaidOrder('2020-01-01T10:00:00.000Z')],
    })

    const promise = issueStreamToken({ payload, user: buyerUser, productId: 42 })
    await expect(promise).rejects.toBeInstanceOf(StreamTokenError)
    await expect(promise).rejects.toMatchObject({ status: 403 })
    await expect(promise).rejects.toThrowError(new RegExp(ACCESS_EXPIRED_TITLE))
    // 2020-01-01 + 30 nap — a vevő megtudja, mikor járt le a hozzáférése.
    await expect(promise).rejects.toThrowError(/2020\. 01\. 31\./)
  })

  it('A1 — időkorlátos termék paid rendelés nélkül (kézzel adott hozzáférés) → nem esik ki', async () => {
    const { payload } = createMockPayload({
      product: makeProduct({ accessDurationDays: 30 }),
      orders: [],
    })

    const result = await issueStreamToken({ payload, user: buyerUser, productId: 42 })

    expect(decodeJwt(result.token).claims.sub).toBe(DUMMY_ASSET_ID)
  })

  it('A1 — a lejárt hozzáférés a vásárlás-ellenőrzés UTÁN dől el (nem-vevő nem kap más üzenetet)', async () => {
    const { payload } = createMockPayload({
      authUser: nonBuyerUser,
      product: makeProduct({ accessDurationDays: 30 }),
      orders: [makePaidOrder('2020-01-01T10:00:00.000Z')],
    })

    const promise = issueStreamToken({ payload, user: nonBuyerUser, productId: 42 })
    await expect(promise).rejects.toThrowError(/megvásárlása szükséges/)
    expect(payload.find).not.toHaveBeenCalled()
  })

  it('nem-vevő → 403, és a termék lekérdezése MEG SEM történik (nincs létezés-szivárgás)', async () => {
    const { payload } = createMockPayload({ authUser: nonBuyerUser })

    const promise = issueStreamToken({ payload, user: nonBuyerUser, productId: 42 })
    await expect(promise).rejects.toMatchObject({ status: 403 })
    await expect(promise).rejects.toThrowError(/megvásárlása szükséges/)
    expect(payload.findByID).not.toHaveBeenCalled()
  })

  it('populate-olt purchases (Product-objektum) is érvényes vásárlásnak számít', async () => {
    const populatedBuyer = {
      ...buyerUser,
      purchases: [{ id: 42 } as Product],
    } as unknown as User
    const { payload } = createMockPayload()

    const result = await issueStreamToken({ payload, user: populatedBuyer, productId: '42' })
    expect(decodeJwt(result.token).claims.sub).toBe(DUMMY_ASSET_ID)
  })

  it('videoId-val a terméken belüli videó célozható (streamAssetId egyezés)', async () => {
    const product = makeProduct({
      videos: [
        {
          id: 'sor-1',
          title: '1. lecke',
          streamAssetId: 'elso-asset',
          durationSec: 600,
          status: 'ready',
        },
        {
          id: 'sor-2',
          title: '2. lecke',
          streamAssetId: 'masodik-asset',
          durationSec: 900,
          status: 'ready',
        },
      ],
    })
    const { payload } = createMockPayload({ product })

    const result = await issueStreamToken({
      payload,
      user: buyerUser,
      productId: 42,
      videoId: 'masodik-asset',
    })

    const decoded = decodeJwt(result.token)
    expect(decoded.claims.sub).toBe('masodik-asset')
    expect((decoded.claims.exp as number) - (decoded.claims.nbf as number)).toBe(
      900 + STREAM_TOKEN_GRACE_SECONDS,
    )
  })

  it('ismeretlen videoId → 404 magyar üzenettel', async () => {
    const { payload } = createMockPayload()
    const promise = issueStreamToken({
      payload,
      user: buyerUser,
      productId: 42,
      videoId: 'nincs-ilyen',
    })
    await expect(promise).rejects.toMatchObject({ status: 404 })
    await expect(promise).rejects.toThrowError(/videó nem található/)
  })

  it('feldolgozás alatti (nem ready) videó → 409 magyar üzenettel', async () => {
    const product = makeProduct({
      videos: [
        {
          id: 'sor-1',
          title: '1. lecke',
          streamAssetId: DUMMY_ASSET_ID,
          durationSec: 1800,
          status: 'processing',
        },
      ],
    })
    const { payload } = createMockPayload({ product })
    const promise = issueStreamToken({ payload, user: buyerUser, productId: 42 })
    await expect(promise).rejects.toMatchObject({ status: 409 })
    await expect(promise).rejects.toThrowError(/feldolgozása még folyamatban/)
  })

  it('érvénytelen productId → 400', async () => {
    const { payload } = createMockPayload()
    const promise = issueStreamToken({ payload, user: buyerUser, productId: 'abc' })
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/termékazonosító/)
  })

  it('hiányzó CF_STREAM_SIGNING_KEY → 503 magyar üzenettel (lazy ENV-ellenőrzés)', async () => {
    const original = process.env.CF_STREAM_SIGNING_KEY
    delete process.env.CF_STREAM_SIGNING_KEY
    try {
      const { payload } = createMockPayload()
      const promise = issueStreamToken({ payload, user: buyerUser, productId: 42 })
      await expect(promise).rejects.toMatchObject({ status: 503 })
      await expect(promise).rejects.toThrowError(/ideiglenesen nem érhető el/)
    } finally {
      process.env.CF_STREAM_SIGNING_KEY = original
    }
  })

  it('a megvásárolt, de törölt/nem létező termék → 404 (csak a vevő felé)', async () => {
    const { payload } = createMockPayload({ product: null })
    const promise = issueStreamToken({ payload, user: buyerUser, productId: 42 })
    await expect(promise).rejects.toMatchObject({ status: 404 })
    await expect(promise).rejects.toThrowError(/kurzus nem található/)
  })
})

describe('GET /api/stream-token route-handler', () => {
  const makeRequest = (query: string, headers: Record<string, string> = {}): NextRequest =>
    new NextRequest(`https://shop.example.test/api/stream-token${query}`, {
      method: 'GET',
      headers,
    })

  it('bejelentkezés nélkül → 401, magyar üzenettel', async () => {
    const { payload } = createMockPayload({ authUser: null })
    const GET = createStreamTokenHandler({ getPayload: async () => payload })

    const response = await GET(makeRequest('?productId=42'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'A videó lejátszásához bejelentkezés szükséges.',
    })
  })

  it('vevő + published termék → 200 { token, expiresAt }, a token dekódolható JWT', async () => {
    const { payload } = createMockPayload()
    const GET = createStreamTokenHandler({ getPayload: async () => payload })

    const response = await GET(makeRequest('?productId=42'))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { token: string; expiresAt: string }
    const decoded = decodeJwt(body.token)
    expect(decoded.claims.sub).toBe(DUMMY_ASSET_ID)
    expect((decoded.claims.exp as number) - (decoded.claims.nbf as number)).toBe(
      1800 + STREAM_TOKEN_GRACE_SECONDS,
    )
    expect(decoded.signature).toBe(expectedSignature(decoded.signingInput))
    expect(body.expiresAt).toBe(new Date((decoded.claims.exp as number) * 1000).toISOString())
  })

  it('nem-vevő → 403; a válasz nem árulja el, hogy a termék létezik-e', async () => {
    const { payload } = createMockPayload({ authUser: nonBuyerUser })
    const GET = createStreamTokenHandler({ getPayload: async () => payload })

    const response = await GET(makeRequest('?productId=42'))

    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('A videó megtekintéséhez a kurzus megvásárlása szükséges.')
    // Minimális információ: a 403-as törzs csak az egységes üzenetet tartalmazza.
    expect(Object.keys(body)).toEqual(['error'])
    expect(payload.findByID).not.toHaveBeenCalled()
  })

  it('A1 — lejárt hozzáférésű vevő → 403, a lejárat napját is tartalmazó magyar üzenettel', async () => {
    const { payload } = createMockPayload({
      product: makeProduct({ accessDurationDays: 30 }),
      orders: [makePaidOrder('2020-01-01T10:00:00.000Z')],
    })
    const GET = createStreamTokenHandler({ getPayload: async () => payload })

    const response = await GET(makeRequest('?productId=42', { 'x-request-id': 'teszt-keres-1' }))

    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain(ACCESS_EXPIRED_TITLE)
    expect(body.error).toContain('2020. 01. 31.')
    // A válasz továbbra is csak a felhasználói üzenetet hordozza.
    expect(Object.keys(body)).toEqual(['error'])
  })

  it('A1 — érvényes időkorlátos hozzáférésű vevő → 200', async () => {
    const { payload } = createMockPayload({
      product: makeProduct({ accessDurationDays: 365 }),
      orders: [makePaidOrder(new Date().toISOString())],
    })
    const GET = createStreamTokenHandler({ getPayload: async () => payload })

    const response = await GET(makeRequest('?productId=42'))

    expect(response.status).toBe(200)
  })

  it('hiányzó productId → 400', async () => {
    const { payload } = createMockPayload()
    const GET = createStreamTokenHandler({ getPayload: async () => payload })

    const response = await GET(makeRequest(''))

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('termékazonosító')
  })

  it('hiányzó signing key → 503 magyar üzenettel', async () => {
    const original = process.env.CF_STREAM_SIGNING_KEY
    delete process.env.CF_STREAM_SIGNING_KEY
    try {
      const { payload } = createMockPayload()
      const GET = createStreamTokenHandler({ getPayload: async () => payload })

      const response = await GET(makeRequest('?productId=42'))

      expect(response.status).toBe(503)
      const body = (await response.json()) as { error: string }
      expect(body.error).toContain('ideiglenesen nem érhető el')
    } finally {
      process.env.CF_STREAM_SIGNING_KEY = original
    }
  })

  it('váratlan technikai hiba → 500, általános magyar üzenettel (a részletek csak a naplóba)', async () => {
    const GET = createStreamTokenHandler({
      getPayload: async () => {
        throw new Error('DB-kapcsolat megszakadt')
      },
    })

    const response = await GET(makeRequest('?productId=42'))

    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('Váratlan hiba')
    expect(body.error).not.toContain('DB-kapcsolat')
  })
})
