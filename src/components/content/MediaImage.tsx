import Image from 'next/image'

import {
  buildMediaSrcSet,
  mediaAlt,
  mediaDimensions,
  pickMediaUrl,
  type MediaLike,
} from './media-url'

/**
 * MediaImage — Media collectionbeli kép reszponzív renderelése.
 *
 * A Media xs/sm/md/lg méretei alapján srcSet-et és intrinsic méreteket ad,
 * a preferált méret hiányában az eredeti képre esik vissza. Alt kötelező a
 * sémában; hiányában dekoratívként (alt="") renderel, fejlesztői figyelmeztetéssel.
 */
export interface MediaImageProps {
  media: MediaLike
  preferredSize?: string
  priority?: boolean
  sizes?: string
  className?: string
}

export function MediaImage({ media, preferredSize, priority, sizes, className }: MediaImageProps) {
  const src = pickMediaUrl(media, preferredSize)
  if (!src) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MediaImage] Nincs elérhető kép-URL a médiában.')
    }
    return null
  }

  const alt = mediaAlt(media)
  if (process.env.NODE_ENV !== 'production' && alt.trim().length === 0) {
    console.warn('[MediaImage] Hiányzó alt-szöveg — a Media sémában kötelező; ellenőrizd az adatot.')
  }

  const srcSet = buildMediaSrcSet(media)
  const dimensions = mediaDimensions(media, preferredSize)

  return (
    <Image
      src={src}
      alt={alt}
      width={dimensions?.width}
      height={dimensions?.height}
      sizes={sizes}
      priority={priority}
      className={className}
      {...(srcSet ? { srcSet } : {})}
    />
  )
}
