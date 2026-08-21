# PostHog-integráció — beállítás, mérési terv, dashboardok

> Termék-analitika a Kineticare-hez. EU-cloud (GDPR), elsőfél-proxy (`/ingest`),
> CONSENT-FIRST kapcsolás. Munkamenet-felvétel NINCS — tulajdonosi döntés.

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

> **`NEXT_PUBLIC_*` = BUILD-IDEJŰ.** A Next a build pillanatában süti bele a
> bundle-be. A változó beállítása után **teljes újraépítés kell**, különben a
> régi (üres) érték marad a kiszolgált JS-ben, és a mérés némán nem indul el.

## 3. Hogyan működik (architektúra)

- **Elsőfél-proxy:** a kliens a saját domain `/ingest/*` útvonalát hívja, a
  Next (`next.config.ts` rewrites) továbbítja a PostHog EU-cloud felé —
  ad-blocker-ellenállóbb, first-party süti-működés. Ezért nem kell külön
  `connect-src` a CSP-ben: minden hívás saját originre megy.
- **CONSENT-FIRST:** a PostHog csak a látogató hozzájárulása után indul
  (`kc_analytics_consent=granted` localStorage). A consent-banner ezt a kulcsot
  írja és `kc:analytics-consent` eseményt szór — a provider erre bekapcsol,
  oldalfrissítés nélkül. Addig: semmi nem mérődik. Ugyanerre az állapotgépre
  (`src/lib/analytics/consent.ts`) van kötve a Google Analytics 4 is — lásd
  `docs/ga4.md`.
- **`person_profiles: 'identified_only'`** — anonim forgalomból nem készül
  person-profil (költség- és adatminimalizálás).

### 3a. Azonosítás — miért nem elég a beállítás önmagában

Az `identified_only` azt jelenti, hogy person-profil **kizárólag** akkor jön
létre, ha valaha lefut egy `identify()`. 2026-08-21-ig a repóban **egyetlen
`identify()` hívás sem volt** — tehát a profilok száma tartósan nulla lett
volna, és minden esemény anonim marad. A „ki tért vissza", „kik morzsolódtak
le", „mekkora a megtartás" kérdések így megválaszolhatatlanok lettek volna,
miközben a felület minden jele azt mutatta, hogy az analitika be van kötve.

Ezért:

| Mikor | Mi történik | Hol |
|---|---|---|
| Sikeres belépés / regisztráció | `identifyUser(users.id)` | `LoginForm`, `RegisterForm` |
| Kijelentkezés | `resetAnalyticsIdentity()` | `src/lib/logout-client.ts` |

Az azonosító a Payload **numerikus `users.id`** — a saját rendszerünkön kívül
semmit nem jelent. **E-mail, név, IP SOHA nem mehet be.**

A `reset()` nem opcionális: nélküle a kijelentkezés utáni események továbbra is
az előző felhasználó profiljára mennének. Közös gépen (rendelői tablet, családi
laptop) ez két különböző ember viselkedését olvasztaná egy profilba — egyszerre
mérési és adatvédelmi hiba.

## 4. Esemény-regiszter

Az egyetlen igazságforrás: `ANALYTICS_EVENTS` a `src/lib/analytics/posthog.ts`-ben.

### 4a. Értékesítési funnel

| Esemény | Hol keletkezik | Tulajdonságok |
|---|---|---|
| `$pageview` | minden útvonalváltás | `$current_url` (tisztított) |
| `course_viewed` | kurzus-oldal megnyitása | `courseId`, `courseSku` |
| `checkout_started` | a pénztár megnyitása | `courseId`, `courseSku` |
| `purchase_confirmed` | a köszönőoldalon a `paid` státusz | `orderNumber`, `value`, `currency` |
| `checkout_failed` | a pénztári beküldés elutasítása | gépi hibakategória |

### 4b. Lead-funnel (nem-vásárlói konverziók)

| Esemény | Mikor | Tulajdonságok |
|---|---|---|
| `lead_submitted` | a beküldés SZÁNDÉKA | `forras` |
| `lead_succeeded` | a szerver visszaigazolása | `forras` |

Források: `kapcsolat`, `idopontkeres`, `hirlevel`, `ingyenes-kurzus`.

**A kettő különbsége maga a mérőszám.** Ha sok a `lead_submitted` és kevés a
`lead_succeeded`, akkor az űrlap vagy a szerver hibázik — és ez a néma
beküldési hibák **egyetlen külső jelzője**, mert a szerveroldali napló csak
azt látja, ami odaért.

### 4c. Tanulási funnel

| Esemény | Mikor | Tulajdonságok |
|---|---|---|
| `course_started` | a kurzus első megnyitása | `courseId` |
| `video_started` | a lecke lejátszásának indulása | `courseId`, `lessonId` |
| `video_milestone` | 25 / 50 / 75 / 100% | `courseId`, `lessonId`, százalék |
| `lesson_completed` | a lecke teljesítése | `courseId`, `lessonId` |
| `module_completed` | a modul teljesítése | `courseId`, `moduleId` |
| `course_completed` | a kurzus teljesítése | `courseId` |

**A mérföldkövek leckénként EGYSZER mennek ki.** Visszatekerésnél nem
ismétlődnek — retesz védi. Enélkül egy ember többszörösen számítana, és a
tölcsér hamis képet adna.

## 5. Dashboard-terv (a PostHog projektben felépítendő)

Ez a rész **nem kód** — a PostHog felületén kell összeállítani. Sorrendben:

### D1 — Értékesítési tölcsér
Funnel: `course_viewed` → `checkout_started` → `purchase_confirmed`.
Bontás `courseSku` szerint. Ez válaszolja meg: melyik kurzusnál hol esnek ki.

### D2 — Bevétel
Trend a `purchase_confirmed` `value` tulajdonságának **összegére** (sum),
HUF-ban, heti bontásban. Mellé: átlagos kosárérték.

### D3 — Lead-tölcsér és néma hibák
Két idősor egy grafikonon: `lead_submitted` vs `lead_succeeded`, `forras`
szerint bontva. **Ha a két vonal szétnyílik, az beküldési hiba** — ezt érdemes
riasztásra is kötni.

### D4 — Tanulási lemorzsolódás
Funnel: `course_started` → `video_milestone` (25) → (50) → (75) → (100) →
`course_completed`. Ez mutatja meg, hogy a nézők hol hagyják abba — leckénként
bontva megtalálható a gyenge lecke.

### D5 — Megtartás (retention)
PostHog Retention: első esemény `course_started`, visszatérő esemény
`video_started`. **Ez a nézet csak azonosított felhasználókra értelmes** —
tehát a 3a. pont nélkül üres lenne.

### D6 — Hibák
`checkout_failed` idősor hibakategória szerint + a PostHog beépített
`$exception` nézete (a `captureAnalyticsException` táplálja).

## 6. Ellenőrzés

1. Állítsd be a kulcsot + **építsd újra** az appot (lásd a 2. pont figyelmeztetését).
2. Böngésző konzolba: `localStorage.setItem('kc_analytics_consent','granted')`,
   majd frissíts — a Network-fülön a `/ingest/decide` és `/ingest/e/` hívások
   látszanak (saját domainen!).
3. PostHog **Activity** fülön perceken belül megjelennek a `$pageview`-k és a
   funnel-események.
4. Lépj be egy teszt-fiókkal → a **Persons** listában meg kell jelennie egy
   profilnak a felhasználó numerikus azonosítójával. **Ha nem jelenik meg, az
   azonosítás nem fut** — ez a leggyakoribb néma hiba.

## 7. Mit NEM mérünk (szándékosan)

- **Munkamenet-felvétel (session recording): NINCS.** Tulajdonosi döntés
  (2026-08-21): „csak események és funnelek". A kliensben kifejezetten tiltva
  (`disable_session_recording: true`), nem a PostHog felületén — a
  projekt-oldali kapcsolót bárki átbillentheti anélkül, hogy a kódban nyoma
  maradna; a kliens oldali tiltás viszont a felvételt már az induláskor
  megakadályozza, a projekt-beállítástól függetlenül.
- **Fizetési és kártyaadat**: a Barion-folyamat a saját szigetén fut, ide
  semmi nem kerül be.
- **Anonim felhasználók person-profilja** (`identified_only`).
- **Consent nélkül: SEMMIT.** A kulcs beállítása önmagában nem indít mérést.
- **Személyes adat az esemény-tulajdonságokban**: e-mail, név, telefonszám,
  üzenetszöveg, cím SOHA. Kurzus- és lecke-azonosító igen. (A
  `src/lib/logger.ts` redact-listája a NAPLÓRA véd, a PostHog-hívásra nem —
  itt kézzel kell a fegyelem.)

## 8. Nyitott jogi tétel

**Az adatkezelési tájékoztatóban nevesíteni kell a PostHogot** mint
adatfeldolgozót (EU-cloud, mit tárol, meddig), ugyanúgy, ahogy a Barion is
hiányzik onnan (lásd `docs/barion-pixel-jogi-szovegterv.md`). Ez ügyvédi
szöveg — a kód nem tudja pótolni. Amíg nincs meg, a munkamenet-felvétel
bekapcsolása különösen nem javasolt.
