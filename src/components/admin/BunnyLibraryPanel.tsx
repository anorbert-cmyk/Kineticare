'use client'

import { useAuth } from '@payloadcms/ui'
import { useCallback, useState, type CSSProperties } from 'react'

import { hasStaffOrOwnerRole } from '../../access/roles'
import type { BunnyLibraryKind, BunnyLibraryVideo } from '../../lib/stream/bunny-library'

/**
 * Bunny videótár panel a kurzus szerkesztőlapján (UI-mező, nem tárol adatot).
 *
 * A feltöltés a Bunny dashboardon történik. Itt a libraryből behúzott lista
 * látszik: cím, hossz, állapot, GUID — a GUID a vágólapra másolható, és a
 * lecke „Videó azonosítója” mezőjébe illesztendő. A lejátszás a meglévő
 * tokenes embeden megy, vásárlónak és ingyenes kurzus nézőjének egyaránt.
 */

const REQUEST_TIMEOUT_MS = 20_000

const panelStyle: CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  marginBottom: 'var(--base)',
  padding: 'calc(var(--base) * 0.75)',
}

const noteStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  margin: 0,
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
  marginTop: 'calc(var(--base) * 0.5)',
}

const cellStyle: CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-100)',
  padding: '0.4rem 0.5rem 0.4rem 0',
  textAlign: 'left',
}

interface ListResponse {
  videos?: BunnyLibraryVideo[]
  truncated?: boolean
  error?: string
}

function readVideos(body: unknown): {
  videos: BunnyLibraryVideo[]
  error: string | null
  truncated: boolean
} {
  if (typeof body !== 'object' || body === null) {
    return { videos: [], error: 'A videótár válasza nem értelmezhető.', truncated: false }
  }
  const record = body as ListResponse
  if (typeof record.error === 'string' && record.error.trim().length > 0) {
    return { videos: [], error: record.error, truncated: false }
  }
  const videos = Array.isArray(record.videos) ? record.videos : []
  return { videos, error: null, truncated: record.truncated === true }
}

function formatLength(lengthSec: number | null): string {
  if (lengthSec === null || lengthSec <= 0) {
    return '—'
  }
  const minutes = Math.floor(lengthSec / 60)
  const seconds = lengthSec % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function BunnyLibraryPanel() {
  const { user } = useAuth<{ id: number | string; role?: string | null }>()
  const [kind, setKind] = useState<BunnyLibraryKind>('protected')
  const [videos, setVideos] = useState<BunnyLibraryVideo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copiedGuid, setCopiedGuid] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async (library: BunnyLibraryKind) => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(`/api/admin/bunny-videos?library=${library}`, {
        credentials: 'include',
        signal: controller.signal,
      })
      const body: unknown = await response.json().catch(() => null)
      const parsed = readVideos(body)
      if (!response.ok) {
        setVideos([])
        setError(parsed.error ?? 'A videótár most nem tölthető be. Próbáld újra később.')
        return
      }
      setVideos(parsed.videos)
      setTruncated(parsed.truncated)
      setLoaded(true)
    } catch {
      setVideos([])
      setError('Nem sikerült elérni a szervert. Ellenőrizd a kapcsolatot, és próbáld újra.')
    } finally {
      window.clearTimeout(timer)
      setLoading(false)
    }
  }, [])

  const copyGuid = useCallback(async (guid: string) => {
    try {
      await navigator.clipboard.writeText(guid)
      setCopiedGuid(guid)
    } catch {
      setCopiedGuid(null)
      setError('A másolás nem sikerült. Jelöld ki az azonosítót, és másold ki kézzel.')
    }
  }, [])

  if (!hasStaffOrOwnerRole(user)) {
    return null
  }

  return (
    <div className="field-type" style={panelStyle}>
      <h4 style={{ marginTop: 0 }}>Videók a Bunny tárból</h4>
      <p style={noteStyle}>
        A feltöltés a Bunny felületén történik. Itt a tárban lévő felvételek listája látszik. Másold
        ki a videó azonosítóját, illeszd a lecke „Videó azonosítója” mezőjébe, írd be a hosszt
        másodpercben, és állítsd „Kész”-re. Ettől a vásárló (és az ingyenes kurzus nézője) a meglévő
        lejátszón látja.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <label>
          Videótár{' '}
          <select
            value={kind}
            onChange={(event) => {
              const next = event.target.value === 'public' ? 'public' : 'protected'
              setKind(next)
            }}
          >
            <option value="protected">Védett (fizetős leckék)</option>
            <option value="public">Nyilvános (előzetes)</option>
          </select>
        </label>
        <button type="button" onClick={() => void load(kind)} disabled={loading}>
          {loading ? 'Betöltés…' : loaded ? 'Lista frissítése' : 'Lista betöltése'}
        </button>
      </div>
      {error ? (
        <p style={{ ...noteStyle, marginTop: '0.75rem' }} role="alert">
          {error}
        </p>
      ) : null}
      {truncated ? (
        <p style={{ ...noteStyle, marginTop: '0.75rem' }}>
          A lista csonka: a tárban több videó van, mint amennyit egyben megjelenítünk. Keresd a
          Bunny felületén a hiányzó címet, és másold ki onnan az azonosítót.
        </p>
      ) : null}
      {loaded && videos.length === 0 && error === null ? (
        <p style={{ ...noteStyle, marginTop: '0.75rem' }}>Ebben a tárban most nincs videó.</p>
      ) : null}
      {videos.length > 0 ? (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={cellStyle} scope="col">
                Cím
              </th>
              <th style={cellStyle} scope="col">
                Állapot
              </th>
              <th style={cellStyle} scope="col">
                Hossz
              </th>
              <th style={cellStyle} scope="col">
                Azonosító
              </th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.guid}>
                <th style={cellStyle} scope="row">
                  {video.title}
                </th>
                <td style={cellStyle}>{video.statusLabel}</td>
                <td style={cellStyle}>{formatLength(video.lengthSec)}</td>
                <td style={cellStyle}>
                  <code>{video.guid}</code>{' '}
                  <button type="button" onClick={() => void copyGuid(video.guid)}>
                    {copiedGuid === video.guid ? 'Kimásolva' : 'Másolás'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export default BunnyLibraryPanel
