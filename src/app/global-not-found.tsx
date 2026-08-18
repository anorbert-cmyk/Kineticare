import type { Metadata } from 'next'
import Link from 'next/link'

import { NotFoundView } from '@/components/error/NotFoundView'

import './(frontend)/styles.css'

/**
 * GLOBÁLIS „nem található" oldal — minden NEM ILLESZKEDŐ URL ide fut
 * (pl. `/egy/ket/harom`, régi kampánylinkek, elgépelt mély útvonalak).
 *
 * MIÉRT KELL EZ A FÁJL (mért indok, nem elvi)
 *
 * A Next.js hivatalos dokumentációja szerint a gyökérszintű, nem illeszkedő
 * URL-eket az `app/not-found.js` kapná el — DE csak akkor, ha az az `app/`
 * gyökerében áll, EGYETLEN gyökér-layout alatt. Ennek a projektnek KÉT
 * gyökér-layoutja van (`app/(frontend)/layout.tsx` és `app/(payload)/layout.tsx`),
 * és a dokumentáció pontosan ezt az esetet nevezi meg a `global-not-found`
 * indokaként: „Your app has multiple root layouts (e.g. app/(admin)/layout.tsx
 * and app/(shop)/layout.tsx), so there's no single layout to compose a global
 * 404 from."
 * https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 *
 * A fájl nélkül mérve (2026-08-16, éles build):
 *   GET /egy/ket/harom → 404, de a Next BEÉPÍTETT, ANGOL nyelvű lapja jött
 *   („404 · This page could not be found."), keret, magyar szöveg és link
 *   nélkül. Ezzel a fájllal ugyanaz a kérés teljes, szerver-oldalon renderelt,
 *   magyar HTML-t ad, JavaScript nélkül is.
 *
 * A `globalNotFound` kísérleti kapcsolót a `next.config.ts` `experimental`
 * blokkja kapcsolja be — enélkül a Next figyelmen kívül hagyja ezt a fájlt.
 *
 * MIÉRT NEM A TELJES `Header`/`Footer` VAN ITT
 *
 * Ez a lap a Next konvenciója szerint a LAYOUTOK MEGKERÜLÉSÉVEL renderel:
 * saját `<html>`-t és `<body>`-t ad, és a globális stílusokat magának kell
 * behúznia (ezért az `import './(frontend)/styles.css'`). A `Footer`
 * „Süti-beállítások" gombja a `ConsentBanner`-nek küld eseményt, a
 * `NewsletterSignup` pedig Payload-lekérdezést végez — mindkettő a
 * `(frontend)` layout keretére támaszkodik, ami itt nincs jelen. Egy néma,
 * nem működő gomb rosszabb a hiányánál, ezért itt EGYSZERŰSÍTETT, de a
 * márkanyelvet vivő keret áll: márkajelzés a kezdőlapra és jogi sor. A
 * továbbvezető célokat a törzs adja (`NotFoundView`).
 * A dokumentáció maga is ezt ajánlja: „A smaller version of your global styles,
 * and a simpler font family could improve performance of this page."
 */
export const metadata: Metadata = {
  title: 'Ez az oldal nem található | Kineticare',
  description:
    'A keresett oldal nem található a Kineticare oldalán. Innen tovább tudsz lépni a kurzusokra, a tudástárba vagy a kapcsolatfelvételhez.',
}

/**
 * Jogi linkek. A `Footer.FOOTER_LEGAL_LINKS`-szel egyező lista, de saját
 * konstansként: a lábléc modulja Payload-függő gyerekeket hoz magával (lásd
 * fent). Az egyezést őr-teszt védi (`src/__tests__/hibaoldal.test.tsx`).
 */
const LEGAL_LINKS = [
  { href: '/adatvedelem', label: 'Adatkezelési és adatvédelmi szabályzat' },
  { href: '/aszf', label: 'Általános szerződési feltételek' },
  { href: '/impresszum', label: 'Impresszum' },
] as const

export default function GlobalNotFound() {
  return (
    <html lang="hu">
      <body>
        <a className="kc-skip-link" href="#tartalom">
          Ugrás a tartalomra
        </a>
        <header className="kc-site-header">
          <div className="kc-container">
            <div className="kc-site-header__bar">
              {/* A hozzáférhető név BITRE a `Header.tsx`-é: ugyanaz az elem,
                  ugyanaz a név (WCAG 2.2 · 3.2.4). A korábbi „Kineticare —
                  kezdőlap" ráadásul U+2014-et tartalmazott, amit a magyar
                  mikroszöveg-szabályzat tilt (docs/ui-sztenderdek.md §3.1.1). */}
              <Link aria-label="Kineticare kezdőlap" className="kc-site-header__brand" href="/">
                Kineti<span className="kc-site-header__brand-accent">care</span>
              </Link>
            </div>
          </div>
        </header>
        <main id="tartalom">
          <NotFoundView />
        </main>
        <footer className="kc-site-footer">
          <div className="kc-container">
            <ul className="kc-error-frame__legal">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </body>
    </html>
  )
}
