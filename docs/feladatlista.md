# Kineticare — teljes feladatlista

**Utolsó frissítés:** 2026-08-06, a Railway build-kihagyás javítása után.

## Állapot most

- main: `6560c7f`, CI zöld (typecheck 0, vitest 443/0, eslint 0 error, npm audit, gitleaks).
- **A Railway ténylegesen buildel.** Korábban `Build · skipped (nothing to build)`
  döntéssel kihagyta a build lépést, és a régi `.next/` mappát indította — a deploy
  „SUCCESS"-t mutatott, miközben hetekkel régebbi kód futott. Javítva: explicit
  `buildCommand` + `healthcheckPath: /admin` (lásd README „Deploy").
- **Az owner-fiók létrehozható és működik**: a `create-first-user` végigmegy
  (~1,6 mp), az első user `owner` szerepkört kap, és bejut az adminba.
- **Az adatbázis tartalma üres.** A hibakeresés során a Postgres-szolgáltatás
  újraindításakor `initdb` futott és a kötet üresen jött vissza; a séma a
  `payload migrate`-tel teljesen helyreállt (mind a 3 migráció), de tartalom
  nincs benne. Tartalom eddig sem volt — az adminba korábban nem lehetett belépni.

A lista 4 blokkra bomlik: **(A) azonnali, rajtad múló**, **(B) integrációk
(rajtad múló)**, **(C) fejlesztési backlog (CI véd)**, **(D) opcionális/későbbi**.

---

## A) Azonnali — ezek nélkül a staging „üres héj"

| # | Feladat | Hol | Megjegyzés |
|---|---|---|---|
| A1 | ~~Owner-fiók létrehozása~~ | `/admin` | **KÉSZ** (2026-08-06). |
| A2 | **Staff-fiókok**: Kocsis Kata, Kiss Kata | `/admin` → Users → Create New | A `role` mezőt **`staff`**-ra kell állítani — az alapértelmezés `customer`, azzal nem jutnak be az adminba. Jelszó: min. 12 karakter, kis+nagybetű + szám, az e-mail-címük ne legyen benne (a politika a 2. usertől él). |
| A3 | **Kurzusok feltöltése** (products): cím, rövid leírás, ár (`priceInHUFEnabled` + `priceInHUF`), sku, videó (később) | `/admin` → Products | A kezdőlap kurzuskártyái innen jönnek (`getPublishedProducts`). |
| A4 | **Kezdőlap-tartalom** (hero-szöveg, Rólunk-blokk, GYIK) | `/admin` → Pages (`kezdolap`) | A hero és a hitel-csík a CMS-mezőkből jön. |
| A5 | **„Hogyan működik" + GYIK tartalom** | `/admin` → Pages | Most statikus — a Katák döntik el, CMS-be kerüljön-e. |
| A6 | **Menüfa** (felső navigáció) | `/admin` → Menus | |
| A7 | **Posztok** (tudástár/blog) | `/admin` → Posts | A `/blog` oldal innen jön. |
| A8 | **Valódi testimonialok** a Katáktól | Katák → `/admin` → Pages | Fogyasztóvédelmi okból fiktív nem kerülhet ki — az M5-szekció szándékosan hiányzik, amíg nincs valódi idézet. |

---

## B) Integrációk — a valódi fizetés / számla / mérés éléséhez

| # | Feladat | Env-változó | Hol szerzed | Megjegyzés |
|---|---|---|---|---|
| B1 | **Barion sandbox** → valódi POSKey + payee | `BARION_POSKEY_TEST`, `BARION_PAYEE_EMAIL` | test.barion.com | Most álértékek — a fizetés nem indul el. Tesztkártyák: Successful `4444 8888 8888 5559`, ProblemWithCard `…4446`, LowFunds `…9999`, LostOrStolen `…1111`. |
| B2 | **Számlázz.hu** tesztkulcs | `SZAMLAZZ_AGENT_KEY` | szamlazz.hu (Számla Agent tesztfiók) | A számla- és stornó-jobok csak ezzel élnek. `valaszVerzio=2`, `szamlaKulsoAzon=orderNumber` idempotencia-horgony kész. |
| B3 | **PostHog** EU projekt-kulcs | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (EU: `https://eu.i.posthog.com`) | posthog.com (EU projekt) | A consent-banner és a funnel (`course_viewed` → `checkout_started` → `purchase_confirmed`) **kód szinten kész** — csak a kulcs hiányzik. Részletek: `docs/posthog.md`. |
| B4 | **Hero-videó** Cloudflare Stream | `HERO_VIDEO_STREAM_ID`, `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE` | Cloudflare Stream | A `HeroVideo` komponens kész (poster-first, reduced-motion, publikus iframe). Útmutató: `docs/hero-video-feltoltes.md`. |
| B5 | **Adatvédelem oldal** a CMS-ben | — | `/admin` → Pages (`adatvedelem`) | A consent-banner ide linkel, jelenleg 404. A legacy `adatvedelem.html` a forrás. |
| B6 | **E-mail (SMTP)** rendszer-levelekhez | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | SMTP-szolgáltató | A `src/lib/email/smtp.ts` STARTTLS-t kér (OWASP-fix). Az order-confirmation és a reset-password e-mail csak ezzel él. |
| B7 | **Claude GitHub App + `ANTHROPIC_API_KEY`** | GitHub repo secret | github.com/apps/claude + anthropic.com | A `@claude` megemlítés issue/PR-kommentben. A `ci.yml` és `gitleaks.yml` enélkül is fut. |
| B8 | **Google Search Console** bekötés | — (DNS TXT vagy HTML-meta) | search.google.com/search-console | Domain-tulajdon igazolás, sitemap beküldés, indexelés-figyelés. Ellenőrizni kell, hogy a `src/lib/seo.ts` mellé van-e `sitemap.xml` és `robots.txt` — ha nincs, az külön backlog-tétel (lásd C11). |
| B9 | **Google Analytics (GA4)** bekötés | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (új kulcs) | analytics.google.com | **Csak consent után tölthet be** — a meglévő consent-állapotgépre kell kötni, ugyanúgy, mint a PostHogot. A kód még nem tartalmaz GA-integrációt, ez fejlesztést igényel (lásd C12). |
| B10 | **Linear** bekötés | — | linear.app | Feladat- és hibakövetés. Eldöntendő: mennyire kösd a repóhoz (branch-név-konvenció `feat/<ticket-id>-…` már illeszkedik a Linear ticket-ID-khez), és kell-e GitHub↔Linear szinkron. |

> **Titkok:** egyetlen kulcs sem kerülhet a repóba — sem kódba, sem konfigba, sem
> kommentbe, sem tesztfixtúrába (CLAUDE.md TILOS ZÓNÁK 1.). A Railway
> szolgáltatás-változói közé kell felvenni őket; a repóban legfeljebb az
> `.env.example` bővül a kulcs nevével, **érték nélkül**.

---

## C) Fejlesztési backlog — CI véd, a main zöld marad

| # | Feladat | Prioritás | Megjegyzés |
|---|---|---|---|
| C1 | **Reset-password szerveroldali jelszópolitika** | HIGH | A Payload 3.86 `resetPassword`-je maga hash-el, a `beforeChange` nem fut → custom végpont kell. `POST /api/users/reset-password` + `validatePasswordStrength` + integrációs teszt. |
| C2 | **`@payloadcms/*` kormányzott bump** | Közepes | A peer-range `next <15.5.0`, ezért kell a `--legacy-peer-deps`; 20 tranzitív sebezhetőség (14 moderate + 6 high). Külön, kormányzott PR (CLAUDE.md 5.). A CI audit-kapu ezért `critical`-szintű. |
| C3 | **products `displayTitle` + `slug` mező** (SEO) | Közepes | A kurzus-URL most numerikus id: `/kurzusok/{id}` → `/kurzusok/{slug}`. A `ProductCard` és a `FreeSos` href-je is frissül. Összefügg a B8-cal. |
| C4 | **stornó-státusz mezők + retry-job** | Közepes | A stornó `szamlaKulsoAzon`-nal idempotens, de a státusz nem a DB-ben él. `stornoStatus`/`stornoNumber` a rendelésen + retry a retryable hibákra. |
| C5 | **Helyesbítő számla részrefundhoz** | Közepes | A stornó csak TELJES refundnál fut. `xmlszamla` + `helyesbitettSzamlaszam`. |
| C6 | **Consent-flow E2E** | Alacsony | A `consent.test.ts` 14/14 zöld, de valódi böngészős E2E kell a stagingen. |
| C7 | **PostHogProvider init→enable finomítás** | Alacsony | Granted esetén `enableAnalyticsCapture()` hívása `initPostHog()` helyett (opt-out perzisztencia miatt). |
| C8 | **Meglévő-vevő migráció (T-061)** | Közepes | A `grant:purchase` script kész — a tömeges importhoz CSV/JSON-olvasó kell. |
| C9 | **Newsletter** (footer-feliratkozás) | Alacsony | A `plugin-form-builder` kész, a bekötés a CMS-ben. |
| C10 | **Dependabot-kör figyelése** | Alacsony | A korábbi vitest security-update failure a placeholder-lockfile miatt volt; a következő Dependabot-PR megmutatja, rendbe jött-e. |
| C11 | **`sitemap.xml` + `robots.txt`** | Közepes | **Egyik sincs a repóban** (ellenőrizve: `src/` és `public/` alatt nincs találat) — a B8 (Search Console) előfeltétele. A `src/lib/seo.ts` mellé. |
| C12 | **GA4 bekötése a consent-állapotgépre** | Közepes | A B9 kódoldali fele. **A repóban jelenleg nincs GA-integráció** (ellenőrizve: nincs `gtag` / `googletagmanager` hivatkozás). GA csak `granted` consent után tölthet be, a PostHog-integráció mintájára. |

### Üzemeltetési tételek (2026-08-06-i hibakeresésből)

| # | Feladat | Prioritás | Megjegyzés |
|---|---|---|---|
| C13 | **`idle_in_transaction_session_timeout` a Postgresen** | Közepes | Ma egy beragadt, nyitva maradt tranzakció zárolta a `users` sort, és minden bejelentkezés befagyott. A DB-oldali timeout ezt magától feloldaná. |
| C14 | **Adatbázis-mentés** | HIGH (élesítés előtt) | Jelenleg nincs mentés. Ma a Postgres-szolgáltatás újraindításakor `initdb` futott és a kötet üresen jött vissza — tartalom még nem volt benne, de éles adatnál ez adatvesztés lenne. |

---

## D) Opcionális / későbbi

- **Többnyelvűség** (a Katák döntése — a szövegek most magyarul vannak).
- **Kupon / rendszer-kedvezmény** (a `plugin-ecommerce` támogatja).
- **Havi díjas tagság** (`plugin-ecommerce` subscriptions).
- **Mobilapp** (a webapp PWA-sítható).

---

## A leggyorsabb út a „teljesen élő" staginghez

1. **A2** (staff-fiókok) → **A3–A7** (tartalom) — enélkül a staging üres héj.
2. **B1** (Barion POSKey) → E2E a teljes vásárlási tölcséren, tesztkártyákkal
   (`docs/e2e-staging-runbook.md`).
3. **B2** (Számlázz.hu) → számla-kiállítás a tesztvásárlásnál.
4. **C1** (reset-password politika) — a legfontosabb fejlesztési tétel.
5. **C14** (mentés) — élesítés előtt kötelező.
