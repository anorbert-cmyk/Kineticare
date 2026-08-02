import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import { cache } from 'react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CoursePlayer } from '@/components/account/CoursePlayer'
import { logger } from '@/lib/logger'
import { courseTitle, hasUserPurchased, parseCourseIdParam } from '@/lib/courses'
import type { Product, User } from '@/payload-types'

import config from '../../../payload.config'

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

  return (
    <Section>
      <Container>
        <CoursePlayer
          product={{
            id: product.id,
            title: courseTitle(product),
            videos: Array.isArray(product.videos) ? product.videos : [],
          }}
          hasAccess={purchased}
        />
      </Container>
    </Section>
  )
}
