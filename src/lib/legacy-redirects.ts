/**
 * Örökölt (régi kineticare.hu) URL-ek megőrzése a domain-átállításhoz.
 *
 * ═══ MIÉRT ═══
 *
 * A régi, systeme.io-n futó kineticare.hu sitemapjában **25 URL** van, és
 * 2026-08-16-án MIND A 25 élt, HTTP 200-zal (mérés: lásd a lenti
 * „Reprodukció" blokkot és `docs/regi-oldal-osszehasonlitas.md` 8.1). A domain
 * átállításának pillanatában ezek mind 404-re futnának, mert az új rendszerben
 * más a slug-szerkezet. Ez nem csak SEO-veszteség: a `/kezrelax` a NYOMTATOTT
 * SZÓRÓLAP QR-KÓDJÁNAK a célja, tehát ott az átirányítás ügyfélszolgálati
 * kérdés, nem keresőoptimalizálás.
 *
 * Google: „Keep the redirects for as long as possible, generally at least 1
 * year", és a régi URL-ekhez előre kell térképet készíteni
 * (https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).
 * A `301` és a `308` egyenrangú: „The 301 and 308 status codes mean that a page
 * has permanently moved to a new location."
 * (https://developers.google.com/search/docs/crawling-indexing/301-redirects).
 * A Next.js `permanent: true` 308-at ad (RFC 9110 15.4.9), a repó a
 * kurzus-slugokra már ugyanezzel az indoklással használ 308-at.
 *
 * ═══ A HÁROM SORS ═══
 *
 * Minden örökölt URL PONTOSAN egy kategóriába esik, és a három halmaz uniója
 * kiadja a mért 25-öt (őr-teszt: `src/__tests__/orokolt-url-atiranyitasok.test.ts`):
 *
 * 1. `LEGACY_UNCHANGED_PATHS` — a slug változatlan, az új rendszer ugyanazon a
 *    címen szolgálja ki. Ezek NEM kaphatnak szabályt: a `redirects()` a
 *    fájlrendszer-útvonalak ELŐTT fut, tehát egy ilyen szabály elnyelné a
 *    valódi oldalt.
 * 2. `LEGACY_REDIRECTS` — tartós (308) átirányítás a mai kanonikus címre.
 * 3. `LEGACY_GONE_PATHS` — idegen spam-tartalom, amit nem irányítunk sehova:
 *    410 Gone, mert „the target resource is no longer available at the origin
 *    server and this condition is likely to be permanent" (RFC 9110 15.5.11).
 *    A 410-et a `redirects()` nem tudja kiadni (csak 301/302/303/307/308), ezért
 *    a `src/middleware.ts` ága szolgálja ki.
 *
 * ═══ AMIT A NEXT.JS INTÉZ HELYETTÜNK (mérve, nem feltételezve) ═══
 *
 * - **Záró perjel:** a repóban `skipTrailingSlashRedirect: true` van, tehát a
 *   Next NEM normalizálja a `/kezrelax/` alakot `/kezrelax`-ra. A saját
 *   szabályaink ettől függetlenül illeszkednek rá: a Next a custom route regexét
 *   `modifyRouteRegex`-szel zárja (`next/dist/lib/redirect-status.js`), ami a
 *   `$`-t `(?:\/)?$`-ra cseréli — az opcionális záró perjel tehát BENNE van a
 *   fordított regexben. Ezért nem kell (és nem is szabad) külön `/kezrelax/`
 *   forrást felvenni.
 * - **Nagybetűs alak:** az `experimental.caseSensitiveRoutes` alapértéke
 *   `false` (`next/dist/server/config-shared.js`), a route-fordítás
 *   `sensitive: false` — a `/KEZRELAX` ugyanerre a szabályra illeszkedik. A régi
 *   szerver ezt két lépésben oldotta meg (`/KezRelax` → 302 → `/kezrelax`); nálunk
 *   egy ugrás lesz, tehát láncot sem építünk.
 * - **Query string:** a bejövő URL query-paraméterei automatikusan átmennek a
 *   célra (`prepare-destination.js`: „Query merge order lowest priority to
 *   highest — 1. initial URL query values"). Az `utm_*`/`gclid` tehát nem vész el.
 * - **Horgony:** a `destination` `#`-es része megmarad (a `parsedDestination.hash`
 *   végigmegy), ezért adható meg a `/szolgaltatasok#rendeloi` cél.
 *
 * ═══ REPRODUKCIÓ (olvasó GET-ek) ═══
 *
 * ```bash
 * # A régi oldal 25 URL-je (4 rész-sitemap) — mind 200
 * curl -s https://www.kineticare.hu/sitemap.xml
 * # Az új célok — mind 200
 * B=https://kineticare-production.up.railway.app
 * curl -s -o /dev/null -w "%{http_code}\n" "$B/kurzusok/sos-kezrelax-villamkurzus"
 * # A kurzus-slugok kanonikus volta (az id-alapú cím ODA mutat)
 * curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/kurzusok/2"
 * # -> 308 .../kurzusok/sos-kezrelax-villamkurzus
 * # A #rendeloi horgony létezik a szolgáltatások oldalon
 * curl -s "$B/szolgaltatasok" | grep -o 'id="rendeloi"'
 * ```
 */

/** Egy örökölt forrás → mai kanonikus cél párosítás. */
export interface LegacyRedirect {
  /** A régi útvonal, gyökér-relatívan, záró perjel nélkül. */
  readonly source: string
  /** A mai kanonikus cím (horgony megengedett). */
  readonly destination: string
  /** Miért ez a cél — a `docs/orokolt-url-atiranyitasok.md` sorával egyezik. */
  readonly reason: string
}

/** A fizetős fő program mai kanonikus címe (mérve: `/kurzusok/1` → 308 → ez). */
export const COURSE_HOME_REHAB = '/kurzusok/otthoni-kezrehab-program'

/** Az ingyenes SOS villámkurzus mai kanonikus címe (mérve: `/kurzusok/2` → 308 → ez). */
export const COURSE_SOS_KEZRELAX = '/kurzusok/sos-kezrelax-villamkurzus'

/** A rendelői kezelések szekciója a szolgáltatások oldalon (mérve: `id="rendeloi"`). */
export const SERVICES_RENDELOI_ANCHOR = '/szolgaltatasok#rendeloi'

/**
 * A régi sitemap TELJES URL-listája, mérve 2026-08-16-án — ez az őr-teszt
 * bemenete. Ha a régi oldalra új URL kerül, ide is fel kell venni, és a teszt
 * addig bukik, amíg nem kap sorsot a lenti három lista valamelyikében.
 */
export const LEGACY_SITEMAP_PATHS: readonly string[] = [
  // funnel/5196791 + blog/349095
  '/',
  '/szolgaltatasok',
  '/rolunk',
  '/kapcsolat',
  '/search',
  '/rendeloi-kezelesek',
  '/best-places-to-visit-in-asia',
  '/best-time-to-visit-asia',
  '/mehtab-bagh-itmad-ud-daula-taj-mahal',
  '/top-places-in-china',
  '/kathmandu-nepal',
  // funnel/5196791
  '/kezrehab',
  '/kezrehab-penztar',
  '/typ-kezrehab',
  '/hamarosan',
  '/typ-hamarosan',
  '/rendeloi-kezelesek-regi',
  // funnel/5196787
  '/impresszum',
  '/adatvedelem',
  '/aszf',
  // funnel/5225778
  '/kezrelax',
  '/oto-kezrehab-akcio',
  '/kezrehab-akcio',
  '/kezrehab-akcio-penztar',
  '/typ-kezrehab-akcio',
]

/**
 * Változatlan slugok: az új rendszer UGYANAZON a címen szolgálja ki őket
 * (mérve: mind 200 az új hoszton, és mind benne van az új sitemapban).
 *
 * Szabályt NEM kapnak. A `redirects()` a fájlrendszer-útvonalak előtt fut, tehát
 * egy ide felvett szabály elnyelné a valódi oldalt — ezt őr-teszt tiltja.
 */
export const LEGACY_UNCHANGED_PATHS: readonly string[] = [
  '/',
  '/szolgaltatasok',
  '/rolunk',
  '/kapcsolat',
  '/aszf',
  '/adatvedelem',
  '/impresszum',
]

/**
 * Tartós (308) átirányítások. A sorrend nem számít (a források diszjunktak),
 * de a legfontosabb sor legelöl áll, hogy olvasáskor ne lehessen átsiklani rajta.
 */
export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  {
    // ═══ A SZÓRÓLAP QR-KÓDJÁNAK CÉLJA — a térkép legfontosabb sora. ═══
    source: '/kezrelax',
    destination: COURSE_SOS_KEZRELAX,
    reason:
      'A nyomtatott szórólap QR-kódja ide mutat. A régi landing az ingyenes SOS KézRelax anyagot kínálta; a mai megfelelője a kurzusoldal.',
  },
  {
    source: '/kezrehab',
    destination: COURSE_HOME_REHAB,
    reason:
      'A régi fő értékesítő oldal. Hirdetésekben és ajánlásokban is szerepel, ezért a legerősebb örökölt cím a QR után.',
  },
  {
    source: '/kezrehab-akcio',
    destination: COURSE_HOME_REHAB,
    reason: 'Akciós duplikátum ugyanarra a programra; a régi 39 700 Ft-os ár nem él tovább.',
  },
  {
    source: '/oto-kezrehab-akcio',
    destination: COURSE_HOME_REHAB,
    reason:
      'A régi ingyenes lánc egyszeri ajánlata (a /kezrelax urlRedirect célja). A visszaszámlálós sürgetést nem hozzuk át, a program célja viszont ugyanaz.',
  },
  {
    source: '/kezrehab-penztar',
    destination: COURSE_HOME_REHAB,
    reason:
      'SZÁNDÉKOSAN nem a /penztar: az a robots.txt-ben tiltott, és termékparaméter nélkül üres. A vevő a kurzusoldalról indítja a vásárlást.',
  },
  {
    source: '/kezrehab-akcio-penztar',
    destination: COURSE_HOME_REHAB,
    reason: 'Az akciós ág pénztára; ugyanaz az indok, mint a /kezrehab-penztar sorban.',
  },
  {
    source: '/typ-kezrehab',
    destination: COURSE_HOME_REHAB,
    reason:
      'Régi köszönőoldal, elavult szöveggel („a belépő e-mailben jön"). Vevőt ide irányítani félrevezető lenne; a semleges cél a kurzusoldal.',
  },
  {
    source: '/typ-kezrehab-akcio',
    destination: COURSE_HOME_REHAB,
    reason: 'Az akciós ág köszönőoldala; ugyanaz az indok, mint a /typ-kezrehab sorban.',
  },
  {
    source: '/rendeloi-kezelesek',
    destination: SERVICES_RENDELOI_ANCHOR,
    reason:
      'Az önálló oldal megszűnt, a tartalom a szolgáltatások oldal szekciójába került (mérve: id="rendeloi" jelen van).',
  },
  {
    source: '/rendeloi-kezelesek-regi',
    destination: SERVICES_RENDELOI_ANCHOR,
    reason: 'Elavult duplikátum (55/25 perces időpontokkal), amely élesben is elérhető maradt.',
  },
  {
    source: '/hamarosan',
    destination: '/kurzusok',
    reason:
      'Várólista-funkció ma nincs. A kurzuslista a legközelebbi értelmes cél; ha várólista készül, ez a sor arra áll át.',
  },
  {
    source: '/typ-hamarosan',
    destination: '/kurzusok',
    reason: 'A várólista köszönőoldala; ugyanaz az indok, mint a /hamarosan sorban.',
  },
  {
    source: '/search',
    destination: '/',
    reason:
      'Üres systeme.io-sablon, Kineticare-tartalom nélkül. Az új rendszerben nincs /search útvonal (mérve: 404), így a szabály nem nyel el valódi oldalt.',
  },
]

/**
 * 410 Gone: idegen spam-tartalom, ami a régi tárhelyre került. Nincs olyan mai
 * oldal, amire őszintén át lehetne irányítani — az átirányítás itt „soft 404"
 * lenne, és rontaná a domain minőségjelét.
 *
 * Megjegyzés a valósághoz: a Google mai dokumentációja szerint „All 4xx errors,
 * except 429, are treated the same"
 * (https://developers.google.com/search/docs/crawling-indexing/http-network-errors),
 * tehát a 410 NEM gyorsabb a 404-nél a Google indexében. A 410 mellett az szól,
 * hogy SZEMANTIKAILAG pontos (RFC 9110 15.5.11: a tartalom véglegesen megszűnt),
 * és más keresők/archívumok jelzésként használják.
 */
export const LEGACY_GONE_PATHS: readonly string[] = [
  '/best-places-to-visit-in-asia',
  '/best-time-to-visit-asia',
  '/mehtab-bagh-itmad-ud-daula-taj-mahal',
  '/top-places-in-china',
  '/kathmandu-nepal',
]

/**
 * A `next.config.ts` `redirects()` visszatérési értéke.
 *
 * MIND tartós (`permanent: true` → 308). Ideiglenes átirányítás itt hiba lenne:
 * a Google csak a tartósat veszi kanonikus-jelzésnek, és a régi cím maradna
 * indexben.
 */
export function buildLegacyRedirects(): Array<{
  source: string
  destination: string
  permanent: true
}> {
  return LEGACY_REDIRECTS.map((rule) => ({
    source: rule.source,
    destination: rule.destination,
    permanent: true,
  }))
}

/**
 * Útvonal-normalizálás a 410-es összevetéshez.
 *
 * A `redirects()` illesztését a Next végzi (kis-nagybetű-érzéketlenül, opcionális
 * záró perjellel) — a middleware-ágnak UGYANEZT kell tudnia, különben a
 * `/Kathmandu-Nepal/` alak kiesne a 410-ből, és 404-et kapna. A gyökér (`/`)
 * sosem rövidülhet üres stringre.
 */
function normalizeLegacyPath(pathname: string): string {
  const lowered = pathname.toLowerCase()
  if (lowered.length > 1 && lowered.endsWith('/')) {
    return lowered.slice(0, -1)
  }
  return lowered
}

const GONE_PATH_SET = new Set(LEGACY_GONE_PATHS)

/** Igaz, ha az útvonal a régi oldal spam-posztjainak egyike (410 Gone jár neki). */
export function isLegacyGonePath(pathname: string): boolean {
  return GONE_PATH_SET.has(normalizeLegacyPath(pathname))
}

/**
 * A 410-es válasz törzse.
 *
 * Zsákutca nem maradhat (`.claude/skills/termektervezes/SKILL.md` 5. pont): a
 * lapon van értelmes továbblépés a kezdőlapra. A szöveg magyar, mert a felület
 * nyelve magyar; a `lang="hu"` a képernyőolvasó helyes kiejtéséhez kell
 * (WCAG 2.2, 3.1.1 Language of Page).
 */
export const LEGACY_GONE_HTML = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ez az oldal megszűnt – Kineticare</title>
</head>
<body>
<h1>Ez az oldal megszűnt</h1>
<p>A keresett tartalom véglegesen lekerült a Kineticare oldaláról.</p>
<p><a href="/">Vissza a kezdőlapra</a></p>
</body>
</html>
`
