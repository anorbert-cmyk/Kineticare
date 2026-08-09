import type { Payload } from 'payload'

import type { User } from '../../payload-types'
import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import { CourseProgressError, markVideoWatched } from './mark-watched'

/**
 * POST /api/course-progress/mark-watched route-handler factory.
 *
 * A függőségek (Payload-példány) injektálva vannak, így a handler maga is
 * egységtesztelhető; a tényleges route az
 * src/app/(frontend)/api/course-progress/mark-watched/route.ts köti be a valódi
 * configgal (a src/lib/refund/route-handler.ts és a stream-token mintája).
 *
 * Folyamat: auth (payload.auth) → JSON-törzs → üzleti logika
 * (markVideoWatched) → { productId, videoRef, watchedAt, alreadyWatched }.
 *
 * Válasz-szerződés (a részletek: src/lib/course-progress/contract.ts):
 * - 200: sikeres jelölés VAGY idempotens ismétlés (`alreadyWatched: true`)
 * - 400: hibás törzs / a videoRef nem ehhez a kurzushoz tartozik
 * - 401: nincs bejelentkezve
 * - 403: nincs megvásárolva VAGY lejárt a hozzáférés
 * - 404: nincs ilyen elérhető kurzus
 * - 500: váratlan technikai hiba
 *
 * A felhasználónak MINDIG magyar üzenet megy; a technikai részlet kizárólag a
 * strukturált naplóba kerül, requestId-vel.
 */
export interface CourseProgressHandlerDeps {
  getPayload: () => Promise<Payload>
}

export function createMarkWatchedHandler(
  deps: CourseProgressHandlerDeps,
): (request: Request) => Promise<Response> {
  return async function POST(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'course-progress-mark-watched' })

    try {
      const payload = await deps.getPayload()

      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return Response.json(
          { error: 'A haladás rögzítéséhez bejelentkezés szükséges.' },
          { status: 401 },
        )
      }

      // A content-length fejléc hiányozhat (chunked átvitel, illetve a
      // tesztekben konstruált Requesteknél az undici nem tölti ki), ezért a
      // törzs beolvasása NEM függhet a fejléctől — a refund-handler mintája.
      let body: unknown = {}
      const rawBody = await request.text()
      if (rawBody.trim().length > 0) {
        try {
          body = JSON.parse(rawBody)
        } catch {
          return Response.json(
            { error: 'Érvénytelen kérés: a törzsnek JSON-nak kell lennie.' },
            { status: 400 },
          )
        }
      }
      const parsed = (body ?? {}) as { productId?: unknown; videoRef?: unknown }

      const result = await markVideoWatched({
        payload,
        user: user as User,
        productId: parsed.productId,
        videoRef: parsed.videoRef,
        logger: log,
      })

      return Response.json(result, { status: 200 })
    } catch (error) {
      if (error instanceof CourseProgressError) {
        log.warn('kurzus-haladás: üzleti hiba', { status: error.status, error: error.message })
        return Response.json({ error: error.message }, { status: error.status })
      }
      log.error('kurzus-haladás: váratlan technikai hiba', {
        error: error instanceof Error ? error.message : String(error),
      })
      return Response.json(
        { error: 'Váratlan hiba történt a haladás mentése közben. Kérjük, próbáld újra később.' },
        { status: 500 },
      )
    }
  }
}
