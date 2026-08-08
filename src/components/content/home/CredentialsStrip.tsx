import Link from 'next/link'

import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

import '../../../app/(frontend)/styles/blocks/creds-strip.css'

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
 *
 * Megjelenés: a landing hajszálvonalas csík-nyelve — a stílus a
 * styles/blocks/creds-strip.css-ben él (elemre írt inline stílus nincs). A
 * link a közös `kc-text-link` nyelvét viseli, a nyíl-span dekoratív.
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

export function CredentialsStrip({
  items,
  link = DEFAULT_LINK,
  id,
  variant = 'default',
}: CredentialsStripProps = {}) {
  const credentials = items && items.length > 0 ? items : CREDENTIALS
  // A nyíl dekoratív (a linket a felirat nevezi meg), ezért aria-hidden.
  const linkContent = link ? (
    <>
      {link.label} <span aria-hidden="true">→</span>
    </>
  ) : null

  return (
    <Section className="kc-creds" flush id={id} variant={variant}>
      <Container>
        <div className="kc-creds__inner">
          <div className="kc-creds__items">
            {credentials.map((credential) => (
              <span className="kc-creds__item" key={credential}>
                <span aria-hidden="true" className="kc-creds__dot" />
                {credential}
              </span>
            ))}
          </div>
          {link ? (
            link.newTab ? (
              <a
                className="kc-text-link kc-creds__link"
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {linkContent}
              </a>
            ) : (
              <Link className="kc-text-link kc-creds__link" href={link.href}>
                {linkContent}
              </Link>
            )
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
