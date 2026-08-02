import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { LoginForm } from '@/components/auth/LoginForm'
import { logger } from '@/lib/logger'
import type { User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Belépés',
  description: 'Lépj be a Kineticare fiókodba a kurzusaid és a rendeléseid eléréséhez.',
}

interface BelepesPageProps {
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
 * /belepes — a bejelentkezés oldala.
 *
 * A returnUrl-paraméterrel tér vissza oda, ahonnan jött (a checkoutból is
 * érkezhet — open-redirect ellen védve: csak belső útvonal fogadott).
 */
export default async function BelepesPage({ searchParams }: BelepesPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (user !== null) {
    const returnUrl = typeof params.returnUrl === 'string' && params.returnUrl.startsWith('/') ? params.returnUrl : '/kurzusaim'
    redirect(returnUrl)
  }

  const returnUrl = typeof params.returnUrl === 'string' && params.returnUrl.startsWith('/') ? params.returnUrl : '/kurzusaim'

  return (
    <Section>
      <Container size="narrow">
        <h1>Belépés</h1>
        <p className="kc-auth-lead">
          Lépj be a fiókodba a kurzusaid, a rendeléseid és a lejátszásaid eléréséhez.
        </p>
        <LoginForm returnUrl={returnUrl} />
        <p className="kc-auth-alt">
          Még nincs fiókod?{' '}
          <Link href={`/regisztracio?returnUrl=${encodeURIComponent(returnUrl)}`}>Regisztrálj</Link>
          {' · '}
          <Link href="/elfelejtett-jelszo">Elfelejtetted a jelszavad?</Link>
        </p>
      </Container>
    </Section>
  )
}
