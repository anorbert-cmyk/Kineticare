import type { Metadata } from 'next'

import type { Media, Page, Post, Product } from '../payload-types'

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

/**
 * Oldal-szintű Metadata a CMS-oldalak/blogposztok generateMetadata-jához —
 * vékony wrapper a buildDocMetadata fölé (title/description/og fallbacklánc
 * + canonical). A path a hívó felelőssége (pl. `/blog/${slug}` vagy `/${slug}`).
 */
export function buildPageMetadata(doc: SeoDoc, path: string): Metadata {
  return buildDocMetadata(doc, path)
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
    // Az entitás egyértelműsítése AI-válaszokban: a nyelv és a működési terület
    // explicit megadása csökkenti a más márkákkal való összemosás esélyét.
    inLanguage: 'hu-HU',
    areaServed: 'HU',
    knowsAbout: [
      'kézrehabilitáció',
      'gyógytorna',
      'kéz- és csuklósérülés utáni rehabilitáció',
      'otthoni rehabilitációs gyakorlatok',
    ],
  }
}

/**
 * FAQPage JSON-LD.
 *
 * A GYIK a leggyakrabban kivonatolt tartalomtípus AI-válaszokban: a kérdés-válasz
 * pár önmagában is értelmes egység, ezért közvetlenül idézhető. A `text` mezőbe
 * mindig a TELJES válasz kerüljön, ne csonkolt változat — a csonkolt válasz
 * félreidézhető.
 */
export function faqPageJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'hu-HU',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * BreadcrumbList JSON-LD.
 *
 * A morzsa a gépi olvasónak (keresőnek és AI-ágensnek egyaránt) megmutatja,
 * hol helyezkedik el az oldal a struktúrában — ez az „agentic discovery"
 * alapja: az ágens így tudja, hogy egy kurzusoldal a kurzuskínálat része.
 */
export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * Course JSON-LD a kurzusoldalakhoz.
 *
 * Miért `Course` és nem `Product`: a termék valójában online videókurzus, és a
 * `Course` séma pontosabban írja le (Google is támogatja a Course rich resultot).
 * Az ár az `offers`-ben él — a `CreativeWork` (és így a `Course`) érvényes
 * property-je. Ár nélkül (`priceInHUFEnabled` kikapcsolva) az `offers` kimarad,
 * mert a 0 Ft-os vagy hiányzó ár félrevezető strukturált adat lenne.
 *
 * FONTOS karbantartási szabály: minden ár- vagy csomagváltozásnál ez a séma is
 * frissül (a `priceInHUF` mezőből származik) — az elavult strukturált adat
 * gyorsan téves árat terjeszt az AI-válaszokban.
 */
export function courseJsonLd(args: {
  product: Pick<Product, 'shortDescription' | 'status'>
  name: string
  path: string
  priceHuf: number | null
  imageUrl?: string
}): Record<string, unknown> {
  const { product, name, path, priceHuf, imageUrl } = args
  const description =
    typeof product.shortDescription === 'string' && product.shortDescription.trim().length > 0
      ? product.shortDescription.trim()
      : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    ...(description ? { description } : {}),
    url: absoluteUrl(path),
    inLanguage: 'hu-HU',
    ...(imageUrl ? { image: [imageUrl] } : {}),
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      inLanguage: 'hu-HU',
    },
    ...(priceHuf !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: priceHuf,
            priceCurrency: 'HUF',
            url: absoluteUrl(path),
            availability:
              product.status === 'published'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/Discontinued',
          },
        }
      : {}),
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
