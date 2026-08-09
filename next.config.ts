import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

import { buildContentSecurityPolicy } from './src/lib/security/csp'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

const nextConfig: NextConfig = {
  // PostHog elsőfél-proxy: a kliens a saját domainünk /ingest útvonalát hívja,
  // a Next pedig továbbítja a PostHog EU-cloud felé (ad-blocker-ellenállás +
  // first-party süti-működés). A /ingest/static az assets-kiszolgálás (toolbar,
  // recorder, surveys); a /ingest/decide az egyszerű /ingest mintába tartozik.
  async rewrites() {
    const host = POSTHOG_HOST.replace(/\/+$/, '')
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: `${host}/:path*`,
      },
    ]
  },
  // A PostHog proxy átirányításai (pl. /decide → /flags) az origin-hostra
  // mutatnának — skip, hogy a kliens a saját domainen maradjon.
  skipTrailingSlashRedirect: true,

  // OWASP A05: biztonsági HTTP-fejlécek minden válaszon. Maga a CSP a
  // src/lib/security/csp.ts tiszta függvényében él (direktívánkénti magyar
  // indoklással és egységteszttel) — itt csak a válaszfejlécbe kerül.
  //
  // FIGYELEM: a headers() a BUILD idején értékelődik ki, és a
  // .next/routes-manifest.json-be sül bele — env-változtatás (pl. a Stream
  // fiókkód) után ÚJRA KELL BUILDELNI, különben a régi fejléc megy ki
  // (vö. CLAUDE.md „a SUCCESS deploy nem jelenti, hogy az új kód fut").
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE),
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
