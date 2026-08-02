import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Elfelejtett jelszó',
  description: 'Kérj jelszó-visszaállító linket az e-mail-címedre.',
}

export default function ElfelejtettJelszoPage() {
  return (
    <Section>
      <Container size="narrow">
        <h1>Elfelejtetted a jelszavad?</h1>
        <p className="kc-auth-lead">
          Add meg az e-mail-címedet, és küldünk egy jelszó-visszaállító linket. Ha a cím létezik
          a rendszerünkben, a link néhány percen belül megérkezik.
        </p>
        <ForgotPasswordForm />
        <p className="kc-auth-alt">
          <Link href="/belepes">Vissza a belépéshez</Link>
        </p>
      </Container>
    </Section>
  )
}
