import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Új jelszó beállítása',
  description: 'Állíts be új jelszót a visszaállító linkkel.',
}

interface ResetPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : null

  return (
    <Section>
      <Container size="narrow">
        <h1>Új jelszó beállítása</h1>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="kc-auth-error" role="alert">
            <p>Hiányzik a visszaállító token a hivatkozásból. Kérj új jelszó-visszaállító linket.</p>
            <Link href="/elfelejtett-jelszo">Új link kérése</Link>
          </div>
        )}
      </Container>
    </Section>
  )
}
