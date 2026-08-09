'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { markVideoWatched } from '../../lib/course-progress/client'
import { summarizeCourseProgress } from '../../lib/course-progress/progress'
import { playableStreamVideos, streamIframeSrc, streamVideoRef } from '../../lib/stream/contract'
import { fetchStreamToken } from '../../lib/stream-token-client'

/**
 * CoursePlayer — a kurzus lejátszója (epizódlista + Cloudflare Stream
 * player, signed token a GET /api/stream-token végpontról, token-frissítés
 * exp−5 percben — a lejátszás nem szakad meg, T-068).
 *
 * A token-kérés a videó STABIL azonosítóját küldi (a szerződés-modul
 * `streamVideoRef`-je), nem a sorszámát: az epizódlista a feldolgozás alatti
 * videókat kiszűri, így a sorszám a szerver teljes listájához képest
 * elcsúszna, és a vevő idegen (vagy hibás) videóra kapna jegyet.
 *
 * Haladás (E1): a már megnézett videók refjei a SZERVERTŐL érkeznek propként
 * (`watchedRefs`), a jelölés pedig a POST /api/course-progress/mark-watched
 * végpontra megy. A felület OPTIMISTA: a pipa azonnal megjelenik, és hiba
 * esetén visszagördül, magyar üzenettel az érintett epizód alatt. A visszavonás
 * (megnézett → nem megnézett) szándékosan nincs ebben a körben.
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
  /**
   * Lejárt hozzáférés esetén a kész, magyar üzenet (A1 — a szöveget a szerver
   * állítja elő az src/lib/course-access.ts-ből). null = nem lejárat miatt nincs
   * hozzáférés (pl. sosem vette meg).
   */
  expiredMessage?: string | null
  /**
   * A már megnézettként jelölt videók STABIL refjei (E1) — a szerver-komponens
   * tölti be a course-progress collectionből. Az orphan ref (időközben törölt
   * videó) itt is előfordulhat: a lista egyszerűen nem talál hozzá epizódot.
   */
  watchedRefs?: readonly string[]
}

/** A token-frissítés a lejárat előtt ennyivel korábban (másodperc). */
const TOKEN_REFRESH_BEFORE_EXPIRY_SEC = 300 // 5 perc

type PlayerState =
  | { kind: 'idle' }
  | { kind: 'loading'; videoIndex: number }
  | { kind: 'playing'; videoIndex: number; token: string; expiresAtEpochSec: number }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

/** A lejátszó-betöltő szignatúrája (a token-frissítés önhivatkozásához kell). */
type LoadVideo = (index: number, isRefresh?: boolean) => Promise<void>

export function CoursePlayer({
  expiredMessage = null,
  product,
  hasAccess,
  watchedRefs,
}: CoursePlayerProps) {
  const [state, setState] = useState<PlayerState>({ kind: 'idle' })
  const [activeIndex, setActiveIndex] = useState(0)
  /**
   * A megnézett refek KLIENS-oldali állapota. A kezdőérték a szerverről jön; az
   * optimista jelölés ezt bővíti, hiba esetén pedig visszavesz belőle. Új Set
   * készül minden változásnál — a meglévő állapotot sosem mutáljuk.
   */
  const [watched, setWatched] = useState<ReadonlySet<string>>(() => new Set(watchedRefs ?? []))
  /** Épp mentés alatt lévő refek — a gomb ilyenkor letiltva, dupla kattintás ellen. */
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set<string>())
  /** A legutóbbi sikertelen jelölés (ref + magyar üzenet) — az epizód alatt jelenik meg. */
  const [markError, setMarkError] = useState<{ ref: string; message: string } | null>(null)
  const refreshTimerRef = useRef<number | null>(null)
  /**
   * A token-frissítés `setTimeout`-ja korábban magát a `loadVideo` konstanst
   * hivatkozta a saját deklarációja ELŐTT (react-hooks/immutability): a
   * closure így örökre a létrehozáskori — időközben elavuló — változatot
   * tartotta. A ref mindig a LEGFRISSEBB `loadVideo`-ra mutat; a timer
   * legkorábban 30 mp múlva sül el, addig a lenti effekt már beállította.
   */
  const loadVideoRef = useRef<LoadVideo | null>(null)

  /**
   * Az epizódlista szűrése a szerverrel KÖZÖS segédfüggvénnyel — így a
   * lejátszó és a token-kiállítás nem tudja máshogy értelmezni, mi számít
   * lejátszható videónak.
   */
  const videos = useMemo(() => playableStreamVideos(product.videos), [product.videos])

  /**
   * „X/Y videó megnézve" — a JELENLEGI videólistához mérve (a közös, tesztelt
   * számítóval). A törölt videóra mutató (orphan) ref nem számít bele, és a
   * 0 videós kurzuson sincs osztás nullával.
   */
  const progress = useMemo(
    () => summarizeCourseProgress(product.videos, watched),
    [product.videos, watched],
  )

  /**
   * Optimista jelölés: a pipa azonnal látszik, a szerverhívás hibája esetén
   * visszagördül, és az epizód alatt magyar üzenet jelenik meg.
   */
  const markWatched = useCallback(
    async (videoRef: string) => {
      if (watched.has(videoRef) || pending.has(videoRef)) {
        return
      }
      setMarkError(null)
      setPending((previous) => new Set(previous).add(videoRef))
      setWatched((previous) => new Set(previous).add(videoRef))

      const result = await markVideoWatched({ productId: product.id, videoRef })

      setPending((previous) => {
        const next = new Set(previous)
        next.delete(videoRef)
        return next
      })
      if (result.kind !== 'ok') {
        setWatched((previous) => {
          const next = new Set(previous)
          next.delete(videoRef)
          return next
        })
        setMarkError({ ref: videoRef, message: result.message })
      }
    },
    [pending, product.id, watched],
  )

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
      const videoId = video ? streamVideoRef(video) : null
      if (!video || videoId === null) {
        setState({ kind: 'error', message: 'A videó jelenleg nem érhető el.' })
        return
      }

      if (!isRefresh) {
        setState({ kind: 'loading', videoIndex: index })
        setActiveIndex(index)
      }

      const result = await fetchStreamToken({
        productId: product.id,
        videoId,
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
      const expiresAtEpochSec = result.expiresAtEpochSec
      const nowSec = Math.floor(Date.now() / 1000)
      const refreshInSec = Math.max(
        30,
        expiresAtEpochSec - nowSec - TOKEN_REFRESH_BEFORE_EXPIRY_SEC,
      )

      refreshTimerRef.current = window.setTimeout(() => {
        void loadVideoRef.current?.(index, true)
      }, refreshInSec * 1000)

      setState({ kind: 'playing', videoIndex: index, token: result.token, expiresAtEpochSec })
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
        <h2>{expiredMessage === null ? 'Nincs hozzáférésed ehhez a kurzushoz' : 'Lejárt a hozzáférésed'}</h2>
        <p>
          {expiredMessage ??
            'A videók megtekintéséhez a kurzus megvásárlása szükséges. Ha már megvetted, jelentkezz be azzal a fiókkal, amellyel vásároltad.'}
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

  // A lejátszott epizód: a token ehhez a videóhoz szól, az iframe is ezt tölti.
  const playingVideo = state.kind === 'playing' ? videos[state.videoIndex] : undefined
  const playingIndex = state.kind === 'playing' ? state.videoIndex : -1
  const playingSrc =
    state.kind === 'playing' && playingVideo
      ? streamIframeSrc({
          customerCode: process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE,
          streamAssetId: playingVideo.streamAssetId,
          token: state.token,
        })
      : null

  return (
    <div className="kc-player">
      <h1>{product.title}</h1>
      <p className="kc-player__progress" role="status">
        {progress.label}
      </p>

      <div className="kc-player__layout">
        <div className="kc-player__stage">
          {state.kind === 'loading' ? (
            <div className="kc-player__loading" role="status">A videó betöltése…</div>
          ) : null}
          {playingSrc !== null && playingVideo ? (
            <iframe
              key={playingSrc}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="kc-player__frame"
              src={playingSrc}
              title={`${product.title} — ${playingVideo.title ?? `Rész ${playingIndex + 1}`}`}
            />
          ) : null}
          {state.kind === 'forbidden' ? (
            <div className="kc-player__error" role="alert">
              Nincs hozzáférésed ehhez a videóhoz.
            </div>
          ) : null}
          {/* A hiányzó customer-kód (playingSrc === null) ugyanide fut be:
              érvényes jegy mellett is némán törött iframe jönne belőle. */}
          {state.kind === 'unavailable' || (state.kind === 'playing' && playingSrc === null) ? (
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
              // A haladás-jelölés a videó STABIL refjével megy — ugyanaz az
              // azonosító, amit a lejátszási token is kap.
              const videoRef = streamVideoRef(video)
              const isWatched = videoRef !== null && watched.has(videoRef)
              const isPending = videoRef !== null && pending.has(videoRef)
              const errorMessage =
                videoRef !== null && markError?.ref === videoRef ? markError.message : null
              return (
                <li className="kc-player__episode-item" key={video.streamAssetId ?? index}>
                  <button
                    aria-current={isActive ? 'true' : undefined}
                    className="kc-player__episode"
                    onClick={() => void loadVideo(index)}
                    type="button"
                  >
                    <span className="kc-player__episode-title">
                      {isWatched ? (
                        <span aria-hidden="true" className="kc-player__episode-check">
                          ✓
                        </span>
                      ) : null}
                      {video.title ?? `Rész ${index + 1}`}
                    </span>
                    {video.durationSec ? (
                      <span className="kc-player__episode-duration">
                        {Math.floor(video.durationSec / 60)}:{String(video.durationSec % 60).padStart(2, '0')}
                      </span>
                    ) : null}
                  </button>
                  {videoRef === null ? null : isWatched ? (
                    <p className="kc-player__episode-watched">Megnézve</p>
                  ) : (
                    <Button
                      disabled={isPending}
                      onClick={() => void markWatched(videoRef)}
                      size="sm"
                      variant="secondary"
                    >
                      {isPending ? 'Mentés…' : 'Megjelölöm megnézettnek'}
                    </Button>
                  )}
                  {errorMessage === null ? null : (
                    <p className="kc-player__episode-error" role="alert">
                      {errorMessage}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </aside>
      </div>
    </div>
  )
}
