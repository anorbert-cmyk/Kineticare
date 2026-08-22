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

## 2026-08-21 — Teljes main Security Review

Feldolgozott tartomány: `origin/main` HEAD `80cf258` (nem digest; Cursor
Security Review subagent, P0 auth/fizetés/számla/stream/jobok).

### Mi változott
A Security Review **megerősítette az M-17-et (High)** és az **M-06-ot
(Medium)**. Critical nincs. **M-10** a kódban javított (refund advisory-zár);
a megfigyelés-fájl lezárva. Az ingyenes kurzus igénylés ugyanazzal az
e-mail-kötéssel dolgozik, de claim-levelet küld — az M-17 a fizetős
vendégút.

### Mit jelent
Nincs új, a Bugbotnál súlyosabb rés. A fizetésjóváhagyás GetState v4 +
összeg-assert + advisory-zár. Runtime `confirmOrder` nincs.

### Tiltott zóna érintve?
Igen, 4. pont: az M-17 javítása access/auth, emberi döntés. 1–3 és 5 nem.

### Következő figyelnivaló
M-17 termékdöntés; M-06 felhasználó-szintű zár vs. elfogadott kockázat.

---

## 2026-08-21 — Teljes main Bugbot-átnézés

Feldolgozott tartomány: `origin/main` HEAD `80cf258` (nem digest-futás; a
`.cursor/agents/kineticare-bugbot.md` subagent + beépített Bugbot).

### Mi változott
A Bugbot egy új, magas súlyú találatot hozott, a kód megerősítette:
**M-17** (vendégfizetés e-mail-igazolás nélkül kötődik meglévő fiókhoz).
Ugyanebben a körben a kód alapján **M-12** és **M-14** lezárható lett
(credential-hook + webhook-retry K3 szűrő); a megfigyelés-fájl elavult
„nyitott/emberi döntés” státusza nem a jelenlegi `main`.

### Mit jelent
Az M-17 javítása auth/access döntés, ügynök nem nyúl hozzá. A P0
fizetési/stream útvonalakon a Bugbot más új kritikus hibát nem jelzett;
az M-06 (purchases read-modify-write) a `grantPurchases` kódjában továbbra
is fent van.

### Tiltott zóna érintve?
Nem. Nincs `confirmOrder`-hívás a runtime-ban (adapter dob + őr-teszt);
nincs kézi migráció; az M-17 javítása szándékosan nem készült el ebben a
körben, mert access/auth.

### Következő figyelnivaló
Emberi döntés az M-17-re (verify vs. claim-link vs. e-mail-csere utáni
újraigazolás). M-06 továbbra is nyitott.

---

## 2026-08-09 — Biztonsági kör 2: az élő triázs-találatok beépültek

A lezárt #39–#47 PR-ek triázsából élőnek bizonyult találatok javítása egy
körben, a `claude/higgsfield-mcp-integration-za6671` branchen (PR #52):

- **M-07 lezárva:** a `mapBarionPaymentStatus` a teljes Barion-státuszkészletre
  explicit ágakat kapott; a `Failed` a meglévő készlet `cancelled`
  végállapotára képződik (a `payment_failed` bekötése enum-migrációt
  igényelne — külön ticket), a rezervációs/ismeretlen ágak `warn`-t adnak.
- **M-11 lezárva:** refund advisory-zár (friss újraolvasással) +
  `RefundFailed` hibaág — sikertelen refundnál semmi sem íródik és számla sem
  indul; ismeretlen státusznál a nyom rögzül, bizonylat nem készül, riasztás.
- **M-13 lezárva:** a hozzáférés-lejárat kikényszerítését a #48 kör hozta.
- **M-15 lezárva:** a webhook-processzor regisztrációja determinisztikus
  (payload.config `onInit`), nem a callback-route betöltésének mellékhatása.
- **M-12 változatlanul emberi döntésre vár** (access-control — CLAUDE.md 4.
  zóna; a biztonsági körök szándékosan nem nyúltak hozzá).

Ugyanebben a körben: returnUrl-sanitizálás (open-redirect zárva),
Total/Currency-assert minden paid-átmenetnél, checkout advisory-lock +
orderNumber-retry, Barion-callback GUID-kapu, Turnstile kulcspár-assert,
per-email/per-user kérés-keretek, `email` a napló-redact-listán,
invoicePdfUrl-allowlist, kriptografikus seed-jelszó, CI/docs tényjavítások
(a `--legacy-peer-deps` valós oka a lockfile, nem peer-ütközés).

### Tiltott zóna érintve?

Nem. Séma-, migráció- és access-control-változás nincs ebben a körben;
`confirmOrder` sehol (dedikált guard-teszt őrzi); a pinned `@payloadcms/*`
és a lockfile érintetlen; titok nem került a repóba.

---

## 2026-07-31 — Mélyaudit: a főlánc kerek, de három ponton szivárog

Feldolgozott tartomány: nincs új commit — ez egy **kódaudit**, nem
változás-követés. Alap-commit: `f015bc3`.

### Mi történt

Ötdimenziós, ügynök-alapú audit futott a repón (állapotgép, refund,
access/paywall, hibaágak, konvenciók+tesztek), dimenziónként a két legsúlyosabb
találat **cáfolat-központú ellenőrzéssel**: a verifikátor feladata a találat
megdöntése volt, bizonytalanság esetén a cáfolat nyert.

Eredmény: **9 megerősített találat** (M-09..M-16, plusz M-07 megerősítése),
**1 megcáfolt**, és **13 további találat ellenőrizetlenül eldobva** a
dimenziónkénti top-2 korlát miatt. Ez a lista tehát nem teljes.

### Mit jelent

Az előző bejegyzésben azt írtam, a pénzügyi főlánc „kerek lett". A szerkezete
az — de az audit három olyan pontot talált, ahol a **pénz és a hozzáférés
szétcsúszik**:

1. **M-09 (magas):** a Barion ugyanarra a PaymentId-ra több callbackot küld, a
   dedup viszont csak a PaymentId-ra kulcsol, és a *nem-végleges* kimenetel is
   `processed`-re zárja az eseményt. Egy korai, függő callback után a **később
   érkező, sikeres callback no-opként eldobódik**: a pénz levonódik, a rendelés
   örökre `payment_pending`, a vevő nem kapja meg a videót. Ez nem elméleti — ez
   a normál Barion-viselkedés melléktermékeként bekövetkező adatvesztés.
2. **M-11 (magas):** a refund a Barion tranzakció-szintű státuszát eltárolja, de
   **sosem ágazik el rá**. `RefundFailed` esetén a rendszer visszavonja a
   hozzáférést, miközben a vevő a pénzét nem kapja vissza — és az API-n és az
   adminon keresztül sem korrigálható.
3. **M-10 (magas):** két párhuzamos refund egymásra ír, mindkettő `partial`-nak
   hiszi magát, egyik sem vonja vissza a hozzáférést — a teljes vételár
   visszautalva, a rendelés mégis `paid`.

Külön kategória a **M-12**: a `role` és a `purchases` mezővédelme gondos, de a
Payload auth által hozzáadott `password`/`email` mezőkre nem terjed ki, és a
`users.update` a staffnak minden rekordra szól. Egy staff tehát átírhatja az
owner jelszavát — **audit-bejegyzés nélkül**, mert a plugin csak a `role`
változását naplózza. Ez access-control kérdés, tehát a `CLAUDE.md` 4. pontja
szerint emberi döntés.

A megbízhatósági réteg két helyen csendben halott: a retry-job lapja
**betelhet** kimerült eseményekkel (**M-14**), a feldolgozó regisztrációja pedig
**egy route-modul import-mellékhatása** (**M-15**) — a cron-worker így elvileg
sosem találja meg.

És a lánc alapja tesztelhetetlen: az **ár-integritási hookot egyetlen futó teszt
sem fedi** (**M-16**) — a DB-s teszt kihagyódik, a unit-teszt pedig kimockolja
pont azt, amit ellenőriznie kellene. Ez az M-01-nél (hiányzó CI) sokkal
konkrétabb indok a kapuk beüzemelésére.

### Tiltott zóna érintve?

Nem. Az audit **csak olvasott**: alkalmazáskód, migráció, access-függvény és
függőség nem változott. A `confirmOrder`-védelmet az ügynökök előre ismerték
szándékos védelmi kódként, és nem is jelentették hibaként.

### Mi bizonyította, hogy az ellenőrzés dolgozik

Egy találat megbukott a szkeptikuson: az állítás szerint a
`webhook-audit-db.test.ts` kettős védőkorlátja miatt strukturálisan nem tud
elbukni. A verifikátor kimutatta, hogy a `beforeAll` próbája **csak olvasó
hívásokból áll**, ezért épp a feltételezett helyzetet (létező tábla, hiányzó
unique index) *nem* nyeli el — ott `tablesReady = true` lesz, és a teszt
hangosan bukik. A találat mechanizmus-leírása formailag stimmelt, a
következtetése nem.

### Következő figyelnivaló

- **M-09, M-11, M-12** a három, amit érdemes soron kívül eldönteni.
- A 13 ellenőrizetlen találat: ha kell, egy második kör mehet rájuk.
- A javítás továbbra sem a figyelés hatásköre — külön döntés és PR tárgya.

---

## 2026-07-31 — A fizetési főlánc bezárult: callback, refund, videó-paywall

Feldolgozott tartomány: `2c88b04..f015bc3` (13 commit)

### Mi változott

Három nagy blokk, kb. 3150 hozzáadott sor, ebből ~1470 teszt:

**T-022 — Barion-callback (`src/lib/barion-callback/`).** A `paid` átmenet
megérkezett, pontosan a korábban dokumentált elv szerint: a callback-payload
önmagában nem bizonyíték, a jóváhagyás kizárólag a szerver-szerver
`fetchPaymentState` (v4) verifikációból származik. A route-handler azonnal
dedupol a `webhook-events`-be és **azonnal 200-at ad** (a Barion 15 mp-es
elvárása miatt), a feldolgozás `next/server` `after()`-rel és a T-014
retry-jobbal aszinkron fut. A `webhook-events` két új mezőt kapott:
`processedAt` és `result` (`paid` / `cancelled` / `pending_repoll` /
`rejected` / `failed`); hiba esetén a `processedAt` **szándékosan üres marad**,
így az esemény újrapróbálható.

**T-025 — owner-indítású visszatérítés (`src/lib/refund/`).**
`POST /api/admin/orders/[orderNumber]/refund`, owner-only RBAC-cal (anon → 401,
staff → 403). Teljes és részrefundot is kezel; a Barion `TransactionId`-t az
első refund előtt a v4 GetState `Transactions` tömbjéből oldja fel, és a
`orders.refunds` json-nyomba menti újrahasználásra. Az `orders` collection új
`refunds` mezőt kapott: read owner-only, create/update zárt.

**Cloudflare Stream paywall (`src/lib/stream/`).** `GET /api/stream-token`
HS256-tal aláírt playback JWT-t ad (`sub` = streamAssetId, `exp` = videóhossz +
10 perc türelem, max. 24 óra), nulla extra függőséggel. A `CF_STREAM_SIGNING_KEY`
**nem induláskori kötelező ENV**, hanem kérés-idejű lazy ellenőrzés — hiányában
503, az app elindul.

### Mit jelent

- **A pénzügyi főlánc kerek lett:** checkout-start → Barion → callback → `paid`
  → `purchases`-jogosultság → aláírt videó-token. A `purchases` mező a lánc
  csuklópontja, és mezőszinten zárt (create/update `false` a `Users.ts`-ben) —
  kizárólag `overrideAccess`-szel írja a callback és a refund. A paywall tehát
  végig kikényszerített, nem csak konvenció.
- **Két helyen is ugyanaz a védelmi minta ismétlődik:** a jogosultság-írás és
  -levétel egyaránt **idempotens** (a meglévő elem no-op), és az állapotgép
  visszalépést nem enged — `paid` rendelést a `cancelled` callback sem billenti
  vissza, csak riasztást naplóz `rejected` eredménnyel.
- **Információminimalizálás a paywallban:** a vásárlás-ellenőrzés a termék
  lekérdezése *előtt* fut, így a 403 nem árulja el, létezik-e a termék. Ez
  tudatos enumeráció-védelem.
- **Részrefund ≠ hozzáférés-megvonás:** részösszegnél a rendelés `paid` marad és
  a vevő tovább nézi a kurzust; a `purchases`-levétel csak teljes refundnál fut,
  és ott is megvédi azt a terméket, amire a vevőnek másik `paid` rendelése van.
  Ez kommentben is indokolt döntés, nem véletlen.

### Tiltott zóna érintve?

Nem sérült egyik sem. A digest gyanújel-szűrője üresen futott. Részletesen:

- `confirmOrder`: nincs új hívás; a T-063 háromszoros védelem érintetlen.
- Migráció: **nem változott** — pedig az `orders.refunds` és a `webhook-events`
  két új mezője sémaváltozás. Ez így nem hiba (a Payload push/migrate-lépés
  külön fut), de a következő migráció-generálásnál rajta kell lennie.
- Access: `WebhookEvents.ts` és az `ordersCollectionOverride` bővült, de
  **szigorítás irányba** (owner-only read, zárt create/update); meglévő
  access-függvényt nem írt át senki. A refund-handler a meglévő `hasOwnerRole`
  predikátumot hívja.
- Titok: a `.env.example` egy kulccsal bővült érték nélkül, append-only módon.
- `any`: nincs. (Helyette `as unknown as ...` castok a plugin-generált
  típusok körül — lásd M-08.)

### Következő figyelnivaló

- **A `payment_failed` állapot továbbra sem érhető el** egyetlen kódúton sem —
  a Barion `Failed` státusz a mapper `default` ágán `payment_pending`-re fut.
  Új megfigyelés: **M-07**.
- **A `purchases` írása read-modify-write**, tranzakció nélkül — párhuzamos
  callbackek elveszíthetnek egy jogosultságot. Új megfigyelés: **M-06**.
- A kommentekben hivatkozott **poll-job** (a `pending_repoll` események
  újrafeldolgozása) még nem létezik — külön ticket.
- A számlázás (Számlázz.hu) még nincs bekötve, pedig az `orders` mezői
  (`invoiceStatus`, `invoiceNumber`, `invoicePdfUrl`) készen állnak rá.

---

## 2026-07-31 — Kiindulási felmérés (a figyelés indulása)

Feldolgozott tartomány: a repó kezdete..`2c88b04` (61 commit, 2026-07-29 óta)

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
