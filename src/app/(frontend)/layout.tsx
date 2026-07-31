import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

import './styles.css'

/**
 * A (frontend) route-group keret-layoutja: nyelvi meta (hu), alap
 * SEO-defaults, fejléc/lábléc és a globális stílusok bekötése.
 *
 * A menüfa CMS-tartalom — a force-dynamic biztosítja, hogy a navigáció ne
 * fagyjon bele a build-kimenetbe (a getNavTree kérés-idejű; hiba esetén
 * üres navigációval, de renderel).
 */
export const dynamic = 'force-dynamic'

const SITE_NAME = 'Kineticare'
const SITE_TAGLINE = 'Kézrehabilitációs online kurzusplatform'
const DEFAULT_DESCRIPTION =
  'Kineticare — kézrehabilitációs online videókurzusok otthoni gyógytornászati programmal. Tanfolyamok, tudástár és szakmai támogatás kézsérülés utáni felépüléshez.'

/**
 * Alap SEO-defaults. A settings global a jelenlegi configban még nem érhető
 * el — az og-default és a leírás itt, egy helyen kezelt fallback; az
 * oldalak a title-template-tel (%s | Kineticare) és saját description-nel
 * bővítik.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'hu_HU',
    siteName: SITE_NAME,
    title: {
      default: `${SITE_NAME} — ${SITE_TAGLINE}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b243f', // --kc-color-navy-900 (márka-sötét)
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <a className="kc-skip-link" href="#tartalom">
          Ugrás a tartalomra
        </a>
        <Header />
        <main id="tartalom">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
