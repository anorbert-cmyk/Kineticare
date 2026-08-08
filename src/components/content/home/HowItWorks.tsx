import type { CSSProperties } from 'react'

import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

/**
 * HowItWorks — „Így működik az online kurzus" 3 lépésben (audit M5/K6).
 *
 * A mechanizmus (megveszem → azonnal nézem → otthon gyakorlok) a legfontosabb
 * ellenérv-csökkentő egy videókurzusnál. Statikus magyar szöveg — a Katák
 * hangneme: szakmai, meleg, bizalomépítő (nincs marketing-hype).
 */

export interface HowItWorksStep {
  title: string
  text: string
}

const STEPS: HowItWorksStep[] = [
  {
    title: 'Kiválasztod a kurzust',
    text: 'A panaszodhoz illő programot néhány kattintással megvásárolod — bankkártyával, biztonságosan.',
  },
  {
    title: 'Azonnal hozzáférsz',
    text: 'A videós anyagokat a fiókodban éred el, saját tempódban, amikor neked megfelel.',
  },
  {
    title: 'Otthon gyakorolsz',
    text: 'A gyakorlatok lépésről lépésre vezetnek — naponta néhány perc is elég a haladáshoz.',
  },
]

const gridStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--kc-space-6, 2rem)',
  marginTop: 'var(--kc-space-6, 2rem)',
}

const stepStyle: CSSProperties = {
  flex: '1 1 16rem',
  maxWidth: '100%',
}

const numberStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.25rem',
  height: '2.25rem',
  borderRadius: '50%',
  background: 'var(--kc-color-primary)',
  color: 'var(--kc-color-on-primary)',
  fontFamily: 'var(--kc-font-heading)',
  fontSize: 'var(--kc-text-lg)',
  marginBottom: 'var(--kc-space-3, 0.75rem)',
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--kc-font-heading)',
  fontSize: 'var(--kc-text-lg)',
  lineHeight: 'var(--kc-leading-heading)',
  margin: '0 0 var(--kc-space-2, 0.5rem)',
}

const textStyle: CSSProperties = {
  color: 'var(--kc-color-text-muted)',
  margin: 0,
}

export interface HowItWorksProps {
  /** Cím-felülírás a `howItWorks` blokkból — üresen a beépített cím marad. */
  title?: string
  /** Lépés-felülírás a blokkból; üresen/hiányozva a beépített 3 lépés jön. */
  steps?: HowItWorksStep[]
  id?: string
  variant?: 'default' | 'tint' | 'dark'
}

export function HowItWorks({ title, steps, id, variant = 'default' }: HowItWorksProps = {}) {
  const heading = title?.trim() || 'Így működik az online kurzus'
  const shownSteps = steps && steps.length > 0 ? steps : STEPS

  return (
    <Section id={id} variant={variant}>
      <Container>
        <h2 className="kc-section-title">{heading}</h2>
        <ol
          style={{
            ...gridStyle,
            listStyle: 'none',
            padding: 0,
          }}
        >
          {shownSteps.map((step, index) => (
            <li key={step.title} style={stepStyle}>
              <span aria-hidden="true" style={numberStyle}>
                {index + 1}
              </span>
              <h3 style={titleStyle}>{step.title}</h3>
              <p style={textStyle}>{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  )
}
