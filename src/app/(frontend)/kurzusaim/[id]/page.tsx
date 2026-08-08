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
 * /kurzusaim/[id] — a kurzus lejátszóoldala (epizódlista + Cloudflare Stream
 * player, signed token a T-032 végpontról, token-frissítés exp−5 percben).
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

  return (
    <Section>
      <Container>
        <CoursePlayer
          expiredMessage={expiredMessage}
          product={{
            id: product.id,
            title: courseTitle(product),
            videos: Array.isArray(product.videos)
              ? product.videos.map((video) => ({
                  id: video.id ?? undefined,
                  title: video.title ?? undefined,
                  streamAssetId: video.streamAssetId ?? undefined,
                  durationSec: video.durationSec ?? undefined,
                  status: video.status ?? undefined,
                }))
              : [],
          }}
          hasAccess={purchased && expiredMessage === null}
        />
      </Container>
    </Section>
  )
}
