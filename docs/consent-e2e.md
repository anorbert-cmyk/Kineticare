# Consent E2E — valódi böngészős hozzájárulás-kör

A `scripts/e2e/consent-e2e.mjs` egy önálló, ismételhető Playwright-harness,
amely a GDPR-consent folyamatot **valódi böngészőben** méri: friss profillal
indul, minden kimenő kérést megfigyel (`page.on('request')`), és PASS/FAIL
összegzést ad. Bukásnál a kilépési kód **1** (harness-hiba esetén 2).

**A védett szabály:** mérés (PostHog / GA4) **kizárólag megadott hozzájárulás
után** indulhat; az elutasítás és a hozzájárulás perzisztens; a visszavonás
működik.

---

## Futtatás helyben

Előfeltétel: fut a dev szerver (`npm run dev`, alapból `http://localhost:3000`).

A Playwright **szándékosan nem függősége a repónak** (a lockfile nem
szennyezhető egy fejlesztői eszközzel), ezért futásidőben oldódik fel:

1. `import('playwright')` — ha a projektben vagy a NODE_PATH-on elérhető,
2. `E2E_PLAYWRIGHT_MODULE` — közvetlen útvonal a modulra (globális telepítés).

```bash
# egyszeri telepítés (a repón kívül)
npm i -g playwright
npx playwright install chromium

# futtatás
node scripts/e2e/consent-e2e.mjs
```

Ha a globális Playwright nincs a Node feloldási útján (tipikus eset), add meg
explicit módon:

```bash
E2E_PLAYWRIGHT_MODULE=/opt/node22/lib/node_modules/playwright/index.js \
E2E_CHROMIUM=/opt/pw-browsers/chromium \
node scripts/e2e/consent-e2e.mjs
```

### Környezeti változók

| Változó | Alapértelmezés | Jelentés |
| --- | --- | --- |
| `BASE_URL` (1. argumentum) / `E2E_BASE_URL` | `http://localhost:3000` | A vizsgált példány gyökere |
| `E2E_PLAYWRIGHT_MODULE` | – | A Playwright modul útvonala, ha a sima import nem oldható fel |
| `E2E_CHROMIUM` | – | Böngésző-binárisa (`executablePath`); enélkül a Playwright saját letöltése |
| `E2E_EXPECT_ANALYTICS` | – | `1` → az elfogadás **után** mérés-forgalmat VÁR (staging, valódi kulccsal) |
| `E2E_CONSENT_PATHS` | `/kurzusok,/kapcsolat,/belepes` | A bejárt oldalak a perzisztencia-ellenőrzéshez |
| `E2E_SCREENSHOT_DIR` | – | Ide kerülnek a képernyőképek; üresen **nem készül kép** (a repó tiszta marad) |
| `E2E_SETTLE_MS` | `2500` | Mennyit vár a kérések leülepedésére lépésenként |
| `E2E_STRICT_CONSOLE` | – | `1` → az ismert dev-mode konzol-zaj is buktat |
| `E2E_FOCUS_LIMIT` | `10` | E fölött a Tab-lépésszám fölött külön figyelmeztetés megy a jelentésbe |

### Elvárt kimenet helyben

```
ÖSSZEGZÉS — 5 forgatókönyv, 46 PASS, 0 FAIL, 11 INFO
```

Az INFO sorok mérési eredmények, nem hibák (fókusz-sorrend, Escape hatása,
dev-mode konzol-zaj, HTTP-státuszok).

---

## Futtatás stagingen

```bash
E2E_PLAYWRIGHT_MODULE=… E2E_CHROMIUM=… \
E2E_EXPECT_ANALYTICS=1 E2E_STRICT_CONSOLE=1 \
node scripts/e2e/consent-e2e.mjs https://<staging-domain>
```

### A stagingen elvárt TÖBBLET-viselkedés

Helyben nincs `NEXT_PUBLIC_POSTHOG_KEY` és `NEXT_PUBLIC_GA_MEASUREMENT_ID`, ezért
a kliens **no-op**: elfogadás után sem indul kimenő mérés-kérés. A harness ezt
így is állítja (nem feltételezi az ellenkezőjét).

Stagingen — valódi PostHog-kulccsal — a **3. forgatókönyv kiegészül**:
az „Elfogadom" után az `/ingest` kérések **MEGINDULNAK** (a PostHog elsőfél-proxy
a `next.config.ts` rewrite-ján keresztül), és beállított GA4-azonosító mellett a
`googletagmanager.com/gtag/js?id=G-…` betöltés is elindul. Ezt az
`E2E_EXPECT_ANALYTICS=1` kapcsolja be: ilyenkor a „nulla kérés" nem PASS, hanem
FAIL — vagyis a **néma mérés-kiesés** (rossz kulcs, blokkolt proxy, elrontott
rewrite) is kibukik, nem csak a szivárgás.

Az 1., 2., 4. és 5. forgatókönyv elvárása stagingen VÁLTOZATLAN: hozzájárulás
előtt és elutasítás/visszavonás után **nulla** mérés-kérés — ott a valódi kulcs
mellett bizonyít igazán a kör.

---

## Mit fed le

| # | Forgatókönyv | Amit valódi böngészőben mér |
| --- | --- | --- |
| 1 | ANONIM, friss profil | Megjelenik-e a banner; üres-e a `kc_analytics_consent`; **nulla** mérés-kérés a betöltés alatt; nincs `dataLayer`/`gtag` globális; a PostHog-kliens nincs inicializálva; a banner tartalmaz-e adatvédelmi linket |
| 2 | ELUTASÍTÁS | A banner eltűnik; a tárolt döntés `denied`; 2–3 oldal bejárása után is **nulla** mérés-kérés; reload után sincs banner; a „nincs banner" élő, hidratált oldalról származik (a footer-gomb újranyitja — hamis-PASS elleni őr) |
| 3 | ELFOGADÁS | A döntés előtt nulla kérés; a tárolt állapot `granted`; reload után is `granted`; a mérés-forgalom elvárása környezetfüggő (lásd fent) |
| 4 | VISSZAVONÁS | Van-e visszavonási felület (footer „Süti-beállítások"); a banner döntés UTÁN is újranyílik; a visszavonás átírja a tárolt döntést `denied`-re, és ez perzisztens; utána nem indul új mérés-kérés |
| 5 | AKADÁLYMENTESSÉG | A gombok hozzáférhető neve; a konténer `role`/`aria-label`-je; hova kerül a fókusz betöltéskor; **hány Tab** kell a banner első gombjáig; mit csinál az Escape; működik-e a döntés Enterrel |

Mindegyik forgatókönyv **saját, friss böngésző-kontextusban** fut (üres
localStorage), és minden forgatókönyv gyűjti a konzolhibákat, a `pageerror`-okat
és a 4xx/5xx válaszokat.

### A megfigyelő „mérés-kérésnek" ezeket tekinti

`/ingest*` (PostHog elsőfél-proxy), `*.posthog.com`, `*.google-analytics.com`,
`*.googletagmanager.com`, `analytics.google.com`, `*.doubleclick.net`.

---

## Mit NEM fed le (és hol fedi más)

- **A consent-állapotgép ág-lefedettsége** (sérült tárolt érték, letiltott
  localStorage, SSR-eset, esemény-payload) — `src/__tests__/analytics/consent.test.ts`
  és `src/__tests__/analytics/consent-reopen.test.tsx`, injektált tárolóval.
- **A PostHog- és GA4-modul belső szerződése** (init-kapu, Consent Mode
  parancssorrend, `ga-disable-<ID>` kapcsoló, URL-tisztítás) —
  `src/__tests__/posthog.test.ts`, `src/__tests__/analytics/ga4.test.ts`.
- **A CSP-fejléc tartalma** (`'unsafe-eval'` tiltás, GA-host felvétele) —
  `src/__tests__/security/csp.test.ts`.
- **Valódi PostHog-eseménytartalom** (milyen mezők mennek ki): a harness csak a
  kérések LÉTÉT és célját méri, a payloadot nem elemzi.
- **Süti-szintű vizsgálat**: a consent `localStorage`-ban él, a PostHog
  first-party sütijei csak valódi kulcs mellett jönnek létre — a helyi kör így
  sütit nem tud ellenőrizni.
- **Több böngésző / mobil viewport**: a kör Chromiumon, asztali méretben fut.
- **Vásárlási és auth-folyamatok**: `docs/e2e-staging-runbook.md`.

---

## Ismert, mért megfigyelések (nem buktatják a kört)

1. **Fókusz-sorrend.** A banner a `<body>` végén ül (`src/app/(frontend)/layout.tsx`),
   fókusz-kezelés nélkül. A kezdőlapon **32 Tab-lépés** kell az első
   consent-gombig — a billentyűzetes látogatónak az egész lapot végig kell
   tabolnia a döntésig. A harness ezt `FIGYELEM` INFO-ként jelenti
   (`E2E_FOCUS_LIMIT`).
2. **Escape.** A banner `role="region"` (nem `dialog`), ezért az Escape nem
   csinál semmit. Ez GDPR-szempontból a **biztonságos** viselkedés (a néma
   bezárás hallgatólagos döntésnek látszana), a harness ezt állítja is: az
   Escape nem ad hozzájárulást és nem tünteti el a bannert döntés nélkül.
3. **Dev-mode konzol-zaj.** A React fejlesztői módja `eval()`-t kérne, a CSP-nk
   viszont szándékosan nem enged `'unsafe-eval'`-t (`src/lib/security/csp.ts`).
   Ez fejlesztői módban jelentkező zaj; production buildben nincs. Az
   `E2E_STRICT_CONSOLE=1` mellett mégis buktat — stagingen így futtasd.
4. **Az `/adatvedelem` a banner linkje.** Helyben, seedelt CMS-oldal nélkül
   **404**; a harness a státuszt INFO-ként kiírja. Stagingen/élesben ennek
   **200**-nak kell lennie, különben a tájékoztatási kötelezettség sérül.

---

## Hogyan ne kapjunk hamis PASS-t

A negatív állítások („nulla kérés", „nincs banner") csak akkor érnek valamit, ha
bizonyított, hogy a mérés maga működik. Két őr épült be:

- **Hidratálás-őr (2. forgatókönyv):** a „nincs banner" megállapítás után a
  footer „Süti-beállítások" gombja újranyitja a bannert — ez bizonyítja, hogy a
  lap élt, és a banner szándékosan volt rejtve.
- **Megfigyelő-őr:** a kérésfigyelő mintái ellenőrizve lettek szándékosan
  kiváltott `/ingest` és `googletagmanager.com` kéréssel — mindkettőt elkapja.
  Az `E2E_EXPECT_ANALYTICS=1` helyi futtatása pedig szabályosan FAIL-t és
  1-es kilépési kódot ad, tehát a harness tud bukni.
