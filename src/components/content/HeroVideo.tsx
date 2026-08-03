'use client'

import { useEffect, useState } from 'react'

import { buildHeroStreamEmbedUrl, buildHeroStreamPosterUrl } from '@/lib/hero-video'

/**
 * HeroVideo — a kezdőlap fejlécének animált, reszponzív háttérvideója
 * (Cloudflare Stream, PUBLIKUS marketing-tartalom).
 *
 * Viselkedés:
 * - A poszterkép azonnal megjelenik (a Stream thumbnails-végpontja), az
 *   iframe csak utána mountolódik — így nincs fehér vaku az oldalletöltéskor.
 * - autoplay + muted + loop + playsInline (a mobil autoplay-szabályoknak
 *   megfelelően), controls=false — tiszta háttérvideó, nem lejátszó.
 * - prefers-reduced-motion: a videó NEM töltődik le egyáltalán (az iframe
 *   nem mountol), csak a poszterkép — akadálymentesítés + sávsáv-takarékosság.
 * - Dekoratív elem: aria-hidden, nem fókuszolható; a hero szövege hordozza
 *   a tartalmat (nincs szükség feliratra/átiratra).
 */
export interface HeroVideoProps {
  streamId: string
  /** Egyedi poszter-URL felülírás (alapból a Stream 0. másodperces thumbnailje). */
  posterUrl?: string
  className?: string
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function HeroVideo({ streamId, posterUrl, className }: HeroVideoProps) {
  const poster = posterUrl ?? buildHeroStreamPosterUrl(streamId)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    const update = (): void => setShowVideo(!media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: 'var(--kc-radius-lg, 12px)',
        backgroundColor: 'var(--kc-tint, #ebf7ff)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a Stream-poszterkép külső CDN-URL, a next/image konfigurációja nincs rá felkészítve */}
      <img
        alt=""
        src={poster}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {showVideo ? (
        <iframe
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          src={buildHeroStreamEmbedUrl(streamId)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          tabIndex={-1}
          title="Kineticare hero-videó"
        />
      ) : null}
    </div>
  )
}
