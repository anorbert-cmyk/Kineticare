import { type NextRequest, NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import { STREAM_TOKEN_PRODUCT_PARAM, STREAM_TOKEN_VIDEO_PARAM } from './contract'
import { issueStreamToken, StreamTokenError } from './issue-stream-token'

/**
 * GET /api/stream-token route-handler factory.
 *
 * A függőségek (Payload-példány) injektálva vannak, így a handler maga is
 * egységtesztelhető; a tényleges route az
 * src/app/(frontend)/api/stream-token/route.ts köti be a valódi configgal.
 *
 * Folyamat: auth (payload.auth) → query-validáció + paywall + token-kiállítás
 * (issueStreamToken) → { token, expiresAt }. Hibaágak: magyar felhasználói
 * üzenet + technikai részlet csak a naplóba, requestId-vel.
 */
export interface StreamTokenHandlerDeps {
  getPayload: () => Promise<Payload>
}

export function createStreamTokenHandler(
  deps: StreamTokenHandlerDeps,
): (request: NextRequest) => Promise<NextResponse> {
  return async function GET(request: NextRequest): Promise<NextResponse> {
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

      // A query-paraméterek nevei a közös szerződés-modulból jönnek — a kliens
      // ugyanezekkel építi a kérést, így nem térhetnek el egymástól.
      const { searchParams } = new URL(request.url)
      const videoIdParam = searchParams.get(STREAM_TOKEN_VIDEO_PARAM)

      const result = await issueStreamToken({
        payload,
        user,
        productId: searchParams.get(STREAM_TOKEN_PRODUCT_PARAM),
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
