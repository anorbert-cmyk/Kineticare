import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CourseList } from '@/components/account/CourseList'
import { logger } from '@/lib/logger'
import { courseTitle, hasUserPurchased } from '@/lib/courses'
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
 * /kurzusaim — a megvett kurzusok listája (users.purchases alapján).
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

  return (
    <Section>
      <Container>
        <h1>Kurzusaim</h1>
        <CourseList products={products} />
      </Container>
    </Section>
  )
}
