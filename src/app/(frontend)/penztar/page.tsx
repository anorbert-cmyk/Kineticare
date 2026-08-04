import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { TrackEvent } from '@/components/analytics/TrackEvent'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { logger } from '@/lib/logger'
import { coursePriceHuf, courseTitle, hasUserPurchased } from '@/lib/courses'
import { readCart } from '@/lib/cart'
import type { Product, User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Pénztár',
  description: 'A vásárlás befejezése — számlázási adatok és a digitális tartalom elállási joga.',
}

interface PenztarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

async function getProductById(id: number): Promise<Product | null> {
  try {
    const payload = await getPayload({ config })
    return await payload.findByID({ collection: 'products', id, depth: 1, overrideAccess: true })
  } catch (error) {
    logger.warn('penztár: termék-lekérdezés sikertelen', { productId: id, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * /penztar — a vásárlás befejezése.
 *
 * - auth-kötelező: anon → /belepes?returnUrl=/penztar?termek={id} (a
 *   returnUrl a termék-query-vel együtt megy tovább).
 * - A termék a ?termek={id} query-ből vagy a kosár-state-ből jön; a két
 *   waiver-checkbox (a 45/2014. Korm. rend. 29. § (1) m) szövegei SZÓ
 *   SZERINT) csak a fizetős termékekre vonatkozik — az ingyenes tétel
 *   (priceInHUFEnabled: false) nem igényel waiver-t és nem megy a Barion
 *   checkouton keresztül.
 * - A fizetési gomb felirata KÖTÖTT: „Megrendelés és fizetés".
 */
export default async function PenztarPage({ searchParams }: PenztarPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  const termekParam = params.termek
  const termekId =
    typeof termekParam === 'string' && /^\d+$/.test(termekParam.trim())
      ? Number(termekParam.trim())
      : null

  if (user === null) {
    const returnUrl = termekId !== null ? `/penztar?termek=${termekId}` : '/penztar'
    redirect(`/belepes?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  // A termék meghatározása: a query elsődleges, a kosár-state tartalék.
  let product: Product | null = null
  if (termekId !== null) {
    product = await getProductById(termekId)
  }
  if (!product) {
    const cart = readCart()
    const first = cart.items[0]
    if (first) {
      product = await getProductById(first.productId)
    }
  }

  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    return (
      <Section>
        <Container size="narrow">
          <h1>Pénztár</h1>
          <div className="kc-cart-empty" role="status">
            <p>Nincs kiválasztott termék a fizetéshez.</p>
            <Link className="kc-button kc-button--primary" href="/kurzusok">Válassz kurzust</Link>
          </div>
        </Container>
      </Section>
    )
  }

  const alreadyPurchased = hasUserPurchased(user.purchases, product.id)
  const price = coursePriceHuf(product)
  const isFree = product.priceInHUFEnabled === false

  return (
    <Section>
      <Container size="narrow">
        {/* PostHog funnel-lépés: a pénztár megnyitása (no-op consent nélkül). */}
        <TrackEvent event="checkout_started" properties={{ courseId: product.id, courseSku: product.sku ?? undefined }} />
        <h1>Pénztár</h1>
        {alreadyPurchased ? (
          <div className="kc-cart-notice" role="status">
            <p>
              Ezt a kurzust már megvetted — a{' '}
              <Link href="/kurzusaim">Kurzusaim</Link> oldalon éred el.
            </p>
          </div>
        ) : null}
        <CheckoutForm
          product={{
            id: product.id,
            sku: courseTitle(product),
            priceHuf: price,
            isFree,
          }}
          user={{
            name: user.name,
            email: user.email,
            billingName: user.billingName,
            billingZip: user.billingZip,
            billingCity: user.billingCity,
            billingStreet: user.billingStreet,
            taxNumber: user.taxNumber,
          }}
          alreadyPurchased={alreadyPurchased}
        />
      </Container>
    </Section>
  )
}
