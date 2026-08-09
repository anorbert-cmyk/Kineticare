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

/**
 * A Cloudflare Stream hostjának szabályos, egy címkés jokere.
 *
 * MIÉRT NEM `https://customer-*.cloudflarestream.com`: a CSP host-forrásában
 * a joker (`*`) KIZÁRÓLAG a legbaloldalibb, TELJES címke helyén állhat. A
 * `customer-*` alak ezért ÉRVÉNYTELEN forrás — a böngésző némán eldobja, és
 * a Stream hostja egyáltalán nem kerül fel a listára. Ez ma nem látszik (a
 * Stream még nincs élesítve), bekapcsoláskor viszont azonnal fekete lejátszó
 * lenne belőle.
 */
export const CLOUDFLARE_STREAM_WILDCARD_SOURCE = 'https://*.cloudflarestream.com'

/** A Cloudflare Stream fiókkód megengedett alakja (csak alfanumerikus). */
const CUSTOMER_CODE_PATTERN = /^[a-zA-Z0-9]+$/

/**
 * A Cloudflare Stream „customer" aldomainjének CSP-forrása.
 *
 * - Ismert fiókkód (`NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE`) esetén a PONTOS
 *   hostot adja vissza (`https://customer-<kód>.cloudflarestream.com`), joker
 *   nélkül — ez a lehető legszűkebb, tehát a legbiztonságosabb szabály.
 * - Hiányzó vagy formailag gyanús kód esetén a szabályos jokerre esik vissza,
 *   hogy a Stream bekapcsolása egy elgépelt env miatt se törjön el.
 *
 * A szigorú alfanumerikus szűrés egyben fejléc-injekció elleni védelem is:
 * szóközt/pontosvesszőt tartalmazó env-érték nem tud új direktívát becsempészni.
 */
export function cloudflareStreamCustomerSource(rawCode: string | undefined): string {
  const code = typeof rawCode === 'string' ? rawCode.trim() : ''
  if (code.length === 0 || !CUSTOMER_CODE_PATTERN.test(code)) {
    return CLOUDFLARE_STREAM_WILDCARD_SOURCE
  }
  return `https://customer-${code}.cloudflarestream.com`
}

/**
 * A teljes Content-Security-Policy fejléc-érték összeállítása.
 *
 * @param cfStreamCustomerCode a Cloudflare Stream fiókkód (env), ha ismert.
 */
export function buildContentSecurityPolicy(cfStreamCustomerCode?: string): string {
  const streamCustomer = cloudflareStreamCustomerSource(cfStreamCustomerCode)

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
    // 'unsafe-eval' NINCS, és nem is kell: sem a Turnstile, sem a Stream
    // beágyazás nem használ eval-t — ezt szándékosan nem lazítjuk fel.
    // A cloudflarestream.com KIKERÜLT innen: a Stream kizárólag IFRAME-ként
    // van beágyazva, az iframe-en belüli scriptekre a beágyazott dokumentum
    // saját CSP-je vonatkozik. Innen tehát fölösleges (és félrevezető)
    // engedély volt. A Turnstile viszont valódi <script src> a
    // challenges.cloudflare.com-ról (next/script), az marad.
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",

    // Beágyazott keretek:
    //  - iframe.cloudflarestream.com → publikus hero-videó (src/lib/hero-video.ts),
    //  - customer-<kód>.cloudflarestream.com → előzetes + védett kurzuslejátszó,
    //  - youtube-nocookie / player.vimeo → a szerkesztő által beilleszthető
    //    publikus videó-előzetes (src/components/lexical/serialize.tsx),
    //  - challenges.cloudflare.com → Turnstile-widget.
    `frame-src 'self' https://iframe.cloudflarestream.com ${streamCustomer} https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com`,

    // data: a beágyazott SVG-/base64-ikonokhoz. A Stream poszterképei a
    // videodelivery.net-ről (hero) és a customer-aldomainről (kurzus) jönnek.
    `img-src 'self' data: https://videodelivery.net ${streamCustomer}`,

    // blob: KÖTELEZŐ — a kezdőlap filmsávja (ScrollScrub) a klipet fetch-csel
    // tölti le, majd URL.createObjectURL()-lel adja a <video> elemnek.
    // Nélküle a nyitó filmsáv NÉMÁN elhal (csak a poszterkép marad). A blob:
    // nem külső engedély: a saját oldal által létrehozott, azonos originű
    // objektumot jelenti.
    `media-src 'self' blob: https://videodelivery.net ${streamCustomer}`,

    // Minden XHR/fetch/sendBeacon a saját originre megy: a PostHog a /ingest
    // elsőfél-proxyn (next.config.ts rewrites), a filmsáv klipjei a /media/film
    // alól, a lejátszási token a /api/stream-token-ről.
    // A Barion NEM kell ide: a fizetőoldalra teljes oldalas átirányítás visz
    // (window.location a CheckoutForm-ban), amit a CSP nem korlátoz; a Barion
    // API-t pedig kizárólag a szerver hívja.
    "connect-src 'self'",

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
