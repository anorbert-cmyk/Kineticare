import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { AccountView } from '@/components/account/AccountView'
import { logger } from '@/lib/logger'
import { hasUserPurchased } from '@/lib/courses'
import type { Order, User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Fiókom',
  description: 'Adataim, rendeléseim és a megvett kurzusaim egy helyen.',
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

async function getUserOrders(userId: number): Promise<Order[]> {
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'orders',
      where: { customer: { equals: userId } },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
      overrideAccess: true,
    })
    return docs
  } catch (error) {
    logger.warn('fiók: rendelés-lekérdezés sikertelen', { userId, error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * /fiok — a felhasználó fiókja (adataim, rendeléseim, kurzusaim).
 */
export default async function FiokPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/belepes?returnUrl=/fiok')
  }

  const orders = await getUserOrders(user.id)

  return (
    <Section>
      <Container>
        <h1>Fiókom</h1>
        <AccountView user={user} orders={orders} />
      </Container>
    </Section>
  )
}
