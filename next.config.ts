import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

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
}

export default withPayload(nextConfig)
