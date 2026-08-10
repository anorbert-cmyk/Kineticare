import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import { cache } from 'react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CoursePlayer } from '@/components/account/CoursePlayer'
import { logger } from '@/lib/logger'
import { accessExpiredMessage } from '@/lib/course-access'
import { resolveSingleCourseAccess } from '@/lib/course-access-lookup'
import { fetchWatchedRefs } from '@/lib/course-progress/lookup'
import { courseTitle, hasUserPurchased, parseCourseIdParam } from '@/lib/courses'
import type { Product, User } from '@/payload-types'

import config from '@payload-config'

export const metadata: Metadata = {
  title: 'Kurzus lejátszása',
  description: 'A megvett kurzus videóinak lejátszása.',
}

interface KurzusaimPlayerPageProps {
  params: Promise<{ id: string }>
}

const getCourseById = cache(async (id: number): Promise<Product | null> => {
  try {
    const payload = await getPayload({ config })
    return await payload.findByID({ collection: 'products', id, depth: 2, overrideAccess: true })
  } catch (error) {
    logger.warn('lejátszó: kurzus-lekérdezés sikertelen', { productId: id, error: error instanceof Error ? error.message : String(error) })
    return null
  }
})

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
 * A megvett kurzus időbeli érvényessége (A1). Lekérdezési hiba esetén a mai,
 * korlátlan viselkedés marad — a stream-token végpont ettől függetlenül újra
 * ellenőrzi a lejáratot, tehát a felület engedékenysége nem nyit lyukat.
 */
async function getAccessExpiredMessage(userId: number, product: Product): Promise<string | null> {
  try {
    const payload = await getPayload({ config })
    const access = await resolveSingleCourseAccess({ payload, userId, product, logger })
    if (access.hasAccess) {
      return null
    }
    logger.info('lejátszó: lejárt hozzáférés — a videók nem indíthatók', {
      userId,
      productId: product.id,
      expiresAt: access.expiresAt?.toISOString() ?? null,
    })
    return accessExpiredMessage(access.expiresAt)
  } catch (error) {
    logger.warn('lejátszó: hozzáférés-állapot számítása sikertelen', {
      userId,
      productId: product.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * A már megnézettként jelölt videók refjei (E1). Kényelmi adat: lekérdezési
 * hiba esetén üres lista megy a lejátszóba (a `fetchWatchedRefs` maga is
 * fail-open) — a haladás jelzése sosem akadályozhatja meg a lejátszást.
 */
async function getWatchedRefs(userId: number, productId: number): Promise<string[]> {
  try {
    const payload = await getPayload({ config })
    const byProduct = await fetchWatchedRefs({
      payload,
      userId,
      productIds: [productId],
      logger,
    })
    return [...(byProduct.get(productId) ?? [])]
  } catch (error) {
    logger.warn('lejátszó: a kurzus-haladás betöltése sikertelen', {
      userId,
      productId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * /kurzusaim/[id] — a kurzus lejátszóoldala (epizódlista + Bunny Stream
 * player, tokenes embed a T-032 végpontról, token-frissítés a lejárat előtt
 * 5 perccel).
 */
export default async function KurzusaimPlayerPage({ params }: KurzusaimPlayerPageProps) {
  const { id } = await params
  const courseId = parseCourseIdParam(id)
  if (courseId === null) {
    notFound()
  }

  const user = await getCurrentUser()
  if (user === null) {
    redirect(`/belepes?returnUrl=/kurzusaim/${courseId}`)
  }

  const product = await getCourseById(courseId)
  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    notFound()
  }

  const purchased = hasUserPurchased(user.purchases, product.id)
  const expiredMessage = purchased ? await getAccessExpiredMessage(user.id, product) : null
  const hasAccess = purchased && expiredMessage === null
  // Haladás csak akkor kell, ha a vevő ténylegesen nézheti a kurzust.
  const watchedRefs = hasAccess ? await getWatchedRefs(user.id, product.id) : []

  return (
    <Section>
      <Container>
        <CoursePlayer
          expiredMessage={expiredMessage}
          product={{
            id: product.id,
            slug: product.slug ?? null,
            title: courseTitle(product),
            videos: Array.isArray(product.videos)
              ? product.videos.map((video) => ({
                  id: video.id ?? undefined,
                  title: video.title ?? undefined,
                  // S2/b: a Bunny-GUID csak annak megy ki, akinek ÉL a
                  // hozzáférése. A lejátszó `hasAccess: false` esetén amúgy is
                  // korán visszatér (paywall-kártya), tehát a mezőre ott nincs
                  // szüksége — a termék-olvasás viszont overrideAccess: true-val
                  // megy, így a mezőt itt kell elhagyni, különben a nem-vevő is
                  // megkapná az RSC-válaszban.
                  streamAssetId: hasAccess ? (video.streamAssetId ?? undefined) : undefined,
                  durationSec: video.durationSec ?? undefined,
                  status: video.status ?? undefined,
                }))
              : [],
          }}
          hasAccess={hasAccess}
          watchedRefs={watchedRefs}
        />
      </Container>
    </Section>
  )
}
