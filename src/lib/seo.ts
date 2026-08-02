import type { Metadata } from 'next'

import type { Media, Page, Post } from '../payload-types'

/**
 * Storefront SEO-segédek — a pages/posts meta-fallbacklánca egy helyen.
 *
 * Fallback-szabályok (a hullám-követelmény szerint):
 * - title:        seoTitle → title
 * - description:  seoDescription → excerpt → (a keret-layout alap-leírása)
 * - og:image:     ogImage (og-méret) → ogImage (eredeti) → heroImage (og-méret)
 *                 → heroImage (eredeti) → nincs og:image
 *
 * A canonical/relativ URL-ek a NEXT_PUBLIC_SERVER_URL-ből abszolutálódnak
 * (a keret-layout metadataBase-e ezt a gyökeret használja).
 */

type SeoDoc = Pick<Page, 'title' | 'excerpt' | 'seoTitle' | 'seoDescription' | 'ogImage' | 'heroImage'>

export const SITE_NAME = 'Kineticare'
export const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

/** Relatív útvonal → abszolút URL (JSON-LD-hez és og:image-höz). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const base = SITE_URL.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function resolveSeoTitle(doc: SeoDoc): string {
  const seoTitle = typeof doc.seoTitle === 'string' ? doc.seoTitle.trim() : ''
  return seoTitle.length > 0 ? seoTitle : doc.title
}

export function resolveSeoDescription(doc: SeoDoc): string | undefined {
  const seoDescription = typeof doc.seoDescription === 'string' ? doc.seoDescription.trim() : ''
  if (seoDescription.length > 0) {
    return seoDescription
  }
  const excerpt = typeof doc.excerpt === 'string' ? doc.excerpt.trim() : ''
  return excerpt.length > 0 ? excerpt : undefined
}

function isMedia(value: unknown): value is Media {
  return typeof value === 'object' && value !== null && 'url' in value
}

/** og:image URL feloldása: og-méret előnyben, aztán az eredeti fájl. */
function mediaOgUrl(media: Media | null | undefined): string | undefined {
  if (!media) return undefined
  const sized = media.sizes?.og?.url
  if (typeof sized === 'string' && sized.length > 0) return absoluteUrl(sized)
  if (typeof media.url === 'string' && media.url.length > 0) return absoluteUrl(media.url)
  return undefined
}

export function resolveOgImageUrl(doc: SeoDoc): string | undefined {
  const og = isMedia(doc.ogImage) ? doc.ogImage : null
  const hero = isMedia(doc.heroImage) ? doc.heroImage : null
  return mediaOgUrl(og) ?? mediaOgUrl(hero)
}

/**
 * Next Metadata-objektum egy CMS-dokumentumhoz (page/post közös).
 * A title a keret-layout template-je (%s | Kineticare) alá kerül.
 */
export function buildDocMetadata(doc: SeoDoc, path: string): Metadata {
  const description = resolveSeoDescription(doc)
  const ogImage = resolveOgImageUrl(doc)
  return {
    title: resolveSeoTitle(doc),
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: {
      title: resolveSeoTitle(doc),
      ...(description ? { description } : {}),
      url: absoluteUrl(path),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

/** Organization JSON-LD a kezdőlaphoz. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description:
      'Kineticare — kézrehabilitációs online videókurzusok otthoni gyógytornászati programmal.',
  }
}

/** Article JSON-LD a blogposzt-oldalakhoz. */
export function articleJsonLd(args: {
  post: Pick<Post, 'title' | 'excerpt' | 'publishedAt' | 'updatedAt'>
  path: string
  authorName?: string
  imageUrl?: string
}): Record<string, unknown> {
  const { post, path, authorName, imageUrl } = args
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    mainEntityOfPage: absoluteUrl(path),
    ...(typeof post.publishedAt === 'string' ? { datePublished: post.publishedAt } : {}),
    ...(typeof post.updatedAt === 'string' ? { dateModified: post.updatedAt } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    author: {
      '@type': 'Person',
      name: authorName ?? SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
  }
}
