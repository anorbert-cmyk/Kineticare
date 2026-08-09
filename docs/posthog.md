# PostHog-integráció — beállítás és használat

> Termék-analitika a Kineticare-hez: oldalletöltések ($pageview) és üzleti
> funnel-események (course_viewed → checkout_started → purchase_confirmed).
> EU-cloud (GDPR), elsőfél-proxy (/ingest), CONSENT-FIRST kapcsolás.

## 1. PostHog-projekt létrehozása (~3 perc)

1. <https://eu.posthog.com> → regisztráció → **New project** (pl. `Kineticare`).
2. Project settings → **Project API key** kimásolása.
   Ez a NYILVÁNOS projekt-kulcs (kliensoldali) — NEM a személyes API-kulcs!

## 2. Bekötés a környezetbe

| Változó | Érték |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | a projekt API-kulcsa |
| `NEXT_PUBLIC_POSTHOG_HOST` | üres (default `https://eu.i.posthog.com`) |

Railway stagingen ugyanígy (Variables). Üres kulcs = az analitika kikapcsolt
(no-op — az app ettől függetlenül működik).

## 3. Hogyan működik (architektúra)

- **Elsőfél-proxy:** a kliens a saját domain `/ingest/*` útvonalát hívja, a
  Next (next.config.ts rewrites) továbbítja a PostHog EU-cloud felé —
  ad-blocker-ellenállóbb, first-party süti-működés.
- **CONSENT-FIRST:** a PostHog csak a látogató hozzájárulása után indul
  (`kc_analytics_consent=granted` localStorage). A consent-banner ezt a kulcsot
  írja és `kc:analytics-consent` eseményt szór — a provider erre bekapcsol,
  oldalfrissítés nélkül. Addig is: semmi nem mérődik. Ugyanerre az
  állapotgépre (`src/lib/analytics/consent.ts`) van kötve a Google Analytics 4
  is — lásd `docs/ga4.md`.
- **person_profiles: identified_only** — anonim forgalomból nem készül
  person-profil (költség- és adatminimalizálás).

## 4. Funnel-események (regiszter: src/lib/analytics/posthog.ts)

| Esemény | Hol keletkezik | Tulajdonságok |
|---|---|---|
| `course_viewed` | kurzus-oldal megnyitása | courseId, courseSku |
| `checkout_started` | a pénztár megnyitása | courseId, courseSku |
| `purchase_confirmed` | a köszönőoldalon a `paid` státusz | orderNumber |

PostHogban: **Product analytics → Funnels** → a három esemény egymás után.

## 5. Ellenőrzés

1. Állítsd be a kulcsot + indítsd az appot.
2. Böngésző konzolba: `localStorage.setItem('kc_analytics_consent','granted')`,
   majd frissíts — a Network-fülön a `/ingest/decide` és `/ingest/e/` hívások
   látszanak (saját domainen!).
3. PostHog **Activity** fülön perceken belül megjelennek a $pageview-k és a
   funnel-események.

## 6. Mit NEM mérünk

- Fizetési/kártyaadatokat (a Barion-folyamat a saját szigetén fut, ide semmi
  nem kerül be).
- Anonim felhasználók person-profilját (identified_only).
- Consent nélkül: SEMMIT (a kulcs beállítása önmagában nem indít mérést).
