import Link from 'next/link'
import type { CSSProperties } from 'react'

import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

/**
 * CredentialsStrip — kondenzált szakmai hitel-csík (audit M2/K5).
 *
 * A legerősebb bizalmi érvek (gyógytornász–manuálterapeuta háttér, sportolói/
 * olimpikoni bizalom, szakmai egyesületi tagság) egyetlen visszafogott csíkban,
 * a Rólunk oldalra mutató linkkel.
 *
 * Két hívási mód:
 *  - prop nélkül (rögzített kezdőlap): az audit által rögzített statikus tények,
 *  - a szekció-rendszer `credsStrip` blokkjából (RenderBlocks): a tételek és a
 *    link a CMS-ből jönnek; `link: null` = a szerkesztő nem kért linket.
 */

const CREDENTIALS: string[] = [
  'Gyógytornász és manuálterapeuta szakmai háttér',
  'Sportolók és olimpikonok is hozzánk fordulnak',
  'Szakmai egyesületi tagság',
]

const DEFAULT_LINK: CredentialsLink = {
  label: 'Bővebben a szakmai hátterünkről',
  href: '/rolunk',
}

export interface CredentialsLink {
  label: string
  href: string
  /** Külső linknél új lapon nyitás (target="_blank" + noopener). */
  newTab?: boolean
}

export interface CredentialsStripProps {
  /** Tétel-felülírás a CMS-ből; üresen/hiányozva a beépített tények jönnek. */
  items?: string[]
  /** `null` = nincs link; `undefined` = a beépített Rólunk-link. */
  link?: CredentialsLink | null
  id?: string
  variant?: 'default' | 'tint' | 'dark'
}

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

export function CredentialsStrip({
  items,
  link = DEFAULT_LINK,
  id,
  variant = 'default',
}: CredentialsStripProps = {}) {
  const credentials = items && items.length > 0 ? items : CREDENTIALS

  return (
    <Section flush id={id} variant={variant}>
      <Container>
        <div
          style={{
            ...stripStyle,
            padding: 'var(--kc-space-5, 1.5rem) 0',
          }}
        >
          {credentials.map((credential) => (
            <span key={credential} style={itemStyle}>
              <span aria-hidden="true" style={dotStyle} />
              {credential}
            </span>
          ))}
          {link ? (
            link.newTab ? (
              <a className="kc-text-link" href={link.href} rel="noopener noreferrer" target="_blank">
                {link.label}
              </a>
            ) : (
              <Link className="kc-text-link" href={link.href}>
                {link.label}
              </Link>
            )
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
