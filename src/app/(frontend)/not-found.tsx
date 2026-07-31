import type { Metadata } from 'next'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

export const metadata: Metadata = {
  title: 'Az oldal nem található (404)',
}

export default function NotFound() {
  return (
    <Section>
      <Container className="kc-error-page" size="narrow">
        <p className="kc-error-page__code">404</p>
        <h1 className="kc-error-page__title">Az oldal nem található</h1>
        <p className="kc-error-page__text">
          A keresett oldal nem létezik, vagy időközben átkerült más címre. Nézd meg a kezdőlapot,
          vagy használd a fenti menüt.
        </p>
        <div className="kc-error-page__actions">
          <Button href="/">Vissza a kezdőlapra</Button>
        </div>
      </Container>
    </Section>
  )
}
