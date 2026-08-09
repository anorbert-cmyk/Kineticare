import { type NextRequest, NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { logger } from '../logger'
import { checkRateLimit, getNamedRateLimiter, type RateLimiter } from '../rate-limit'
import { generateRequestId, getRequestId } from '../request-id'
import { issueStreamToken, StreamTokenError } from './issue-stream-token'

/**
 * GET /api/stream-token route-handler factory.
 *
 * A függőségek (Payload-példány) injektálva vannak, így a handler maga is
 * egységtesztelhető; a tényleges route az
 * src/app/(frontend)/api/stream-token/route.ts köti be a valódi configgal.
 *
 * Folyamat: auth (payload.auth) → rate-limit (per-user, 60/perc) →
 * query-validáció + paywall + token-kiállítás (issueStreamToken) →
 * { token, expiresAt }. Hibaágak: magyar felhasználói üzenet + technikai
 * részlet csak a naplóba, requestId-vel.
 */
export interface StreamTokenHandlerDeps {
  getPayload: () => Promise<Payload>
  /** Rate-limiter injektálható (teszt); alapból a megosztott streamToken singleton. */
  rateLimiter?: RateLimiter
}

export function createStreamTokenHandler(
  deps: StreamTokenHandlerDeps,
): (request: NextRequest) => Promise<Response> {
  const rateLimiter = deps.rateLimiter ?? getNamedRateLimiter('streamToken')

  return async function GET(request: NextRequest): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'stream-token' })

    try {
      const payload = await deps.getPayload()

      // Auth-kötelezett végpont: bejelentkezés nélkül nincs lejátszási token.
      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return NextResponse.json(
          { error: 'A videó lejátszásához bejelentkezés szükséges.' },
          { status: 401 },
        )
      }

      // RATE-LIMIT (per-user) — a normál lejátszó oldalbetöltésenként 1 tokent
      // kér; a limit a tokenfarmolás/lekérdezés-flood ellen szól.
      const limited = checkRateLimit({ limiter: rateLimiter, key: `user:${user.id}`, log })
      if (limited) {
        return limited
      }

      const { searchParams } = new URL(request.url)
      const videoIdParam = searchParams.get('videoId')

      const result = await issueStreamToken({
        payload,
        user,
        productId: searchParams.get('productId'),
        videoId: videoIdParam === null ? undefined : videoIdParam,
        logger: log,
      })

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      if (error instanceof StreamTokenError) {
        log.warn('stream-token: üzleti hiba', {
          status: error.status,
          error: error.message,
        })
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      log.error('stream-token: váratlan technikai hiba', {
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        {
          error:
            'Váratlan hiba történt a videó lejátszási token kiállítása közben. Kérjük, próbáld újra később.',
        },
        { status: 500 },
      )
    }
  }
}
