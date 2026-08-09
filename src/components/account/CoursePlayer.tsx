'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fetchStreamToken } from '../../lib/stream-token-client'

/**
 * CoursePlayer — a kurzus lejátszója (epizódlista + Cloudflare Stream
 * player, signed token a GET /api/stream-token végpontról, token-frissítés
 * exp−5 percben — a lejátszás nem szakad meg, T-068).
 */
export interface CourseVideo {
  id?: string
  title?: string
  streamAssetId?: string
  durationSec?: number
  status?: 'processing' | 'ready' | 'error'
}

export interface CoursePlayerProps {
  product: {
    id: number
    title: string
    videos: CourseVideo[]
  }
  hasAccess: boolean
}

/** A token-frissítés a lejárat előtt ennyivel korábban (másodperc). */
const TOKEN_REFRESH_BEFORE_EXPIRY_SEC = 300 // 5 perc

type PlayerState =
  | { kind: 'idle' }
  | { kind: 'loading'; videoIndex: number }
  | { kind: 'playing'; videoIndex: number; token: string; expiresAt: number }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

/** A lejátszó-betöltő szignatúrája (a token-frissítés önhivatkozásához kell). */
type LoadVideo = (index: number, isRefresh?: boolean) => Promise<void>

export function CoursePlayer({ product, hasAccess }: CoursePlayerProps) {
  const [state, setState] = useState<PlayerState>({ kind: 'idle' })
  const [activeIndex, setActiveIndex] = useState(0)
  const refreshTimerRef = useRef<number | null>(null)
  /**
   * A token-frissítés `setTimeout`-ja korábban magát a `loadVideo` konstanst
   * hivatkozta a saját deklarációja ELŐTT (react-hooks/immutability): a
   * closure így örökre a létrehozáskori — időközben elavuló — változatot
   * tartotta. A ref mindig a LEGFRISSEBB `loadVideo`-ra mutat; a timer
   * legkorábban 30 mp múlva sül el, addig a lenti effekt már beállította.
   */
  const loadVideoRef = useRef<LoadVideo | null>(null)

  const videos = product.videos.filter((video) => video.status === 'ready' && video.streamAssetId)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const loadVideo = useCallback<LoadVideo>(
    async (index, isRefresh = false) => {
      if (!hasAccess) {
        setState({ kind: 'forbidden' })
        return
      }
      const video = videos[index]
      if (!video || !video.streamAssetId) {
        setState({ kind: 'error', message: 'A videó jelenleg nem érhető el.' })
        return
      }

      if (!isRefresh) {
        setState({ kind: 'loading', videoIndex: index })
        setActiveIndex(index)
      }

      const result = await fetchStreamToken({
        productId: product.id,
        videoId: video.streamAssetId,
      })

      if (result.kind === 'forbidden') {
        setState({ kind: 'forbidden' })
        return
      }
      if (result.kind === 'unavailable') {
        setState({ kind: 'unavailable' })
        return
      }
      if (result.kind === 'error') {
        setState({ kind: 'error', message: result.message })
        return
      }

      clearRefreshTimer()
      // A szerver ISO 8601 lejáratot ad — a PlayerState és a refresh-timer
      // továbbra is unix másodpercben dolgozik.
      const expiresAt = Math.floor(Date.parse(result.expiresAt) / 1000)
      const nowSec = Math.floor(Date.now() / 1000)
      const refreshInSec = Math.max(30, expiresAt - nowSec - TOKEN_REFRESH_BEFORE_EXPIRY_SEC)

      refreshTimerRef.current = window.setTimeout(() => {
        void loadVideoRef.current?.(index, true)
      }, refreshInSec * 1000)

      setState({ kind: 'playing', videoIndex: index, token: result.token, expiresAt })
    },
    [hasAccess, product.id, videos, clearRefreshTimer],
  )

  // A ref mindig a legutóbbi renderben létrejött loadVideo-t tartja.
  useEffect(() => {
    loadVideoRef.current = loadVideo
  }, [loadVideo])

  // Mountkori automatikus indítás. A react-hooks/set-state-in-effect ezt a
  // hívást megjelöli (a `loadVideo` tranzitíven setState-et hív) — a szabály
  // erre a fájlra warn-ra van állítva az eslint.config.mjs-ben, indoklással.
  useEffect(() => {
    if (hasAccess && videos.length > 0 && state.kind === 'idle') {
      void loadVideo(0)
    }
    return clearRefreshTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess])

  if (!hasAccess) {
    return (
      <Card className="kc-player kc-player--forbidden">
        <h2>Nincs hozzáférésed ehhez a kurzushoz</h2>
        <p>
          A videók megtekintéséhez a kurzus megvásárlása szükséges. Ha már megvetted, jelentkezz
          be azzal a fiókkal, amellyel vásároltad.
        </p>
        <Button href={`/kurzusok/${product.id}`}>A kurzus megtekintése</Button>
      </Card>
    )
  }

  if (videos.length === 0) {
    return (
      <Card className="kc-player">
        <h2>{product.title}</h2>
        <p>A videók feltöltése és feldolgozása folyamatban van — nézz vissza hamarosan.</p>
      </Card>
    )
  }

  return (
    <div className="kc-player">
      <h1>{product.title}</h1>

      <div className="kc-player__layout">
        <div className="kc-player__stage">
          {state.kind === 'loading' ? (
            <div className="kc-player__loading" role="status">A videó betöltése…</div>
          ) : null}
          {state.kind === 'playing' ? (
            <iframe
              key={state.token}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="kc-player__frame"
              src={`https://customer-${process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE ?? ''}.cloudflarestream.com/${videos[state.videoIndex].streamAssetId}/iframe?token=${state.token}`}
              title={`${product.title} — ${videos[state.videoIndex].title ?? `Rész ${state.videoIndex + 1}`}`}
            />
          ) : null}
          {state.kind === 'forbidden' ? (
            <div className="kc-player__error" role="alert">
              Nincs hozzáférésed ehhez a videóhoz.
            </div>
          ) : null}
          {state.kind === 'unavailable' ? (
            <div className="kc-player__error" role="alert">
              A videólejátszás ideiglenesen nem érhető el. Próbáld később.
            </div>
          ) : null}
          {state.kind === 'error' ? (
            <div className="kc-player__error" role="alert">
              {state.message}
              <Button onClick={() => void loadVideo(activeIndex)} size="sm" variant="secondary">
                Újrapróbálom
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="kc-player__episodes">
          <h2>Részek</h2>
          <ol className="kc-player__episode-list">
            {videos.map((video, index) => {
              const isActive = index === activeIndex
              return (
                <li key={video.streamAssetId ?? index}>
                  <button
                    aria-current={isActive ? 'true' : undefined}
                    className="kc-player__episode"
                    onClick={() => void loadVideo(index)}
                    type="button"
                  >
                    <span className="kc-player__episode-title">
                      {video.title ?? `Rész ${index + 1}`}
                    </span>
                    {video.durationSec ? (
                      <span className="kc-player__episode-duration">
                        {Math.floor(video.durationSec / 60)}:{String(video.durationSec % 60).padStart(2, '0')}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>
      </div>
    </div>
  )
}
