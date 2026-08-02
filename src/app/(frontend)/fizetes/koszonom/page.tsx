import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { ThankYouView } from '@/components/checkout/ThankYouView'
import { logger } from '@/lib/logger'
import type { User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Köszönjük a vásárlást',
  description: 'A fizetésedet feldolgozzuk — hamarosan eléred a kurzust.',
}

interface KoszonjukPageProps {
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

/**
 * /fizetes/koszonom — a Barion redirect célja (a T-021 redirectUrl-ja).
 *
 * A köszönőoldal a rendelés-státuszt 2 mp-enként poll-ozza (a T-022
 * callback aszinkron — a `paid` átmenet késhet). A `order` query-param a
 * rendelésszám (a Barion visszairányításakor a T-021 által beállított
 * redirectUrl-ből, vagy a checkout-válaszból).
 *
 * Állapotok:
 * - `paid` → siker-nézet (rendelésszám + „a kurzust a Fiókodban éred el" +
 *   /kurzusaim link);
 * - 2 perc után is `payment_pending` → „a fizetés feldolgozása folyamatban"
 *   + „e-mailben értesítünk" szöveg;
 * - `cancelled`/`payment_failed` → a /sikertelen-nek megfelelő nézet.
 */
export default async function KoszonjukPage({ searchParams }: KoszonjukPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  const orderParam = params.order
  const orderNumber = typeof orderParam === 'string' && orderParam.trim().length > 0 ? orderParam.trim() : null

  return (
    <Section>
      <Container size="narrow">
        <ThankYouView orderNumber={orderNumber} isLoggedIn={user !== null} />
      </Container>
    </Section>
  )
}
