'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

/**
 * Alap hibaoldal (500) a (frontend) route-grouphoz — magyar szöveggel,
 * újrapróbálás- és vissza-CTA-val. (A Next konvenció szerint client-komponens.)
 */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Frontend render-hiba:', error)
  }, [error])

  return (
    <Section>
      <Container className="kc-error-page" size="narrow">
        <p className="kc-error-page__code">500</p>
        <h1 className="kc-error-page__title">Hiba történt az oldal betöltése közben</h1>
        <p className="kc-error-page__text">
          Elnézést, váratlan hiba történt. Próbáld újra, vagy térj vissza a kezdőlapra. Ha a hiba
          ismétlődik, jelezd nekünk a kapcsolatfelvételnél.
        </p>
        <div className="kc-error-page__actions">
          <Button onClick={reset}>Próbáld újra</Button>
          <Button href="/" variant="secondary">
            Vissza a kezdőlapra
          </Button>
        </div>
      </Container>
    </Section>
  )
}
