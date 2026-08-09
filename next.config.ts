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

  // OWASP A05: biztonsági HTTP-fejlécek minden válaszon. A CSP a Stream-
  // iframe (kurzus/előzetes/hero-videó), a Turnstile-widget és a PostHog
  // hostjaival van felépítve (a PostHog a /ingest elsőfél-proxyn megy, ezért
  // connect-src 'self' elég). Stagingen érdemes a karcolás-mentes bevezetéshez
  // Content-Security-Policy-Report-Only-val kezdeni.
  //
  // media-src `blob:` — KÖTELEZŐ a kezdőlapi filmsávhoz (ScrollScrub). A
  // görgetés-vezérelt scrub a klipet `fetch`-csel tölti le, majd
  // `URL.createObjectURL(blob)`-ból játssza: csak a memóriában lévő teljes
  // fájlon lehet akadásmentesen `currentTime`-ot ugrálni (a hálózati
  // Range-kérésekre épülő <video src="…mp4"> seekelése szaggat). A `blob:`
  // sémát a CSP NEM fedi le a `'self'` kulcsszóval, ezért külön kell
  // engedélyezni — enélkül a böngésző „Refused to load media from 'blob:…'"
  // hibával eldobja a videót, a ScrollScrub `data-video-failed`-re vált, és
  // élesben VÉGIG a poszterkép marad (a film letöltődik, de sosem játszik).
  // Kockázat: minimális — a `blob:` forrás csak a saját dokumentum által
  // létrehozott, azonos eredetű objektum-URL-eket engedi, külső hostot nem.
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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://iframe.cloudflarestream.com https://challenges.cloudflare.com",
              "frame-src 'self' https://iframe.cloudflarestream.com https://customer-*.cloudflarestream.com https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com",
              "img-src 'self' data: https://videodelivery.net https://customer-*.cloudflarestream.com",
              "media-src 'self' blob: https://videodelivery.net https://customer-*.cloudflarestream.com",
              "connect-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
