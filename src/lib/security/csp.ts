/**
 * Content-Security-Policy összeállítás (OWASP A05 — Security Misconfiguration).
 *
 * A politika tiszta függvényként él itt, nem a `next.config.ts` belsejében:
 * így egységtesztelhető (lásd `src/__tests__/security/csp.test.ts`), és a
 * CI megvédi a fejlécet a csendes elrontástól. A `next.config.ts` csak
 * behívja és a válaszfejlécbe teszi.
 *
 * FONTOS ÜZEMELTETÉSI TUDNIVALÓ: a Next.js a `headers()` eredményét BUILD
 * IDEJÉN sütí bele a `.next/routes-manifest.json`-be. Env-változtatás után
 * ÚJRA KELL BUILDELNI, különben a régi fejléc megy ki (vö. CLAUDE.md
 * „a SUCCESS deploy nem jelenti, hogy az új kód fut").
 */

import { GA_TAG_MANAGER_ORIGIN, normalizeGaMeasurementId } from '../analytics/ga4'

/** A Bunny Stream lejátszó (iframe-embed) hostja — fix, nem env-függő. */
export const BUNNY_STREAM_IFRAME_SOURCE = 'https://iframe.mediadelivery.net'

/**
 * A GA4 (gtag.js) mérési végpontjai.
 *
 * A joker itt KÖTELEZŐ, mert a GA4 régió-specifikus gyűjtőhostokra küld
 * (`region1.google-analytics.com`, `analytics.google.com` aldomainek) —
 * pontos hostot nem lehet előre felsorolni. A joker szabályos: a legbaloldalibb,
 * TELJES címke helyén áll — vö. a `BUNNY_PULL_ZONE_WILDCARD_SOURCE` alatti
 * magyarázat a `vz-*` alakú, ÉRVÉNYTELEN jokerről.
 */
export const GA_COLLECT_SOURCES = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
] as const

/**
 * A Bunny pull-zone hostjának szabályos, egy címkés jokere.
 *
 * MIÉRT NEM `https://vz-*.b-cdn.net`: a CSP host-forrásában a joker (`*`)
 * KIZÁRÓLAG a legbaloldalibb, TELJES címke helyén állhat. A `vz-*` alak ezért
 * ÉRVÉNYTELEN forrás — a böngésző némán eldobja, és a pull-zone hostja
 * egyáltalán nem kerül fel a listára. Pontosan ez a hiba élt korábban a
 * `customer-*.cloudflarestream.com` mintában (valódi böngészőben bizonyítva:
 * docs/video-stream-keszenlet.md), és a Bunny hosztneve ugyanebbe a csapdába
 * hívna: fekete lejátszó, csak a konzolban látszó hibával.
 */
export const BUNNY_PULL_ZONE_WILDCARD_SOURCE = 'https://*.b-cdn.net'

/**
 * A pull-zone hosztnév megengedett alakja: EGY címke + `.b-cdn.net`
 * (pl. `vz-1a2b3c4d-5e6.b-cdn.net`).
 */
const PULL_ZONE_HOST_PATTERN = /^[a-z0-9-]+\.b-cdn\.net$/

/**
 * A Bunny pull-zone CSP-forrása (poszterképek, médiaforrás).
 *
 * - Ismert hosztnév (`NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST`) esetén a
 *   PONTOS hostot adja vissza (`https://vz-….b-cdn.net`), joker nélkül — ez a
 *   lehető legszűkebb, tehát a legbiztonságosabb szabály.
 * - Hiányzó vagy formailag gyanús érték esetén a SZABÁLYOS jokerre esik
 *   vissza, hogy a videó bekapcsolása egy elgépelt env miatt se törjön el.
 *
 * A hosztnév kisbetűsítve vizsgálódik (a DNS-név amúgy sem kis-nagybetű-érzékeny),
 * a szigorú minta pedig fejléc-injekció elleni védelem is: szóközt,
 * pontosvesszőt vagy jokert tartalmazó env-érték nem tud új direktívát
 * becsempészni a fejlécbe.
 */
export function bunnyPullZoneSource(rawHost: string | undefined): string {
  const host = typeof rawHost === 'string' ? rawHost.trim().toLowerCase() : ''
  if (host.length === 0 || !PULL_ZONE_HOST_PATTERN.test(host)) {
    return BUNNY_PULL_ZONE_WILDCARD_SOURCE
  }
  return `https://${host}`
}

/**
 * A teljes Content-Security-Policy fejléc-érték összeállítása.
 *
 * @param bunnyPullZoneHost a Bunny pull-zone hosztneve (env), ha ismert.
 * @param googleAnalyticsMeasurementId a GA4 mérési azonosító (env), ha be van
 *   állítva. A Google hostjai KIZÁRÓLAG ekkor kerülnek a fejlécbe: GA nélkül
 *   (és formailag hibás azonosító esetén) a politika marad a lehető
 *   legszűkebb. Ugyanaz a szigorítás, mint a pull-zone hosztnál.
 */
export function buildContentSecurityPolicy(
  bunnyPullZoneHost?: string,
  googleAnalyticsMeasurementId?: string,
): string {
  const pullZone = bunnyPullZoneSource(bunnyPullZoneHost)

  // A GA4 csak érvényes mérési azonosítóval tölt be (src/lib/analytics/ga4.ts),
  // ezért a CSP-t is pontosan ugyanaz az ellenőrzés nyitja.
  const gaEnabled = normalizeGaMeasurementId(googleAnalyticsMeasurementId).length > 0
  const gaScriptSource = gaEnabled ? ` ${GA_TAG_MANAGER_ORIGIN}` : ''
  const gaImgSources = gaEnabled ? ` ${GA_COLLECT_SOURCES[0]} ${GA_TAG_MANAGER_ORIGIN}` : ''
  const gaConnectSources = gaEnabled
    ? ` ${GA_COLLECT_SOURCES.join(' ')} ${GA_TAG_MANAGER_ORIGIN}`
    : ''

  return [
    // Alapértelmezés: minden erőforrás csak saját originről. A külön nem
    // felsorolt direktívák (manifest-src, prefetch-src…) is ezt öröklik.
    "default-src 'self'",

    // 'unsafe-inline' KÉNYSZER, nem kényelem:
    //  - a Next.js App Router minden oldalra inline bootstrap-scriptet ír
    //    (`self.__next_f.push(...)` — a szerver-komponensek adatfolyama),
    //  - a Payload admin szintén inline scripttel adja át a kezdőállapotot.
    // Kiváltani csak kérésenkénti nonce + 'strict-dynamic' párossal lehet,
    // amit a middleware-nek kellene generálnia ÉS a Payload adminnak is át
    // kellene vennie — külön, mért lépés (docs/video-stream-keszenlet.md).
    // 'unsafe-eval' NINCS, és nem is kell: sem a Turnstile, sem a videó-
    // beágyazás nem használ eval-t — ezt szándékosan nem lazítjuk fel.
    // A videó-szolgáltató hostja KIMARAD innen: a lejátszó kizárólag
    // IFRAME-ként van beágyazva, az iframe-en belüli scriptekre a beágyazott
    // dokumentum saját CSP-je vonatkozik. Innen tehát fölösleges (és
    // félrevezető) engedély lenne. A Turnstile viszont valódi <script src> a
    // challenges.cloudflare.com-ról (next/script), az marad. A gtag.js
    // (www.googletagmanager.com) valódi <script src>, ezért ide kell — de
    // CSAK beállított GA4-azonosító mellett.
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${gaScriptSource}`,

    // Beágyazott keretek:
    //  - iframe.mediadelivery.net → a Bunny Stream lejátszó: publikus
    //    hero-videó és előzetes (src/lib/hero-video.ts,
    //    src/components/courses/PreviewVideo.tsx) ÉS a védett, jegyes
    //    kurzuslejátszó (src/lib/stream/contract.ts) — mindkettő ugyanerről a
    //    hostról jön, csak a library-id és a token/expires más,
    //  - youtube-nocookie / player.vimeo → a szerkesztő által beilleszthető
    //    publikus videó-előzetes (src/components/lexical/serialize.tsx),
    //  - challenges.cloudflare.com → Turnstile-widget.
    `frame-src 'self' ${BUNNY_STREAM_IFRAME_SOURCE} https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com`,

    // data: a beágyazott SVG-/base64-ikonokhoz. A videó-poszterképek a Bunny
    // pull-zone hosztjáról jönnek (vz-….b-cdn.net). A GA4 tartalék-útja
    // képpont-kérés (a sendBeacon/fetch helyett), ezért a gyűjtőhostok a
    // Google dokumentációja szerint az img-src-be is kellenek.
    `img-src 'self' data: ${pullZone}${gaImgSources}`,

    // blob: KÖTELEZŐ — a kezdőlap filmsávja (ScrollScrub/FilmHero) a LOKÁLIS
    // klipet (public/media/film) fetch-csel tölti le, majd
    // URL.createObjectURL()-lel adja a <video> elemnek. Nélküle a nyitó
    // filmsáv NÉMÁN elhal (csak a poszterkép marad). A blob: nem külső
    // engedély: a saját oldal által létrehozott, azonos originű objektumot
    // jelenti. A pull-zone hoszt a Bunny médiafájljaihoz kell.
    `media-src 'self' blob: ${pullZone}`,

    // Minden XHR/fetch/sendBeacon a saját originre megy: a PostHog a /ingest
    // elsőfél-proxyn (next.config.ts rewrites), a filmsáv klipjei a /media/film
    // alól, a lejátszási token a /api/stream-token-ről.
    // A Barion NEM kell ide: a fizetőoldalra teljes oldalas átirányítás visz
    // (window.location a CheckoutForm-ban), amit a CSP nem korlátoz; a Barion
    // API-t pedig kizárólag a szerver hívja.
    // A GA4 viszont NEM megy elsőfél-proxyn: a gtag.js közvetlenül a Google
    // (régió-specifikus) gyűjtőhostjaira küld — ezek csak beállított
    // GA4-azonosító mellett nyílnak meg.
    `connect-src 'self'${gaConnectSources}`,

    // 'unsafe-inline' KÉNYSZER: a React inline `style={{…}}` attribútumai
    // (HeroVideo, ScrollScrub) és a Payload admin injektált <style> blokkjai
    // ide tartoznak. Szűkíthető lenne style-src-elem + style-src-attr
    // bontással — az admin regressziókockázata miatt külön, mért lépés.
    "style-src 'self' 'unsafe-inline'",

    // A betűtípusok a /public/fonts alól, saját originről jönnek.
    "font-src 'self'",

    // A PostHog session replay a tömörítő web workerét blob:-ból indítja;
    // enélkül a felvétel némán elhal. A blob: worker a saját origin kódja —
    // a posthog-js `data:` tartalék-ágát szándékosan NEM engedjük.
    "worker-src 'self' blob:",

    // Plugin-beágyazás (<object>, <embed>) sehonnan — nincs rá szükségünk.
    "object-src 'none'",
    // A <base> nem téríthet el relatív URL-eket idegen originre.
    "base-uri 'self'",
    // Űrlap kizárólag saját originre küldhető (a Barion-átirányítás nem űrlap).
    "form-action 'self'",
    // Clickjacking-védelem; az X-Frame-Options: SAMEORIGIN ennek a régi párja.
    // A Payload élő előnézet ugyanezen az originen fut, ezért a 'self' elég.
    "frame-ancestors 'self'",
  ].join('; ')
}
