import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { DEFAULT_AUTH_RETURN_URL, sanitizeReturnUrl } from '@/lib/return-url'
import type { User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Regisztráció',
  description: 'Hozd létre a Kineticare fiókodat — a kurzusaid és a rendeléseid egy helyen.',
}

interface RegisztracioPageProps {
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
 * /regisztracio — a fiók létrehozásának oldala.
 *
 * A returnUrl-paraméter a belépéssel azonos módon, a közös `sanitizeReturnUrl`
 * szűrővel megy át (open-redirect védelem), EGYSZER, még a redirect-ág előtt —
 * a redirect és a form (`window.location.href`) így ugyanazt az ellenőrzött
 * értéket kapja.
 */
export default async function RegisztracioPage({ searchParams }: RegisztracioPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  const returnUrl = sanitizeReturnUrl(params.returnUrl, DEFAULT_AUTH_RETURN_URL)

  if (user !== null) {
    redirect(returnUrl)
  }

  return (
    <Section>
      <Container size="narrow">
        <h1>Regisztráció</h1>
        <p className="kc-auth-lead">
          Hozd létre a fiókodat — a kurzusaid, a rendeléseid és a lejátszásaid egy helyen lesznek.
        </p>
        <RegisterForm returnUrl={returnUrl} />
        <p className="kc-auth-alt">
          Már van fiókod?{' '}
          <Link href={`/belepes?returnUrl=${encodeURIComponent(returnUrl)}`}>Lépj be</Link>
        </p>
      </Container>
    </Section>
  )
}
