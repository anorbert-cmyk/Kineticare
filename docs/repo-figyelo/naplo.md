# Tanulási napló

Append-only: új bejegyzés mindig **felülre** kerül, korábbit nem írunk át.
Egy bejegyzés akkor születik, ha az utolsó ellenőrzés óta volt érdemi változás.

Bejegyzés-sablon:

```
## ÉÉÉÉ-HH-NN — <rövid cím>
Feldolgozott tartomány: <régi sha>..<új sha> (N commit)

### Mi változott
### Mit jelent
### Tiltott zóna érintve?
### Következő figyelnivaló
```

---

## 2026-07-31 — Kiindulási felmérés (a figyelés indulása)

Feldolgozott tartomány: a repó kezdete..`2c88b04` (50 commit, 2026-07-29 óta)

### Mi változott

Ez az első bejegyzés, így a teljes eddigi történet a tárgya. A repó két nap
alatt épült fel a jelenlegi állapotára; a részletes kép az
[`allapot.md`](./allapot.md)-ben. A fő mérföldkövek időrendben:

1. **Alapozás** — Payload 3.86.0 + ecommerce plugin bekötése HUF devizával,
   `customers: users` beállítással; vitest bekötése; idempotens seed.
2. **Jogosultság és integritás** — T-011 mezőszintű védelem (ár és publikálás
   owner-only), T-017 rendelés-integritás (orderNumber + ár-snapshotok
   szerver-oldalon).
3. **Tartalom-funkciók** — T-012 versions/drafts + duplikálás-hookok, T-013
   menüfa-validáció (max 2 szint, ciklus-gátlás), T-019 Media imageSizes és
   globális 10 MB feltöltési limit.
4. **Infrastruktúra** — T-014/T-015 webhook-idempotencia és audit-trail,
   T-018 e-mail provider-réteg magyar sablonokkal, T-016 kapcsolat űrlap
   Turnstile-előkészítéssel.
5. **Fizetés** — Barion kliensmodul (Start v2 / PaymentState v4 / Refund v2)
   mockolt fetch-es unit-tesztekkel, majd T-021 `POST /api/checkout/start` és
   T-063 plugin-adapter-kontroll.
6. **Séma-konszolidáció** — `sync_schema_code` migráció és több körös
   `payload-types` újragenerálás az orders állapotgéphez.

### Mit jelent

- A projekt **backend-first** halad: a pénzügyi lánc integritása (szerver-oldali
  ár, snapshot, idempotencia, állapotgép) előbb készült el, mint bármilyen
  felület. A frontend gyakorlatilag üres — ez tudatos sorrend, nem elmaradás.
- A `confirmOrder`-tilalom nem csak szabály a `CLAUDE.md`-ben: **kódban is ki
  van kényszerítve** (üres `paymentMethods` + `withoutPluginPaymentEndpoints`
  szűrő). Ez a repó legerősebb védelmi mintája, érdemes mintaként kezelni.
- A pinnelt `@payloadcms/*` verziók a Dependabot `ignore`-listáján vannak, tehát
  a „miért nem frissül a payload" kérdésre a válasz mindig: szándékosan.
- A `payload-types.ts` **generált**, de több commit is kézzel igazította
  (newline, hiányzó sor). Ez törékeny pont — a generátor és a kézi igazítás
  eltérése visszatérő hibaforrás lehet.

### Tiltott zóna érintve?

Nem. A vizsgált történetben nincs `confirmOrder`-hívás, nincs kézzel írt
migráció (a meglévő 3 generált), a `@payloadcms/*` verziók pinneltek, és
titok-jellegű érték nem került a repóba (`.env.example` értékek nélkül
dokumentál). Access-változás történt (T-011), de dedikált, dokumentált
ticketként.

### Következő figyelnivaló

- **T-022 (Barion-callback → `paid`)** — ez a következő lépés a főláncban.
  Ellenőrizendő lesz: a `paid` átmenet tényleg csak a callback-útvonalon
  történik-e, és a PaymentState-lekérdezés valóban a Barion válaszából dönt-e.
- A `docs/repo-figyelo/megfigyelesek.md` M-01 tétele (hiányzó CI-workflow-k) —
  amíg nyitott, a „zöld CI" elvárás nem ellenőrizhető.
- A `payload-types.ts` kézi igazításainak ismétlődése.
