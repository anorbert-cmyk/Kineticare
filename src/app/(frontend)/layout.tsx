import type { Metadata, Viewport } from 'next'
import { Suspense, type ReactNode } from 'react'

import { ConsentBanner } from '@/components/analytics/ConsentBanner'
import { PostHogPageView } from '@/components/analytics/PostHogPageView'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

import './styles.css'

export const dynamic = 'force-dynamic'

const SITE_NAME = 'Kineticare'
const SITE_TAGLINE = 'Kézrehabilitációs online kurzusplatform'
const DEFAULT_DESCRIPTION =
  'Kineticare — kézrehabilitációs online videókurzusok otthoni gyógytornászati programmal. Tanfolyamok, tudástár és szakmai támogatás kézsérülés utáni felépüléshez.'

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
  themeColor: '#0b243f',
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <a className="kc-skip-link" href="#tartalom">
          Ugrás a tartalomra
        </a>
        <PostHogProvider>
          {/* A useSearchParams miatt Suspense-határ kell (Next build-szabály). */}
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <Header />
          <main id="tartalom">{children}</main>
          <Footer />
          {/* GDPR consent-sáv: csak 'unknown' állapotban látszik, a body végén, a többi elem fölött. */}
          <ConsentBanner />
        </PostHogProvider>
      </body>
    </html>
  )
}
