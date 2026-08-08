import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import { EXIT_PREVIEW_PATH, hasControlCharacter } from './preview-target'

/**
 * Piszkozat-előnézetből való KILÉPÉS (`/next/exit-preview`).
 *
 * A `/next/preview` párja: az ott bekapcsolt Next draft mode-ot kapcsolja ki,
 * majd visszairányít arra az oldalra, ahonnan a szerkesztő kilépett. A
 * visszatérési útvonalat az előnézet-sáv linkje adja át query-paraméterként
 * (`buildExitPreviewHref`), így a kilépés után nem a kezdőlapon, hanem a
 * megnézett tartalomnál marad a szerkesztő.
 *
 * A handler függőség-injekcióval készül (a `/next/preview` mintájára), így a
 * Next-runtime nélkül is egységtesztelhető.
 */

/** A visszatérési útvonalat hordozó query-paraméter neve. */
export const RETURN_PATH_PARAM = 'vissza'

/** Kilépés után ide megyünk, ha nincs (vagy nem biztonságos) a visszatérési útvonal. */
const DEFAULT_RETURN_PATH = '/'

/**
 * A visszatérési útvonal ellenőrzése.
 *
 * CSAK azonos eredetű, gyökérből induló relatív útvonal engedélyezett: a
 * `//host` és a `/\host` alak a böngészőben külső címre mutatna (open redirect),
 * az abszolút URL pedig eleve idegen eredet. Minden gyanús értékre a kezdőlapra
 * esünk vissza — a kilépés így sosem visz ki idegen oldalra.
 */
export function sanitizeReturnPath(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_RETURN_PATH
  }
  const trimmed = value.trim()
  if (trimmed.length === 0 || hasControlCharacter(trimmed)) {
    return DEFAULT_RETURN_PATH
  }
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return DEFAULT_RETURN_PATH
  }
  return trimmed
}

/** Az előnézet-sáv „Kilépés az előnézetből" linkjének href-je. */
export function buildExitPreviewHref(currentPath: string): string {
  const params = new URLSearchParams({ [RETURN_PATH_PARAM]: sanitizeReturnPath(currentPath) })
  return `${EXIT_PREVIEW_PATH}?${params.toString()}`
}

export interface ExitPreviewHandlerDeps {
  /** A Next draft mode kikapcsolása (a route a next/headers draftMode()-ját adja át). */
  disableDraftMode: () => Promise<void>
}

export function createExitPreviewHandler(
  deps: ExitPreviewHandlerDeps,
): (request: Request) => Promise<Response> {
  return async function GET(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'exit-draft-preview' })

    const url = new URL(request.url)
    const target = sanitizeReturnPath(url.searchParams.get(RETURN_PATH_PARAM))

    // Jogosultság-ellenőrzés szándékosan NINCS: az előnézet KIkapcsolása nem ad
    // hozzáférést semmihez, csak elveszi a draft mode sütijét — a bejelentkezés
    // nélküli látogató amúgy sem tud előnézetet bekapcsolni (/next/preview: 403).
    await deps.disableDraftMode()
    log.info('Előnézet kikapcsolva', { target })

    // Szándékosan NEM Response.redirect(): az azzal létrehozott válasz fejlécei
    // csak olvashatók, így a Next nem tudná törölni rajta a draft mode sütijét.
    return new Response(null, {
      status: 307,
      headers: { Location: new URL(target, request.url).toString() },
    })
  }
}
