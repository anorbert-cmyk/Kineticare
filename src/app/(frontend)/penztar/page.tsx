import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { TrackEvent } from '@/components/analytics/TrackEvent'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { logger } from '@/lib/logger'
import { coursePriceHuf, courseTitle, hasUserPurchased } from '@/lib/courses'
import type { Product, User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Pénztár',
  description: 'A vásárlás befejezése: számlázási adatok és a digitális tartalom elállási joga.',
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
 * - VENDÉG-VÁSÁRLÁS (tulajdonosi döntés, 2026-08-15): az oldal bejelentkezés
 *   NÉLKÜL is használható. Korábban az anonim látogatót
 *   /belepes?returnUrl=… -re irányítottuk; most az űrlap az azonosító
 *   mezőkkel (e-mail + név) jelenik meg, és a fiók a FIZETÉS UTÁN jön létre
 *   (vagy találódik meg az e-mail alapján). Bejelentkezve minden a régi: a
 *   profil előkitölti a mezőket, a rendelés a fiókhoz kötődik.
 * - A termék KIZÁRÓLAG a ?termek={id} query-ből jön. A kosár localStorage-os,
 *   kliens-oldali — a szerver-komponens a 'use client'-es readCart()-ot NEM
 *   hívhatja (korábbi kosár-fallback ág garantált render-hiba volt, M8); a
 *   /kosar oldalról a CartView teszi a termék-id-t a pénztár-linkbe.
 * - A két waiver-checkbox (a 45/2014. Korm. rend. 29. § (1) m) szövegei SZÓ
 *   SZERINT) csak a fizetős termékekre vonatkozik — az ingyenes tétel
 *   (priceInHUFEnabled: false) nem igényel waiver-t és nem megy a Barion
 *   checkouton keresztül.
 * - ARCHIVÁLT terméknél az űrlap helyett tájékoztató állapot jelenik meg (a
 *   beküldés úgyis 400-zal hasalna el).
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

  // A termék meghatározása: KIZÁRÓLAG a query (a kosár kliens-oldali; a
  // /kosar oldal CartView-je teszi a termék-id-t a pénztár-linkbe — M8).
  let product: Product | null = null
  if (termekId !== null) {
    product = await getProductById(termekId)
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

  // Archivált terméknél az űrlap helyett tiszta tájékoztató állapot: a beküldés
  // úgyis 400-zal hasalna el („Ez a termék már nem megvásárolható (archivált)."),
  // a díszlet-űrlap pedig a néma hiba kínosabbik fajtája.
  if (product.status === 'archived') {
    return (
      <Section>
        <Container size="narrow">
          <h1>Pénztár</h1>
          <div className="kc-cart-empty" role="status">
            <p>Ez a kurzus jelenleg nem vásárolható meg.</p>
            <Link className="kc-button kc-button--primary" href="/kurzusok">Nézd meg a kurzusokat</Link>
          </div>
        </Container>
      </Section>
    )
  }

  // Vendégként nincs mit összevetni: a „már megvetted" állapotot a szerver a
  // fizetés indításakor (e-mail alapján) is ellenőrzi, 409-cel.
  const alreadyPurchased = user !== null && hasUserPurchased(user.purchases, product.id)
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
          user={
            user === null
              ? null
              : {
                  name: user.name,
                  email: user.email,
                  billingName: user.billingName,
                  billingZip: user.billingZip,
                  billingCity: user.billingCity,
                  billingStreet: user.billingStreet,
                  taxNumber: user.taxNumber,
                }
          }
          alreadyPurchased={alreadyPurchased}
        />
      </Container>
    </Section>
  )
}
