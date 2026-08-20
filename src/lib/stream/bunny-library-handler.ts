import type { Payload } from 'payload'

import { hasStaffOrOwnerRole } from '../../access/roles'
import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import { listBunnyLibraryVideos, type BunnyLibraryKind } from './bunny-library'

/**
 * GET /api/admin/bunny-videos?library=protected|public — Bunny Stream
 * library-lista a munkatársaknak.
 *
 * RBAC: anon → 401, customer → 403, staff/owner → 200 vagy 503 (ha a
 * library nincs bekötve). Access-szabályt NEM ír át.
 *
 * A library API-kulcs SOSEM megy ki a válaszban. Tesztből a fetch
 * injektált, valódi hálózat nincs.
 */

export interface BunnyVideosHandlerDeps {
  getPayload: () => Promise<Payload>
  fetchImpl?: typeof fetch
}

function parseLibraryKind(value: string | null): BunnyLibraryKind {
  return value === 'public' ? 'public' : 'protected'
}

export function createBunnyVideosHandler(
  deps: BunnyVideosHandlerDeps,
): (request: Request) => Promise<Response> {
  return async function GET(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'admin-bunny-videos' })

    try {
      const payload = await deps.getPayload()
      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return Response.json(
          { error: 'A videótár megtekintéséhez bejelentkezés szükséges.' },
          { status: 401 },
        )
      }
      if (!hasStaffOrOwnerRole(user)) {
        log.warn('bunny-videos: jogosulatlan kísérlet (nem staff/owner szerepkör)', {
          userId: user.id,
          role: user.role ?? null,
        })
        return Response.json(
          { error: 'A videótár megtekintéséhez munkatársi vagy tulajdonosi jogosultság kell.' },
          { status: 403 },
        )
      }

      const url = new URL(request.url)
      const kind = parseLibraryKind(url.searchParams.get('library'))
      const search = url.searchParams.get('search')
      const result = await listBunnyLibraryVideos({
        fetchImpl: deps.fetchImpl ?? fetch,
        kind,
        search: search ?? undefined,
      })

      if (!result.ok) {
        const status = result.code === 'not-configured' ? 503 : 502
        return Response.json({ error: result.message, code: result.code }, { status })
      }

      return Response.json({
        library: result.list.kind,
        libraryId: result.list.libraryId,
        totalItems: result.list.totalItems,
        truncated: result.list.truncated,
        videos: result.list.videos,
      })
    } catch (error) {
      log.error('bunny-videos: váratlan hiba', {
        error: error instanceof Error ? error.message : String(error),
      })
      return Response.json(
        { error: 'A videótár most nem tölthető be. Próbáld újra később.' },
        { status: 500 },
      )
    }
  }
}
