/**
 * Bunny Stream library-lista — tiszta parser + injektálható HTTP-kliens.
 *
 * ═══ MIÉRT NEM TUS FELTÖLTÉS ═══
 * A feltöltés a Bunny felületén marad (a lányok ott töltik a felvételeket).
 * Ez a modul CSAK listáz: a szerkesztő a GUID-ot kimásolja a kurzus leckéjébe,
 * a vevő pedig a meglévő tokenes lejátszón nézi. Új npm-függőség nincs.
 *
 * ═══ AUTH ═══
 * A Stream API library-szintű `AccessKey` fejlécet kér — ez NEM a lejátszási
 * token-kulcs (`BUNNY_STREAM_TOKEN_AUTH_KEY`). A library API-kulcs a Bunny
 * Stream → a library → API oldalon van. Két library (védett kurzusvideók +
 * publikus előzetesek) két kulcs.
 *
 * Hivatalos lista-végpont:
 * GET https://video.bunnycdn.com/library/{libraryId}/videos
 * (docs.bunny.net Stream API — List Videos)
 *
 * A válasz mezői a gyakorlatban PascalCase ÉS camelCase alakban is előfordulnak;
 * a parser mindkettőt elfogadja.
 */

export const BUNNY_STREAM_API_ORIGIN = 'https://video.bunnycdn.com'

export const BUNNY_LIBRARY_API_KEY_ENV = 'BUNNY_STREAM_LIBRARY_API_KEY'
export const BUNNY_PUBLIC_LIBRARY_API_KEY_ENV = 'BUNNY_STREAM_PUBLIC_LIBRARY_API_KEY'

export type BunnyLibraryKind = 'protected' | 'public'

export interface BunnyLibraryVideo {
  guid: string
  title: string
  lengthSec: number | null
  status: number | null
  statusLabel: string
  dateUploaded: string | null
}

export interface BunnyLibraryList {
  kind: BunnyLibraryKind
  libraryId: string
  videos: BunnyLibraryVideo[]
  totalItems: number | null
  truncated: boolean
}

export type BunnyLibraryListResult =
  { ok: true; list: BunnyLibraryList } | { ok: false; code: BunnyLibraryErrorCode; message: string }

export type BunnyLibraryErrorCode =
  'not-configured' | 'unauthorized' | 'upstream' | 'invalid-response'

/** A Bunny Stream videó-státusz kódjai (VideoModel.status). */
const STATUS_LABELS: Record<number, string> = {
  0: 'Létrehozva',
  1: 'Feltöltve',
  2: 'Feldolgozás',
  3: 'Kódolás',
  4: 'Kész',
  5: 'Hiba',
  6: 'Feltöltés sikertelen',
}

export function bunnyVideoStatusLabel(status: number | null): string {
  if (status === null) {
    return 'Ismeretlen'
  }
  return STATUS_LABELS[status] ?? `Állapot ${String(status)}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

function readItems(payload: Record<string, unknown>): unknown[] {
  const items = payload.items ?? payload.Items
  return Array.isArray(items) ? items : []
}

export function parseBunnyLibraryVideo(value: unknown): BunnyLibraryVideo | null {
  const record = asRecord(value)
  if (record === null) {
    return null
  }
  const guid = readString(record, 'guid', 'Guid')
  if (guid === null) {
    return null
  }
  const status = readNumber(record, 'status', 'Status')
  const lengthSec = readNumber(record, 'length', 'Length')
  return {
    guid,
    title: readString(record, 'title', 'Title') ?? guid,
    lengthSec,
    status,
    statusLabel: bunnyVideoStatusLabel(status),
    dateUploaded: readString(record, 'dateUploaded', 'DateUploaded'),
  }
}

export function parseBunnyLibraryListPayload(
  payload: unknown,
  meta: { kind: BunnyLibraryKind; libraryId: string; truncated?: boolean },
): BunnyLibraryList | null {
  const record = asRecord(payload)
  if (record === null) {
    return null
  }
  const videos: BunnyLibraryVideo[] = []
  for (const item of readItems(record)) {
    const video = parseBunnyLibraryVideo(item)
    if (video !== null) {
      videos.push(video)
    }
  }
  return {
    kind: meta.kind,
    libraryId: meta.libraryId,
    videos,
    totalItems: readNumber(record, 'totalItems', 'TotalItems'),
    truncated: meta.truncated === true,
  }
}

function readEnv(name: string): string | null {
  const raw = typeof process.env[name] === 'string' ? process.env[name].trim() : ''
  return raw.length > 0 ? raw : null
}

export function readBunnyLibraryConfig(kind: BunnyLibraryKind): {
  libraryId: string
  apiKey: string
} | null {
  if (kind === 'protected') {
    const libraryId = readEnv('NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID')
    const apiKey = readEnv(BUNNY_LIBRARY_API_KEY_ENV)
    if (libraryId === null || apiKey === null) {
      return null
    }
    return { libraryId, apiKey }
  }
  const libraryId = readEnv('NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID')
  const apiKey = readEnv(BUNNY_PUBLIC_LIBRARY_API_KEY_ENV)
  if (libraryId === null || apiKey === null) {
    return null
  }
  return { libraryId, apiKey }
}

export interface ListBunnyLibraryVideosDeps {
  fetchImpl: typeof fetch
  kind: BunnyLibraryKind
  page?: number
  itemsPerPage?: number
  search?: string
}

const DEFAULT_PAGE_SIZE = 100
const MAX_PAGES = 5

export async function listBunnyLibraryVideos(
  deps: ListBunnyLibraryVideosDeps,
): Promise<BunnyLibraryListResult> {
  const config = readBunnyLibraryConfig(deps.kind)
  if (config === null) {
    return {
      ok: false,
      code: 'not-configured',
      message:
        deps.kind === 'protected'
          ? 'A védett videótár nincs bekötve. A Bunny library API-kulcsát és a library azonosítóját a szerver környezetében kell beállítani.'
          : 'A nyilvános videótár nincs bekötve. A publikus library API-kulcsát és a library azonosítóját a szerver környezetében kell beállítani.',
    }
  }

  const itemsPerPage = deps.itemsPerPage ?? DEFAULT_PAGE_SIZE
  const collected: BunnyLibraryVideo[] = []
  let totalItems: number | null = null
  let truncated = false
  const startPage = deps.page ?? 1
  const pagesToRead = deps.page !== undefined ? 1 : MAX_PAGES

  for (let offset = 0; offset < pagesToRead; offset += 1) {
    const page = startPage + offset
    const url = new URL(
      `/library/${encodeURIComponent(config.libraryId)}/videos`,
      BUNNY_STREAM_API_ORIGIN,
    )
    url.searchParams.set('page', String(page))
    url.searchParams.set('itemsPerPage', String(itemsPerPage))
    url.searchParams.set('orderBy', 'date')
    const search = deps.search?.trim()
    if (search) {
      url.searchParams.set('search', search)
    }

    let response: Response
    try {
      response = await deps.fetchImpl(url.toString(), {
        method: 'GET',
        headers: {
          AccessKey: config.apiKey,
          Accept: 'application/json',
        },
      })
    } catch {
      return {
        ok: false,
        code: 'upstream',
        message: 'A Bunny videótár most nem érhető el. Próbáld újra később.',
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: 'unauthorized',
        message:
          'A Bunny videótár kulcsa érvénytelen, vagy nem ehhez a libraryhez tartozik. Ellenőrizd a library API-kulcsát (nem a lejátszási tokent).',
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        code: 'upstream',
        message: 'A Bunny videótár most nem érhető el. Próbáld újra később.',
      }
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return {
        ok: false,
        code: 'invalid-response',
        message: 'A Bunny videótár válasza nem értelmezhető.',
      }
    }

    const parsed = parseBunnyLibraryListPayload(payload, {
      kind: deps.kind,
      libraryId: config.libraryId,
    })
    if (parsed === null) {
      return {
        ok: false,
        code: 'invalid-response',
        message: 'A Bunny videótár válasza nem értelmezhető.',
      }
    }
    collected.push(...parsed.videos)
    if (parsed.totalItems !== null) {
      totalItems = parsed.totalItems
    }
    if (parsed.videos.length < itemsPerPage) {
      truncated = false
      break
    }
    if (offset === pagesToRead - 1 && (totalItems === null || collected.length < totalItems)) {
      truncated = true
    }
  }

  return {
    ok: true,
    list: {
      kind: deps.kind,
      libraryId: config.libraryId,
      videos: collected,
      totalItems,
      truncated,
    },
  }
}
