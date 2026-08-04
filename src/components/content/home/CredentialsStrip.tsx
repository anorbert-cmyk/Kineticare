import Link from 'next/link'
import type { CSSProperties } from 'react'

import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

/**
 * CredentialsStrip — kondenzált szakmai hitel-csík (audit M2/K5).
 *
 * A legerősebb bizalmi érvek (gyógytornász–manuálterapeuta háttér, sportolói/
 * olimpikoni bizalom, szakmai egyesületi tagság) egyetlen visszafogott csíkban,
 * a Rólunk oldalra mutató linkkel. A home CMS-mezői között nincs külön
 * hitel-tartalom, ezért az audit által rögzített tények rövid statikus
 * szövegként jelennek meg (a részletek a /rolunk oldalon).
 */

const CREDENTIALS: string[] = [
  'Gyógytornász és manuálterapeuta szakmai háttér',
  'Sportolók és olimpikonok is hozzánk fordulnak',
  'Szakmai egyesületi tagság',
]

const stripStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--kc-space-3, 0.75rem) var(--kc-space-6, 2rem)',
}

const itemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--kc-space-2, 0.5rem)',
  color: 'var(--kc-color-text-muted)',
  fontSize: 'var(--kc-text-sm)',
}

const dotStyle: CSSProperties = {
  width: '0.375rem',
  height: '0.375rem',
  borderRadius: 'var(--kc-radius-full, 999px)',
  background: 'var(--kc-color-primary)',
  flexShrink: 0,
}

export function CredentialsStrip() {
  return (
    <Section flush>
      <Container>
        <div
          style={{
            ...stripStyle,
            padding: 'var(--kc-space-5, 1.5rem) 0',
          }}
        >
          {CREDENTIALS.map((credential) => (
            <span key={credential} style={itemStyle}>
              <span aria-hidden="true" style={dotStyle} />
              {credential}
            </span>
          ))}
          <Link className="kc-text-link" href="/rolunk">
            Bővebben a szakmai hátterünkről
          </Link>
        </div>
      </Container>
    </Section>
  )
}
