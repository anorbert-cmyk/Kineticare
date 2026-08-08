import { draftMode } from 'next/headers'

import { createExitPreviewHandler } from '../../../../lib/preview/exit-preview'

/**
 * GET /next/exit-preview — a piszkozat-előnézetet kikapcsoló route.
 *
 * Az előnézet-sáv „Kilépés az előnézetből" linkje navigál ide (a href-et a
 * `buildExitPreviewHref` építi). A handler az src/lib/preview/exit-preview.ts-ben
 * él (függőség-injekcióval, egységtesztelhetően); itt csak a Next draft mode
 * bekötése történik.
 */
export const dynamic = 'force-dynamic'

export const GET = createExitPreviewHandler({
  disableDraftMode: async () => {
    const draft = await draftMode()
    draft.disable()
  },
})
