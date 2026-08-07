# Kineticare — kézrehabilitációs online kurzusplatform

Next.js 15 (App Router, server-component-first) + Payload CMS 3 (PostgreSQL) +
Barion Smart Gateway (kártyás fizetés) + Számlázz.hu Számla Agent (számlázás) +
Cloudflare Stream (kurzusvideók, signed URL) + PostHog (termék-analitika).

A stack és a döntések részletei a megvalósíthatósági tanulmányban
(`docs/kezrehabilitacios-weboldal-megvalosithatosagi-tanulmany.md`) és a
végrehajtási tervben (`docs/kezrehabilitacio-vegrehajtasi-terv.md`,
`docs/kezrehabilitacio-vegrehajtasi-terv-v2.md`).

## Fejlesztői gyorsindítás

**Node 24 kell** (Active LTS). A repóban van `.nvmrc`, tehát `nvm use` / `fnm use`
beállítja. Más majoron az `npm install` csak `EBADENGINE` figyelmeztetést ad és
lefut, de az éles futásidő Node 24 — ne azon fejlessz.

```bash
nvm use                  # vagy: fnm use — a .nvmrc szerint Node 24
cp .env.example .env     # töltsd ki a kötelező értékeket (lásd a fájlt)
npm install
npm run dev              # http://localhost:3000 (admin: /admin)
```

Kapuk (minden változás előtt/után — a CI is ezt futtatja):

```bash
npx tsc --noEmit         # typecheck
npx vitest run           # egységtesztek
npm run lint             # eslint
npm run build            # next build
```

Környezeti változók: `.env.example` (a titkok SOHA nem kerülnek a repóba;
`.env` gitignore-olt, staging/prod: Railway-változók).

## Dokumentáció (docs/)

| Terület | Fájl |
|---|---|
| **Feladatlista (mi van hátra)** | **`docs/feladatlista.md`** |
| Megvalósíthatóság | `docs/kezrehabilitacios-weboldal-megvalosithatosagi-tanulmany.md` |
| Végrehajtási terv | `docs/kezrehabilitacio-vegrehajtasi-terv.md` (+ `-v2.md`) |
| Megrendelői igények | `docs/megrendeloi-igeny-specifikacio.txt`, `docs/igeny-valtozas-pontok.md` |
| W3-indítási specifikáció | `docs/w3-inditas-specifikacio.md` |
| Deploy (Railway) | `docs/deploy-railway.md` + `railway.json` |
| Barion sandbox | `docs/barion-sandbox-setup.md` |
| E2E-futtatás | `docs/e2e-staging-runbook.md` |
| UX-hierarchia-audit | `docs/ux-hierarchia-audit.md` |
| OWASP biztonsági audit | `docs/owasp-security-review.md` |
| PostHog | `docs/posthog.md` |
| SEO / GEO / LLM-optimalizálás | `docs/seo-geo-llm.md` |
| Hero-videó feltöltés | `docs/hero-video-feltoltes.md` |
| Legacy-forrás | `docs/legacy/` |

## Szabályok (CLAUDE.md — a teljes lista ott)

- Titok sosem kerül a repóba (még placeholder-ként sem; tesztekben kifejezetten
  jelölt DUMMY érték szabad).
- A `confirmOrder` (ecommerce-plugin beta) hívása/importja/re-exportja TILOS —
  a `paid` átmenet kizárólag a Barion-callback-útvonal joga (v4-verifikáció).
- Manuális migráció-írás tilos — a séma-változás generált migrációval megy.
- Access-control (jogosultsági) módosítás csak emberi jóváhagyással.
- A `@payloadcms/*` verziók exact-pinnelve (3.86.0) — frissítés csak changelog
  + staging-E2E után.

## Fizetési és számlázási lánc (röviden)

- Checkout: `POST /api/checkout/start` → Barion Payment/Start v2 (Immediate,
  HUF, hu-HU), redirect a Barionra.
- Callback: `POST /api/barion/callback` → azonnali 200 + dedup, a jóváhagyás
  KIZÁRÓLAG szerver-szerver `GetPaymentState v4`-gyel (a callback-payload nem
  bizonyíték), idempotens státuszgép, retry-ladder.
- Elveszett callback-mentés: az `order-poll` job 5 percenként utánpollol
  (v4), árva-rendelés-lejárat, számla-resweep.
- Számlázás: `paid` átmenet után Számlázz.hu Számla Agent (invoice-issue job,
  szamlaKulsoAzon = rendelésszám — idempotens).
- Analitika: PostHog (EU-cloud, /ingest elsőfél-proxy, consent-first),
  funnel: course_viewed → checkout_started → purchase_confirmed.

## Deploy

Railway (staging + prod), a konfig a `railway.json`-ban; a lépések a
`docs/deploy-railway.md` runbookban. A CI-workflow-k (typecheck/vitest/lint/
build + gitleaks + npm audit) a `.github/workflows/` alatt élnek.

> **A `buildCommand` explicit megadása kötelező.** Nélküle a Railway builder
> „nothing to build" döntéssel **kihagyja a buildet**, lehúzza az új commitot,
> de a **korábbi `.next/` mappát** indítja el — a deploy zölden „SUCCESS"-t
> mutat, miközben hetekkel régebbi kód fut. A hibát csak a build-log
> `─ Build · skipped (nothing to build)` sora árulja el. A `healthcheckPath`
> szintén be van állítva, hogy egy induláskor halott build ne mehessen élesbe.
>
> **Figyelem:** a szolgáltatás dashboardon beállított értékei **felülírják** ezt
> a fájlt. Ha itt módosítasz valamit, ellenőrizd a service-beállításban is
> (`build.builder`, `buildCommand`, `healthcheckPath`), különben a fájl csak
> dokumentáció marad.
