import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CourseList } from '@/components/account/CourseList'
import { toCourseAccessView, type CourseAccessView } from '@/lib/course-access'
import { resolveCourseAccessForUser } from '@/lib/course-access-lookup'
import { logger } from '@/lib/logger'
import type { Product, User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Kurzusaim',
  description: 'A megvett kurzusaid és a lejátszásaid egy helyen.',
}

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
 * A megvett kurzusok hozzáférés-állapota (A1) — a lejárat forrása egységesen az
 * src/lib/course-access.ts. Hiba esetén üres térkép: a lista ilyenkor a mai,
 * korlátlan viselkedést mutatja (a vevőt egy lekérdezési hiba nem zárhatja ki).
 */
async function getAccessViews(
  userId: number,
  products: Product[],
): Promise<Record<number, CourseAccessView>> {
  const views: Record<number, CourseAccessView> = {}
  try {
    const payload = await getPayload({ config })
    const states = await resolveCourseAccessForUser({ payload, userId, products, logger })
    for (const [productId, state] of states) {
      views[productId] = toCourseAccessView(state)
    }
  } catch (error) {
    logger.warn('kurzusaim: hozzáférés-állapot számítása sikertelen', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return views
}

/**
 * /kurzusaim — a megvett kurzusok listája (users.purchases alapján), a
 * hozzáférés lejáratával együtt.
 */
export default async function KurzusaimPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/belepes?returnUrl=/kurzusaim')
  }

  const purchases = Array.isArray(user.purchases) ? user.purchases : []
  const products = purchases
    .map((entry) => (typeof entry === 'object' && entry !== null ? (entry as Product) : null))
    .filter((entry): entry is Product => entry !== null)

  const accessByProductId = await getAccessViews(user.id, products)

  return (
    <Section>
      <Container>
        <h1>Kurzusaim</h1>
        <CourseList accessByProductId={accessByProductId} products={products} />
      </Container>
    </Section>
  )
}
