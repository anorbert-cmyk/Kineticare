import { getPayload } from 'payload'

import { createBunnyVideosHandler } from '../../../../../lib/stream/bunny-library-handler'
import config from '../../../../../payload.config'

/**
 * GET /api/admin/bunny-videos — a Bunny Stream library videóinak listája
 * staff/owner számára. A feltöltés a Bunny felületén marad.
 */
export const GET = createBunnyVideosHandler({
  getPayload: () => getPayload({ config }),
})
