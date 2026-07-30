# Állapot-pillanatkép

> Frissítve: **2026-07-31** · Alap-commit: `2c88b04` (`main`) · Commitok száma: 50

## Egy bekezdésben

A Kineticare egy kézrehabilitációs kurzusplatform: Next.js 15 (App Router) +
Payload CMS 3 monorepo egyetlen alkalmazásban, PostgreSQL adatbázissal. A repó
a **backend-alapozás** fázisában van: a tartalom-collectionök, a jogosultsági
mátrix, az audit- és webhook-infrastruktúra, az e-mail-réteg és a Barion
kliensmodul kész; a fizetési főlánc első fele (checkout-start) bekötve, a
callback-oldal (rendelés `paid`-re állítása) még hátra van. Frontend gyakorlatilag
nincs — az `src/app/(frontend)` egy alapértelmezett oldal.

## Stack és verziók

| Csomag | Verzió | Megjegyzés |
| --- | --- | --- |
| `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, `@payloadcms/plugin-ecommerce`, `@payloadcms/plugin-form-builder`, `@payloadcms/richtext-lexical` | `3.86.0` | **Pinned** — a Dependabot ezekre nem nyit PR-t (T-072) |
| `next` | `15.4.11` | |
| `react` / `react-dom` | `19.2.8` | |
| `typescript` | `5.9.3` | strict mód |
| `vitest` | `3.2.4` | `npm run test` |
| `eslint` | `9.39.5` | flat config (`eslint.config.mjs`) |

Node **20+**, PostgreSQL **16**, npm (lockfile commitolva). Hosting: Railway
(staging/prod), deploy nem a CI része.

## Modultérkép (`src/`)

```
app/(payload)/        Payload admin + REST/GraphQL route-ok
app/(frontend)/       Nyilvános felület — jelenleg csak a checkout-start API-route
  api/checkout/start/ POST /api/checkout/start (T-021)
collections/          Users, Media, Pages, Posts, Menus, Categories,
                      WebhookEvents, AuditLogs
plugins/ecommerce.ts  Az ecommerce plugin bekötése + products/orders override
plugins/audit.ts      Config-szintű audit-hook injekció (az ecommerce UTÁN fut)
access/               Központi jogosultsági réteg (policies.ts = a mátrix)
lib/barion/           Barion kliens: Start v2, PaymentState v4, Refund v2
lib/checkout/         Checkout-start üzleti logika + route-handler
lib/payments/         Saját Barion PaymentAdapter (szándékosan NEM regisztrált)
lib/email/            Provider-réteg (Resend / SMTP / noop) + magyar sablonok
lib/logger.ts         Strukturált napló request ID-val, redact-listával
lib/order-integrity.ts, order-number.ts, idempotency.ts, audit.ts,
lib/menu-validation.ts, duplicate.ts, slugify.ts, request-id.ts
jobs/                 Job-queue + webhook-retry task (ENABLE_JOB_WORKERS mögött)
migrations/           3 migráció — generált, kézzel nem szerkesztendő
env.ts                Induláskori ENV-assert (instrumentation.ts hívja)
middleware.ts         Bejövő kérések request ID-val való ellátása
__tests__/            15 vitest fájl
```

## Adatmodell és üzleti szabályok

**Saját collectionök:** Users (szerepkörök: `owner` / `staff` / customer),
Media, Pages, Posts (verziózva, draft-tal), Menus (max 2 szint, ciklus-gátlás),
Categories, WebhookEvents (idempotencia), AuditLogs.

**Plugin-collectionök:** products, orders, carts, transactions.
Az `addresses` collection **kiszűrve** (digitális termék; a plugin
`addresses: false` értéke önmagában nem tiltja le, ezért a plugin lefutása után
szűrjük).

**Kurzus (products) kiegészítő mezők:** `shortDescription`, `longDescription`,
`coverImage`, `gallery`, `category`, `previewVideoStreamId`, `videos[]`
(Cloudflare Stream asset + státusz), `accessDurationDays` (null = örök
hozzáférés), `status` (draft/published/archived, saját enum-névvel a `_status`
ütközés miatt), `sku` (unique, egyben a display-név), `relatedProducts`.

**Rendelés (orders) állapotgép — a projekt egyik sarokköve:**

```
created → payment_pending → paid | payment_failed   (+ cancelled, refunded)
```

A plugin gyári állapotai (processing/completed) kódoldalon megszűntek. A `paid`
átmenet **kizárólag a Barion-callback-útvonal (T-022) joga** — sem a
checkout-start, sem a plugin `confirmOrder`-je nem állíthatja.

**Rendelés-integritás (T-017):** `orderNumber` (`KH-<év>-<6 jegyű sorszám>`),
`totalHufSnapshot`, item-szintű `titleSnapshot` / `priceHufSnapshot` — mind
szerver-oldalon, `beforeChange`-hookban, **csak create-kor** töltődik; a kliens
által küldött ár sosem forrás.

**Deviza:** HUF, `decimals: 0`. **Variants** és **guest cart** kikapcsolva
(egy kurzus = egy ár, fiók kötelező).

## Jogosultság (T-011)

Központi réteg az `src/access/`-ben, a mátrix az `access/policies.ts`-ben
dokumentálva. Lényeg:

- `isAdmin` = `owner` + `staff`; a pénzügyi default mezők admin-only.
- **Ár-mezők** (`priceInHUF*`) create/update **owner-only** — a staff nem
  árazhat.
- **Publikálás** (`products.status`) szintén owner-only — a staff draftot
  készíthet, nem publikálhat.
- Owner-only **olvasás**: `customerSnapshot`, `ipAddress`, `invoiceNumber`,
  `barionPaymentId`.
- `isDocumentOwner`: a customer csak a saját orders/carts dokumentumait látja.
- Nyilvános olvasás csak publikált tartalomra (`adminOrPublishedStatus`).

> A `CLAUDE.md` szerint access-függvény módosítása **emberi jóváhagyást igényel**.

## Fizetés (Barion) — hol tart

- `lib/barion/` — kliensmodul: **Start v2**, **PaymentState v4**, **Refund v2**,
  mockolt fetch-csel unit-tesztelve; a titkok env-ből, az induláskori assert-tel.
- `POST /api/checkout/start` (T-021): input-validáció → termék/státusz-ellenőrzés
  → duplavásárlás-blokk (paid vagy aktív payment_pending → 409) → rendelés
  `payment_pending` státusszal → Barion `Payment/Start` (a `PaymentRequestId` az
  `orderNumber`, ez adja a Barion-oldali idempotenciát) → `barionPaymentId`
  mentése.
- **T-063 plugin-adapter-kontroll — háromszoros védelem a `confirmOrder` ellen:**
  1. a saját `PaymentAdapter` létezik, de **szándékosan nincs regisztrálva** (a
     plugin `paymentMethods` listája üres), így a `/payments/*` végpontok létre
     sem jönnek;
  2. a `withoutPluginPaymentEndpoints` szűrő a plugin lefutása után is eltávolít
     minden `/payments/*` végpontot — akkor is, ha egy későbbi módosítás mégis
     regisztrálná az adaptert;
  3. az adapter `confirmOrder`-je **mindig hibát dob**, sosem fut le sikeresen.

  Mindhármat unit-teszt őrzi (`checkout-start.test.ts`).
- **Következő lépés: T-022** — Barion-callback fogadása, állapot-lekérdezés
  (PaymentState v4) és a `paid` átmenet.

## Egyéb infrastruktúra

- **E-mail:** provider-réteg (Resend / SMTP / **noop**) — env nélkül sosem
  crashel; magyar sablonok; a Payload auth-levelei (forgot-password) is ezen
  mennek.
- **Kapcsolat űrlap (T-016):** a form-builder plugin form-submissions
  végpontján; opcionális Cloudflare Turnstile spam-védelem
  (`TURNSTILE_SECRET_KEY` jelenlétére kapcsol be); staff-értesítő e-mail
  best-effort (`CONTACT_STAFF_EMAILS`).
- **Audit + webhook (T-014/T-015):** webhook-idempotencia, audit-trail,
  `webhook-retry` job az `ENABLE_JOB_WORKERS` env mögött.
- **Feltöltés:** globális limit **10 MB**; Media imageSizes 320/640/1280/1920 +
  og 1200×630, webp, mimeType-szűrés.
- **Napló:** `lib/logger.ts` — strukturált, request ID-val (a `middleware.ts`
  adja), redact-listával. `console.log` használata tilos.

## Ticket-nyomvonal (commitüzenetekből)

Lezárt: **T-011** (mezőszintű védelem), **T-012** (versions/drafts + duplikálás),
**T-013** (menüfa-validáció), **T-014/T-015** (webhook-idempotencia +
audit-trail), **T-016** (kapcsolat űrlap), **T-017** (rendelés-integritás),
**T-018** (e-mail-réteg), **T-019** (Media imageSizes + 10 MB limit),
**T-021** (checkout-start), **T-063** (plugin-adapter-kontroll), **T-072**
(pinnelt verziók politikája).

Hivatkozott, még nyitott: **T-022** (Barion-callback → `paid`).

## Konvenciók (röviden)

- Branch: `feat/<ticket-id>-<rovid-nev>`, hibajavításra `fix/<ticket-id>-<rovid-nev>`.
- Commit: kis, fókuszált, scope-pal; magyar vagy angol.
- TypeScript strict, `any` tilos (helyette `unknown` + szűkítés).
- Felhasználónak szóló hibaüzenet **magyarul**.
- Kikommentezett kód nem maradhat a repóban.
