import Link from 'next/link'

import { Container } from '../ui/Container'

/**
 * Lábléc — legal-linkek + kapcsolat + márka-sor (legacy kineticare.hu minta).
 *
 * A linkek a legacy láblécből származnak (/adatvedelem, /aszf, /impresszum —
 * CMS-oldalslugok, a következő hullám oldalai). A configban jelenleg NINCS
 * settings global; ha megérkezik, ezt a konstanst az felülírhatja — addig is
 * EGY helyen kezelt.
 */
export const FOOTER_LEGAL_LINKS = [
  { href: '/adatvedelem', label: 'Adatkezelési és adatvédelmi szabályzat' },
  { href: '/aszf', label: 'Általános szerződési feltételek' },
  { href: '/impresszum', label: 'Impresszum' },
] as const

export const FOOTER_CONTACT_EMAIL = 'info@kineticare.hu'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="kc-site-footer">
      <Container>
        <div className="kc-site-footer__grid">
          <div>
            <p className="kc-site-footer__brand">Kineticare</p>
            <p className="kc-site-footer__tagline">Kézrehabilitációs online kurzusplatform</p>
          </div>
          <nav aria-label="Jogi és kapcsolat">
            <ul className="kc-site-footer__legal">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              <li className="kc-site-footer__contact">
                Kapcsolat: <a href={`mailto:${FOOTER_CONTACT_EMAIL}`}>{FOOTER_CONTACT_EMAIL}</a>
              </li>
            </ul>
          </nav>
          <p className="kc-site-footer__copy">
            © {year} Kineticare,
            <br />
            minden jog fenntartva
          </p>
        </div>
      </Container>
    </footer>
  )
}
