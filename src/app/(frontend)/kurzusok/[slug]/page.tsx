import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { TrackEvent } from '@/components/analytics/TrackEvent'
import { JsonLd } from '@/components/content/JsonLd'
import { CourseCta } from '@/components/courses/CourseCta'
import { LexicalContent } from '@/components/courses/LexicalContent'
import { PreviewVideo, hasPreviewVideo } from '@/components/courses/PreviewVideo'
import { RelatedCourses } from '@/components/courses/RelatedCourses'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { PriceTag } from '@/components/ui/PriceTag'
import { Section } from '@/components/ui/Section'
import { resolveSingleCourseAccess } from '@/lib/course-access-lookup'
import {
  courseCover,
  coursePriceHuf,
  courseTitle,
  hasUserPurchased,
  parseCourseIdParam,
} from '@/lib/courses'
import { logger } from '@/lib/logger'
import { absoluteUrl, breadcrumbJsonLd, courseJsonLd } from '@/lib/seo'
import type { Product, User } from '@/payload-types'

import config from '../../../../payload.config'

/**
 * /kurzusok/[slug] — kurzus-oldal (az értékesítés motorja).
 *
 * - A [slug] szegmens a numerikus product id (a products collectionnek
 *   nincs slug mezője — a menu-tree /kurzusok/{id} konvenciója).
 * - published → mindenki láthatja; archived → az oldal megtekinthető, de a
 *   CTA INAKTÍV + „Ez a kurzus jelenleg nem vásárolható" jelölés (nem
 *   listázódik, a meglévő vevő a „Tovább a kurzusaimhoz" linket kapja);
 *   draft/ismeretlen → 404.
 * - A „már megvetted" állapot a bejelentkezett user purchases-listájából
 *   (users.purchases, csak olvasás) dől el — LEJÁRT hozzáférésnél (A1,
 *   accessDurationDays) viszont újra a vásárlási CTA jelenik meg, különben a
 *   vevő zsákutcába futna („vásárold meg újra" ↔ „tovább a kurzusaimhoz").
 * - A longDescription renderelését JELENLEG a helyi, minimális
 *   LexicalContent végzi — TODO(W2-értékelés): konszolidáció az 5B-hullám
 *   src/components/lexical/ rendererével (lásd a komponens fejlécét).
 */

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

/** Kérés-idejű dedupe: a generateMetadata és a page ugyanazt a lekérdezést osztja meg. */
const getCourseById = cache(async (id: number): Promise<Product | null> => {
  try {
    const payload = await getPayload({ config })
    // depth: 2 — a relatedProducts és a borítóképek populate-olva jönnek.
    return await payload.findByID({
      collection: 'products',
      id,
      depth: 2,
      overrideAccess: true,
    })
  } catch (error) {
    logger.warn('kurzus-lekérdezés sikertelen — 404-cel renderelünk', {
      productId: id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
})

/** A bejelentkezett felhasználó (anonim látogatónál null) — csak olvasás. */
async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return (user as User | null) ?? null
  } catch {
    return null
  }
}

/**
 * Él-e MÉG a vevő hozzáférése (A1). Lekérdezési hiba esetén true — a CTA
 * ilyenkor a mai, „már megvetted" viselkedést mutatja; a tényleges lejátszást
 * a stream-token végpont amúgy is újra ellenőrzi.
 */
async function hasLiveAccess(userId: number, product: Product): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const access = await resolveSingleCourseAccess({ payload, userId, product, logger })
    return access.hasAccess
  } catch (error) {
    logger.warn('kurzus-oldal: hozzáférés-állapot számítása sikertelen', {
      userId,
      productId: product.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return true
  }
}

function categoryTitle(product: Product): string | null {
  const category = typeof product.category === 'object' ? product.category : null
  return category && typeof category.title === 'string' && category.title.length > 0
    ? category.title
    : null
}

function relatedProductsOf(product: Product): Product[] {
  if (!Array.isArray(product.relatedProducts)) {
    return []
  }
  return product.relatedProducts.filter(
    (entry): entry is Product => typeof entry === 'object' && entry !== null,
  )
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params
  const id = parseCourseIdParam(slug)
  const product = id === null ? null : await getCourseById(id)
  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    return { title: 'A kurzus nem található' }
  }
  const title = courseTitle(product)
  const description =
    typeof product.shortDescription === 'string' && product.shortDescription.trim().length > 0
      ? product.shortDescription
      : `${title} — online kézrehabilitációs kurzus a Kineticare kínálatából.`
  const cover = courseCover(product)
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(cover ? { images: [{ url: cover.url, alt: cover.alt }] } : {}),
    },
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const id = parseCourseIdParam(slug)
  if (id === null) {
    notFound()
  }
  const product = await getCourseById(id)
  // Draft (és minden nem published/archived) termék nyilvánosan nem érhető el.
  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    notFound()
  }

  const user = await getCurrentUser()
  // Lejárt hozzáférés = a CTA szempontjából „még nem vevő": újra megvásárolható.
  const purchased =
    user !== null &&
    hasUserPurchased(user.purchases, product.id) &&
    (await hasLiveAccess(user.id, product))

  const title = courseTitle(product)
  const cover = courseCover(product)
  const price = coursePriceHuf(product)
  const category = categoryTitle(product)
  const showPreview = hasPreviewVideo(product.previewVideoStreamId)

  return (
    <>
      {/* PostHog funnel-lépés: a kurzus-oldal megnyitása (no-op consent nélkül). */}
      <TrackEvent event="course_viewed" properties={{ courseId: product.id, courseSku: product.sku ?? undefined }} />
      {/* Strukturált adat: a Course-séma ára a priceInHUF-ból jön, tehát
          árváltozásnál automatikusan követi — nem tud elavulni. */}
      <JsonLd
        data={courseJsonLd({
          product,
          name: title,
          path: `/kurzusok/${product.id}`,
          priceHuf: price,
          ...(cover ? { imageUrl: absoluteUrl(cover.url) } : {}),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Kurzusok', path: '/kurzusok' },
          { name: title, path: `/kurzusok/${product.id}` },
        ])}
      />
      <Section>
        <Container>
          <nav aria-label="Morzsamenü" className="kc-course-breadcrumb">
            <ol role="list">
              <li>
                <Link href="/kurzusok">Kurzusok</Link>
              </li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>

          <div className="kc-course-hero">
            <div className="kc-course-hero__main">
              {category ? (
                <p className="kc-course-hero__category">
                  <Badge tone="info">{category}</Badge>
                </p>
              ) : null}
              <h1>{title}</h1>
              {product.shortDescription ? (
                <p className="kc-course-hero__lead">{product.shortDescription}</p>
              ) : null}
            </div>

            <Card className="kc-course-buybox">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- a Payload media méretei kézileg vannak bekötve (width/height a CMS-ből)
                <img
                  alt={cover.alt}
                  className="kc-course-buybox__cover"
                  decoding="async"
                  height={cover.height ?? undefined}
                  src={cover.url}
                  width={cover.width ?? undefined}
                />
              ) : null}
              {price !== null ? (
                <p className="kc-course-buybox__price">
                  <PriceTag label="Ár:" priceHuf={price} />
                </p>
              ) : (
                <p className="kc-course-buybox__price kc-course-buybox__price--free">
                  Ingyenes
                </p>
              )}
              <CourseCta hasPurchased={purchased} product={product} />
            </Card>
          </div>

          {showPreview ? (
            <section aria-labelledby="elozetes-cim" className="kc-course-section">
              <h2 id="elozetes-cim">Előzetes</h2>
              <PreviewVideo streamId={product.previewVideoStreamId} title={`${title} — előzetes`} />
            </section>
          ) : null}

          {product.longDescription ? (
            <section aria-labelledby="leiras-cim" className="kc-course-section">
              <h2 id="leiras-cim">A kurzusról</h2>
              <LexicalContent content={product.longDescription} />
            </section>
          ) : null}
        </Container>
      </Section>

      <RelatedCourses products={relatedProductsOf(product)} />
    </>
  )
}
