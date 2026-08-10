# Átadás-dokumentum: Számlázz.hu-megfelelőségi kör (#53) — állapot, döntések, hátralévő munka

> **Kinek szól:** a következő agent-session (vagy emberi fejlesztő), aki a
> Számlázz.hu-integráció élesítését folytatja. **Készült:** 2026-08-09 ~23:30 UTC
> · **Frissítve: 2026-08-10 ~09:30 UTC** (élesítés után + igény-ellenőrzés:
> 8–11. szakasz). **Önálló dokumentum** — a session mulandó állapotára
> (scratchpad, futó folyamatok) nem támaszkodik; ami kell, az a repóban van.
>
> **A doksi két részből áll.** Az 1–7. szakasz a **lezárt** Számlázz.hu-kör
> naplója. A 8–11. szakasz **kiadható feladat** a következő agentnek —
> ott kezdd, ha új munkát veszel fel.

---

## 0. HA CSAK EGY DOLGOT OLVASOL EL

🔴 **`orders.refunds` oszlop hiányzik az éles adatbázisból** (8. szakasz).
Bizonyítottan: tiszta DB + a commitolt migrációk után `NODE_ENV=production`
mellett **minden orders-olvasás és -írás elszáll**. Élesben ez azt jelenti,
hogy az admin Rendelések listája és **az első valódi vásárlás is hibára fut**.
Azért nem robbant még be, mert a pénzútvonal élesben még nem futott.
Javítás: Payload-generált migráció, kb. 15 perc — a recept a 8.4-ben.

## 1. Pillanatkép — hol tartunk

- **✅ A KÖR ÉLESBEN VAN.** main: **`b013f15`** — a #56 PR squash-merge-elve,
  a Railway-deploy SUCCESS, **mindkét migráció lefutott**, az app válaszol.
  A teljes bizonyíték-tábla a 4. szakasz végén („ÉLESÍTÉS MEGTÖRTÉNT").
- **Előzmény a mainen:** `5d6f5da` (#52 — C-backlog + biztonsági kör 2).
- **PR #56:** merged — https://github.com/anorbert-cmyk/Kineticare/pull/56.
- **Kapu-állapot a merge előtt:** typecheck ✔ · vitest **1335 passed / 0 failed**
  ✔ · lint 0 error (1 örökölt, dokumentált warning) ✔ · build ✔; GitHub CI 5/5.
- **✅ A REVIEW MIND A 21 FINDINGJA LEZÁRVA** (F1–F17; F17 tudatosan elfogadott
  korlátként dokumentálva). A javító-kört 4 Opus-ügynök végezte, a döntések a
  4. szakaszban maradtak meg — **teljesítés-naplóként**, hogy a teszt-fiókos
  validálásnál visszakereshető legyen, mit miért így oldottunk meg.
- **⚠️ FONTOS: a számlázás élesben MÉG KIKAPCSOLT.** A `SZAMLAZZ_AGENT_KEY`
  Railway-változó nincs beállítva, ezért a kód `enabled=false` ágon fut (szándékos
  no-op) — a Számlázz.hu felé egyetlen hívás sem megy ki. A bekapcsolás
  előfeltételei a 4. szakasz végén („AMI MÉG HÁTRAVAN").

## 2. Kontextus — mi zárult le ma (előzmények)

1. **Biztonsági kör 2** (task #50): a leállt workflow worktree-maradványaiból a fő
   szálban felszüretelve, 16 commit, teljes kapu + 3-lencsés önreview → **PR #52**.
2. **#48 lánc**: push → PR #52 leírás (KIEMELT access-control szekcióval:
   `stornoNumber` + `correctiveInvoiceNumber` owner-only olvasás, üzemeltetői
   utasításra) → CI zöld (6/6) → squash-merge → **Railway-deploy igazolva** →
   **PR #40 lezárva** (meghaladott; magyarázó komment a PR-en).
3. **Számlázz.hu-kutatás** (task #52): 4 kutató + szintézis → **45 hivatalos
   követelmény** (A1–A16, B1–B9, C1–C10, D1–D10) → a repóban:
   `docs/szamlazz-hivatalos-kovetelmenyek.md`.
4. **#53 implementáció** (ez a kör): lásd 3. szakasz.

## 3. A kör commitjai a branchen (időrendben)

| Commit | Tartalom |
| --- | --- |
| `af34826` | 5 új orders-mező a sémában (invoiceAttempts/LastError/CompletionDate, correctiveInvoiceAttempts/LastError) + redact-lista (`agentkey`, `szamlaagentkulcs`) |
| `a170bab` | Kliens-mag: **záró perjeles végpont** (redirect-POST→GET veszély ellen), **hibakód-osztályozás** (1 → retryable; 71/152 → `duplicate`-kind), új `pdf.ts` (xmlszamlapdf-lekérdezés `szamlaKulsoAzon` alapján, 7-es kód → null), `SZAMLAZZ_AFAKULCS` konfig ('27'\|'AAM', hangos validáció), új `xml.ts` (escapeXml, körimport-mentesen) |
| `9f771a7` | Folyamatok: retry-előtti lookup + 71/152-feloldás mindhárom ágon; perzisztens kísérlet-plafon (max 5); stornó-XML **dátumok nélkül**; helyesbítő az eredeti teljesítési dátumot ismétli (`invoiceCompletionDate`); **egységár-alapú** tételszámítás; `fizmod=Barion` |
| `8fb80cb` | Generált migráció: az 5 új orders-oszlop (helyi PG-n lefuttatva) |
| `f6c977b` | **+31 teszt** (Opus T1-ügynök): lookup.test.ts (stubolt fetch), osztályozás, qty>1 egyenletek, AAM, dátum-öröklés, duplikátum/retry/plafon-ágak — mutációs ellenőrzéssel |
| `6c9a03f` | **docs/szamlazz-megfeleles.md** (Opus T2-ügynök): 45 soros követelmény-tábla státuszokkal, 8 teszt-fiókos forgatókönyv (T1–T8), 8 pontos fiók-oldali checklist, üzemeltetési jegyzet + a szamlazz-storno.md tényjavításai |
| (kicsi) | stornoAttempts admin-leírás konzisztencia |
| `01b5726` | `correctiveInvoiceAttemptsSeq` oszlop + generált migráció (az F1 előkészítése) |
| `0a466fb` | A hivatalos követelmény-szintézis a repóba |
| `395f0a5` | Ez az átadás-doksi (első kiadás) |

### 3.b A JAVÍTÓ-KÖR commitjai (2026-08-10, 4 Opus-ügynök + kézi összefésülés)

| Commit | Tartalom |
| --- | --- |
| `436d847` | **F2, F5, F7, F9** — hibrid tételszámítás (tétel-szintű nettó-kerekítés, 2 tizedes egységár), bizonylat-egyedi `rendelesSzam` a helyesbítőn, `YYYY-MM-DD` dátum-kapu + escape, Europe/Budapest kiállítási dátum (`xml.ts`: `budapestDateString`, `isIsoDateString`) |
| `109279a` | **F1, F3, F4, F10, F11** — seq-kulcsolt helyesbítő-plafon, a stornó-`szamlaKulsoAzon` és a rá épült lookup kivezetése + eszkaláció, retryable→`pending` a számla-ágon, lookup nem fogyaszt keretet, duplikátum-tény megőrzése a hibaüzenetben |
| `456939f` | **F6, F12, F13, F16** — közös `bodyReadError` (törzs-olvasás osztályozása mindhárom kliensben), URL-query megőrzése + credential-tiltás, `szlahu_error` dekódolás, `SZAMLAZZ_AFAKULCS` induláskori assert |
| `f5622b0` | Tesztek minden ágra (a suite 1295 → **1335** zöld) |
| `157d110` | A két doksi átvezetése a javított állapotra (C6 → TISZTÁZANDÓ, új T-tételek, A9/A12/A14 igazítás, F17-szakasz) |

> **Összefésülési jegyzet:** az `invoice.ts`-t két ügynök is szerkesztette (A: builder
> + számítás + docblock; B: `issueInvoiceForOrder` folyamat). A 4 konfliktus
> kommentekre és egy importra szorítkozott, kézzel oldva fel; a `storno.ts`
> duplikált `isAbortError`-ját a C által bevezetett közös helperre cseréltem.
> A B által előre jelzett 2 teszt-igazítás (F4/F10) és az F8 új állítása a
> `szamlazz.test.ts`-ben elvégezve.

## 4. A REVIEW 21 FINDINGJA — DÖNTÉSEK ÉS TELJESÍTÉS ✅

> **STÁTUSZ (2026-08-10): mind a 17 tétel (F1–F17) LEZÁRVA.** Ez a szakasz már
> nem feladatlista, hanem **teljesítés-napló**: megőrzi, mit miért így oldottunk
> meg — a teszt-fiókos validálásnál és a későbbi vitákban ez a hivatkozási pont.
> Az F17 tudatosan elfogadott korlátként, dokumentálva zárult.

A 3 lencse (helyesség / szabályzat / protokoll-biztonság) findingjai
duplikátum-összevonás után, **döntésekkel**. Jelölés: 🔴 = súlyos, 🟡 = kisebb.
A hivatkozott sorszámok a `01b5726` állapotra értendők — a friss kódot olvasd.

### F1 🔴 `corrective.ts` — a kísérlet-plafon rendelés-szintű, nem bizonylat-szintű
- **Hiba:** a `correctiveInvoiceAttempts` minden refundSeq beküldését egy közös
  számlálóba gyűjti és sosem nullázódik → több részrefund után a későbbi bizonylat
  jogtalanul „kimerült"-re fut; ráadásul új seq-nél a `previousAttempts > 0` miatt
  értelmetlen retry-előtti lookup fut a még nem létező kulcsra.
- **DÖNTÉS (előkészítve):** a számláló **seq-kulcsolt** lesz. Az oszlop
  (`correctiveInvoiceAttemptsSeq`) és a migrációja MÁR A BRANCHEN VAN (`01b5726`).
  Implementálandó a `corrective.ts`-ben:
  ```
  const attemptsSeq = order.correctiveInvoiceAttemptsSeq ?? 0
  const previousAttempts = attemptsSeq === deps.refundSeq
    ? (order.correctiveInvoiceAttempts ?? 0) : 0
  ```
  és MINDEN attempts-írás mellé `correctiveInvoiceAttemptsSeq: deps.refundSeq`.
  A plafon-ellenőrzés és a `previousAttempts > 0` lookup-feltétel így magától
  bizonylat-szintű. Teszt: 2. refund friss számlálóval indul; kimerült seq1 nem
  blokkolja seq2-t; azonos seq retryje tovább számol.

### F2 🔴 `invoice.ts` `computeLineAmounts` — qty>1 áfa-egyenlet-drift
- **Hiba:** az egységár-alapú kerekítés az A9 2. egyenletét
  (`nettoErtek × 27% ≈ afaErtek`) a mennyiséggel arányosan rontja (qty=7 → 1,4 Ft;
  qty=99 → ~20 Ft) → 260/263 hibakód-kockázat; a checkout 1–99 db-ot enged.
- **DÖNTÉS — hibrid számítás:**
  ```
  bruttoErtek = bruttoUnit × qty                     (pontos)
  nettoErtek  = round(bruttoErtek / 1,27)            (tétel-szintű)
  afaErtek    = bruttoErtek − nettoErtek             (3. egyenlet pontos, 2. ±0,64 Ft)
  nettoEgysegar = (nettoErtek / qty) 2 tizedesre, stringként
                                                     (1. egyenlet ≤ 0,005×qty ≤ 0,5 Ft)
  ```
  AAM: netto=brutto, afa=0, egysegar=netto/qty (2 tizedes). qty=1-nél a mostani
  viselkedés változatlan (egész egységár). A docblockba MINDHÁROM egyenlet + a
  tolerancia-indoklás. **Tesztek frissítése:** az „egyenlet PONTOSAN" teszt
  cserélendő: |egysegar×qty − netto| ≤ 0,5 és |netto×0,27 − afa| ≤ 1 minden
  qty-re (1/3/7/10/99); a megfeleles-doksi A9-sora + új T-tétel (qty>1
  teszt-fiókos validálás).

### F3 🔴 `storno.ts` — a `-STORNO` kulsoAzon-feltevés nem igazolt, vak újraküldés veszélye
- **Hiba:** a C3 szerint az `xmlszamlast`-beli `szamlaKulsoAzon` a SZTORNÓZANDÓ
  számlát hivatkozza — nem a létrejövő stornónak ad azonosítót. A retry-lookup
  „nincs találat" (7-es kód) válasza így NEM bizonyítja, hogy nincs stornó → a
  vak újraküldés dupla stornót csinálhat (ami a C5 szerint javíthatatlan).
- **DÖNTÉS — konzervatív visszavágás:**
  1. A stornó-XML-ből **kivenni a `szamlaKulsoAzon` mezőt** (a `fejlec.szamlaszam`
     az egyértelmű, kötelező hivatkozás; a `-STORNO` érték rosszabb esetben
     ütközést okoz).
  2. A stornó-ágon a retry-előtti lookupot és a 71/152→lookup feloldást
     **eltávolítani**; helyette: `previousAttempts > 0` esetén NE küldjön be
     vakon újra — `failed` + **error-szintű RIASZTÁS**: „a stornó állapota
     bizonytalan, kézi ellenőrzés kell a Számlázz.hu-fiókban". A duplicate-kind
     hibára ugyanez (failed + riasztás, kézi egyeztetés).
  3. Az alkalmazás-szintű no-op (stornoNumber/stornoStatus) marad az elsődleges védelem.
  4. `docs/szamlazz-megfeleles.md`: C3/C5/A12-stornó sor **TISZTÁZANDÓ**-ra;
     új T-tétel: teszt-fiókban igazolni, visszakereshető-e a stornó a kérésben
     küldött kulsoAzon-nal — ha igen, a lookup-ág visszahozható.
  5. storno.test.ts: az érintett tesztek (lookup-adopt, duplikátum-adopt) átírása
     az új viselkedésre.

### F4 🔴 `invoice.ts` — retryable hibánál `failed` státusz → kiesik a resweepből
- **Hiba:** retryable hibán `invoiceStatus='failed'` íródik; az order-poll resweep
  csak `['none','pending']`-et vesz fel → a job kimerülése után a számla örökre
  elveszik, csak warn szól.
- **DÖNTÉS:** retryable hibaágon a státusz **maradjon `'pending'`** (a hibát az
  `invoiceLastError` hordozza + warn); csak végleges hibán legyen `'failed'`.
  Így a resweep (INVOICE_PENDING_STALE_MS után) újra sorba állítja, a perzisztens
  5-ös plafon pedig valóban fékez, és a plafon-ág error-riasztása elérhetővé
  válik. CSAK az invoice-ágon (stornó/helyesbítő újrasorbaállítását a refund-
  folyamat queue-hívása végzi, ott nincs resweep). Teszt: retryable → pending
  marad + lastError; a plafon-forgatókönyv resweep-úton.

### F5 🔴 `corrective.ts`/`invoice.ts` — a helyesbítő `rendelesSzam`-ütközése
- **Hiba:** a helyesbítő ugyanazt a `rendelesSzam`-ot küldi, mint az eredeti
  számla. A checklist által KÖTELEZŐEN bekapcsolt rendelésszám-ismétlés-tiltás
  mellett minden helyesbítő 71/152-be fut, a feloldó lookup (a saját kulsoAzon-ra)
  nem talál semmit → zsákutca-`failed`; a 2 napos „azonos adat" ablakban ráadásul
  a Számlázz.hu az ELSŐ helyesbítőt adná vissza sikerként a másodikhoz.
- **DÖNTÉS:** `buildInvoiceXml`-ben a `<rendelesSzam>` helyesbítő esetén a
  bizonylat-egyedi kulcs legyen: `corrective ? corrective.kulsoAzon : orderNumber`.
  Így a 71/152 tényleg „EZ a helyesbítő már létezik"-et jelent, és a meglévő
  feloldás helyesen működik. Teszt + a megfeleles-doksi A12/T7 kiegészítése
  (helyesbítő-eset).

### F6 🔴 `pdf.ts:135` / `storno.ts:175` / `client.ts:306` — `response.text()` a try-n kívül
- **Hiba:** a törzs-olvasás közbeni hiba (timeout streamelés közben, TCP-vágás)
  nyers TypeError-ként lép ki → elveszik a `retryable` osztályozás → a refund-ág
  nem állítja sorba a retry-jobot, a bizonylat némán elveszik.
- **DÖNTÉS:** mindhárom helyen a `text()` (és a parse) kerüljön try/catch alá,
  amely `isAbortError()`-rel `timeout`/`network` kind-ú, `retryable: true`
  SzamlazzApiError-t dob. Teszt: stubolt fetch, amelynek `text()` metódusa dob.

### F7 🔴 `invoice.ts:225` — dátumok escape/formátum-kapu nélkül az XML-ben
- **Hiba:** a `teljesitesDatum` forrása az `invoiceCompletionDate` szabad szöveges
  DB-mező (admin readOnly ≠ API-védelem) — escape és formátum-ellenőrzés nélkül
  interpolálódik → XML-injektálási felület staff-jogosultsággal.
- **DÖNTÉS:** (1) a builderben MINDEN dátum (kelt/teljesítés/határidő) menjen át
  `/^\d{4}-\d{2}-\d{2}$/` kapun — eltérésnél `invalid_data` SzamlazzApiError;
  (2) a `corrective.ts` az `invoiceCompletionDate`-et olvasáskor is validálja
  (nem megfelelő → warn + issueDate-fallback). Field-access (`update: () => false`)
  NEM kerül rá — az a CLAUDE.md 4. zónája, külön emberi PR-be való (jegyezd a PR-ben).
- Teszt: injektálós string → dob; rossz formátumú completionDate → fallback+warn.

### F8 🟡 `invoice.ts` — `invoiceCompletionDate` csak siker-ágon íródik
- **DÖNTÉS:** a pending-írás (a tényleges beküldés előtti) tartalmazza az
  `invoiceCompletionDate: issueDate`-et — a kiküldött XML dátuma akkor is rögzül,
  ha a válasz elveszik; a lookup-adopt ág így a HELYES (első beküldéskori) dátumot
  találja a rendelésen, és nem hagy űrt a helyesbítő B4-szabályának.
  FIGYELEM az F10-hez: az attempts/pending-írás átrendeződik — a completionDate
  azzal együtt mozogjon (csak a POST-oló ágon íródjon, adoptnál NE íródjon felül).
  A T1-tesztek „adopt nem ír completionDate-et" állítása ETTŐL MÉG IGAZ marad;
  a „pending-írás tartalmazza" új állítás kerül mellé.

### F9 🟡 `invoice.ts`/`corrective.ts` — `issueDate` UTC-ből
- **DÖNTÉS:** közös segéd (pl. `xml.ts`-be): `budapestDateString(now = new Date())`
  `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' })`-tel; az
  invoice + corrective default-issueDate erre áll át. Teszt: fix Date-injektálással
  a 00:30 CEST eset.

### F10 🟡 `invoice.ts`/`corrective.ts` — a lookup is kísérletet fogyaszt + sorrend
- **Hiba:** a számláló a lookup ELŐTT nő → lekérdezés-hibák beküldés nélkül
  elégetik az 5-ös keretet.
- **DÖNTÉS — folyamat-átrendezés (invoice + corrective, a stornónál a lookup
  F3 szerint megszűnik):**
  ```
  plafon-ellenőrzés (previousAttempts >= MAX → failed + ERROR-riasztás)
  if previousAttempts > 0: lookup  ← számláló-növelés NÉLKÜL; hibája propagál,
                                      a státusz pending marad (F4)
    találat → adopt (számláló változatlan)
  attempts = previousAttempts + 1
  pending-írás: invoiceAttempts + (invoice-ágon) invoiceCompletionDate (F8)
  postXml → siker / duplicate-feloldás / retryable(pending+lastError) / failed
  ```
  Teszt: lookup-hiba nem növeli az attempts-et; csak tényleges POST fogyaszt.

### F11 🟡 `invoice.ts:579` (+corrective) — a duplikátum-tény elvész a lastErrorból
- **DÖNTÉS:** a duplikátum-feloldás lookup-hibaágán az üzenet fűzött legyen:
  `„71/152 — a bizonylat a Számlázz.hu szerint már létezik; a lekérdezés hibája: <msg>"`
  — ez megy a `*LastError`-be és a dobott hibába is (a kézi kiállítás → dupla
  számla forgatókönyv megelőzésére).

### F12 🟡 `client.ts:90` — az URL-normalizálás eldobja a query-t
- **DÖNTÉS:** `parsed.search` megőrzése: `origin + pathname.replace(/\/*$/, '/') + parsed.search`;
  ha `parsed.username`/`password` van az URL-ben → hangos konfigurációs hiba. Teszt.

### F13 🟡 `client.ts:195` — `szlahu_error` fejléc URL-dekódolása
- **DÖNTÉS:** `decodeURIComponent(value.replace(/\+/g, ' '))` try/catch-csel
  (hibás kódolásnál a nyers érték marad). Teszt.

### F14 🟡 docblock-hazugságok (`invoice.ts:29–36`, `corrective.ts:42–45`, `storno.ts:35–36`)
- **DÖNTÉS:** átírás a tényleges viselkedésre: hibrid kerekítés (F2), `vatMode`,
  és a `szamlaKulsoAzon` mint VISSZAKERESÉSI kulcs (a duplikátum-védelem a
  `rendelesSzam` + fiókbeállítás). A „horgony önmagában véd a duplikálástól"
  állítás sehol nem maradhat.

### F15 🟡 `docs/szamlazz-megfeleles.md` + storno-doksi + storno.ts komment — C6 „garantáltan"
- **DÖNTÉS:** a C6 sor TISZTÁZANDÓ-ra; a „garantáltan" szó ki; új T-tétel:
  előző havi számla stornója dátum nélkül → a stornó-PDF teljesítési dátumának
  ellenőrzése. Ha nem az eredetit veszi át, a `buildStornoXml`-be visszakerül a
  `teljesitesDatum` az `invoiceCompletionDate`-ből.

### F16 🟡 doksi: „indulásnál hangos hiba" pontatlan + `SZAMLAZZ_AFAKULCS` env-assert
- **DÖNTÉS:** (1) a doksi szövege: „az első számlázási művelet futásakor";
  (2) `src/env.ts` `assertRequiredEnv`: HA a `SZAMLAZZ_AFAKULCS` be van állítva
  és nem `'27'`/`'AAM'` → már INDULÁSKOR dobjon (minden környezetben; a hiányzó
  kulcs továbbra is oké — default 27). Teszt az env-assert suite-ban.
  (3) A PR-leírásba: maintainer-teendő a `.env.example` bővítése
  (`SZAMLAZZ_AFAKULCS` kulcsnév, érték nélkül) + az elavult „Üres =
  https://www.szamlazz.hu/szamla" komment frissítése (záró perjel) — az agent a
  CLAUDE.md 1. zónája miatt NEM nyúl a fájlhoz.

### F17 🟡 attempts read-modify-write nem atomikus
- **DÖNTÉS:** MOST NEM javítjuk kóddal — az ütközési ablak a gyakorlatban nulla
  (a job-retryk másodpercek alatt lefutnak, a resweep 10+ perces stale-ablak után
  indít újat). A megfeleles-doksi üzemeltetési jegyzetébe kerül egy őszinte
  bekezdés + a PR-leírásba mint ismert, elfogadott korlát. (Ha később mégis kell:
  a teljes kiállítási szakasz `withAdvisoryLock('szamla:order:<id>')` alá tehető
  — a Barion-refund már így fut.)

### A javító-kör zárása — ✅ ELVÉGEZVE (2026-08-10)

1. ✅ **Teljes kapu zölden** (`157d110`): typecheck · vitest **1335/0** · lint
   0 error · build. **GitHub CI 5/5 zöld.**
2. ✅ A `docs/szamlazz-megfeleles.md` és a `szamlazz-storno.md` átvezetve
   (A9 hibrid képlet, A12/C3/C5 a stornó-lookup kivezetéséhez, C6 → TISZTÁZANDÓ,
   A14 bizonylat-szintű számlálóval, F17-szakasz; T-lista **8 → 11 tétel**).
3. ✅ Fókuszált commitok magyar üzenettel (3.b tábla).
4. ✅ Push + a **PR #56 leírása** a végállapotra frissítve.

### ✅ ÉLESÍTÉS MEGTÖRTÉNT (2026-08-10 07:56 UTC)

A **PR #56 mergelve**, a kör **élesben fut**. Bizonyítékok (a CLAUDE.md
üzemeltetési 1. pontja szerinti teljes ellenőrzés):

| Ellenőrzés | Eredmény |
| --- | --- |
| main | `b013f15` (squash-merge) |
| Build-log | TÉNYLEGES `npm run build` → `next build` → `✓ Compiled successfully in 9.2s` |
| **Migráció** | `Migrated: 20260809_223906_szamlazz_megfeleles (5ms)` **és** `Migrated: 20260809_232121_szamlazz_attempts_seq (2ms)` — mindkettő lefutott |
| Runtime | `server_start` `commitSha=b013f15…`, Node v24.18.0 |
| Elérhetőség | `/admin` és `/` → HTTP 200 |
| Deploy-státusz | SUCCESS |

> **Két tanulság a deployról** (a következő körre):
> 1. A Railway MCP `list-deployments` **elavult státuszt mutathat**: a deploy
>    25+ percig „WAITING"-nek látszott, miközben a `getDeploymentInfo`
>    lépés-eseményei szerint már 07:56:25-kor minden fázis (SNAPSHOT_CODE →
>    CONFIGURE_NETWORK) COMPLETED volt. **Ha WAITING-et látsz snapshot és
>    build-log nélkül, előbb a `railway-agent`-tel kérdezz rá** — ne indíts
>    új deployt vaktában.
> 2. **A `create-deployment` MCP-hívás ÚJ SERVICE-T hoz létre**, nem a
>    `serviceId`-vel megadott meglévőt deployolja (ez a körben egy fölösleges
>    „just-heart" service-t eredményezett, amit törölni kellett). Meglévő
>    service újraindításához a `redeploy` (snapshot kell hozzá) vagy a
>    `railway-agent` `restartServiceTool`-ja a helyes út.

### ⬅️ AMI MÉG HÁTRAVAN (a következő agentnek / az üzemeltetőnek)

1. **Teszt-fiókos validálás** (11 forgatókönyv a megfelelőségi doksiban) — az
   éles SZÁMLÁZÁS bekapcsolásának előfeltétele; kiemelten: stornó-
   `szamlaKulsoAzon` visszakereshetőség (T10 — ha igazolt, a stornó-lookup
   visszahozható), stornó-dátum öröklése (T11), qty>1 tizedes egységár
   elfogadása (T9).
2. **Fiók-oldali checklist** (8 pont, `docs/szamlazz-megfeleles.md`) —
   kiemelten a **rendelésszám-ismétlés tiltásának bekapcsolása** (erre épül a
   hivatalos idempotencia) és a `SZAMLAZZ_AFAKULCS` értéke (könyvelővel!).
3. **A számlázás élesítése**: a `SZAMLAZZ_AGENT_KEY` Railway-változó
   beállítása. **Amíg nincs beállítva, a számlázás kikapcsolt** (`enabled=false`,
   szándékos no-op) — a most élesített kód tehát fut, de nem hív ki a
   Számlázz.hu-ra. A sorrend: 1. és 2. pont → utána a kulcs.
4. **Maintainer-teendő** (agent nem nyúlhat `.env*`-hez): `SZAMLAZZ_AFAKULCS`
   kulcsnév az `.env.example`-be (érték nélkül) + a `SZAMLAZZ_API_URL` melletti
   elavult komment frissítése (a default mostantól záró perjeles).

## 5. Környezet, fogások, azonosítók

- **Repo:** `anorbert-cmyk/Kineticare`; GitHub-műveletek KIZÁRÓLAG az
  `mcp__github__*` eszközökkel (nincs `gh` CLI). Squash-merge a konvenció,
  a merge-commit címe: `<PR-cím> (#N)`.
- **Railway:** projekt `pretty-spontaneity` (`c7f2778a-d253-4fc7-8324-dae2abe8f7f2`),
  service `Kineticare` (`27b720ab-8bd1-40a7-ba6a-0df774acadc4`), env `production`
  (`fc57e1fc-...`). A deploy a main-push után automatikus; a „SUCCESS" önmagában
  NEM elég — build-log + `server_start` commitSha ellenőrzendő (CLAUDE.md
  üzemeltetési 1.). `SZAMLAZZ_*` és `TURNSTILE_*` env NINCS beállítva — a
  számlázás élesben jelenleg KIKAPCSOLT (enabled=false, szándékosan nem hiba).
- **Helyi Postgres migráció-generáláshoz:** a recept (a C-kör workflow-szkriptjéből,
  működik): `useradd -m pgrun; su -s /bin/bash pgrun -c "/usr/lib/postgresql/16/bin/initdb -D <dir>/pgdata --auth=trust -U kineticare"`,
  indítás pgrun-ként `-k <pgrun-írható socketdir>` opcióval, majd
  `createdb -U kineticare kineticare`; `DATABASE_URI=postgresql://kineticare@127.0.0.1:5432/kineticare`,
  `npx payload migrate` (a meglévők), aztán `npx payload migrate:create <nev>`.
  Kézzel migrációt írni/szerkeszteni TILOS (CLAUDE.md 3. zóna).
- **Tesztkapu-envek:** `DATABASE_URI` (ál), `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`,
  `BARION_API_URL=https://api.test.barion.com`, `BARION_PAYEE_EMAIL`,
  `BARION_POSKEY_TEST` — a DB-függő tesztek TCP-próbával skippelnek.
- **Opus-csapat minta:** a felhasználó kérése, hogy a programozást Opus
  többügynökös csapat végezze (workflow: worktree-ügynökök `git worktree add
  --detach <scratch>/wtN-X HEAD` + `ln -s node_modules`, strukturált jelentés-séma,
  fő fát nem írnak; harvest a fő szálban `git diff HEAD` patch-ekkel).
  **Tesztből valódi hálózati hívás TILOS** — minden folyamat-teszt injektálja a
  `postXml` ÉS `queryByKulsoAzon` mockot (volt már kicsúszó éles hívás!).
- **Ismert infra-hiba:** „permission handler returned updatedInput" — workflow-
  ügynökök Bash-hívásait töri SZÓRVÁNYOSAN. A javító-körben egyszer előfordult
  (1 hívás, B ügynök), az ügynök utána zavartalanul folytatta — **nem blokkoló,
  nem kell miatta workflow-t újraindítani.** Ha sorozatosan jelentkezne: a munkát
  a fő szálban kell befejezni, a worktree-k és a workflow-journal
  (`~/.claude/projects/.../subagents/workflows/<runId>/journal.jsonl`) alapján
  minden visszanyerhető.
- **Párhuzamossági korlát:** a workflow egyszerre ~2 ügynököt futtat (CPU-alapú
  cap), a többi sorban áll — egy 4 ügynökös kör ~35–40 perc. Tervezz ezzel.
- **Fájl-tulajdonlás fan-outnál:** a javító-kör tanulsága, hogy ha két ügynök
  ugyanazt a fájlt kapja (más régióban), a harvest kézi összefésülést igényel.
  Vagy add egy ügynöknek a teljes fájlt, vagy számíts a konfliktus-feloldásra
  (a `git add -A` után `git apply --3way` a második patch-re jól működik).
- **Review-findingok nyers anyaga:** e doksi 4. szakasza teljes körű; az eredeti
  21 finding a session-scratchpad `tasks/wn4vg8orx.output` fájljában volt (mulandó).

## 6. Tilos zónák — e kör szempontjából

- Titok soha, sehova (a tesztek DUMMY-mintát használnak); `.env*`-hez nem nyúlunk
  (a `.env.example`-bővítés maintainer-teendőként jelzendő).
- `confirmOrder` tilos — a `ecommerce-payments-guard.test.ts` végrehajtható őr.
- Migráció csak Payload-generálva; meglévő migrációs fájl nem szerkeszthető.
- Access-control-változás emberi jóváhagyás nélkül tilos — **ez a kör nem érint
  access-t**; az F7-nél felmerült field-access-ötlet és az M-12 (Users-access)
  külön, emberi jóváhagyású PR-re vár (task #51).
- Pinned `@payloadcms/*`, package.json, lockfile: érintetlen marad.

## 7. Nyitott tételek a körön TÚL (backlog)

1. **Fiók-oldali előfeltételek** (ember): a `docs/szamlazz-megfeleles.md`
   checklistje — teszt-fiók, kisbetűs Agent-kulcs, **rendelésszám-ismétlés
   tiltásának bekapcsolása**, KIN előtag, e-számla/csomag, NAV technikai
   felhasználó, vevői fiók döntés, `SZAMLAZZ_AFAKULCS` könyvelővel.
2. **Teszt-fiókos validálási lista** (T1–T11 — a javító-kör 8-ról 11-re bővítette) —
   éles bekötés ELŐTT futtatandó. A három új tétel a kör tudatos bizonytalanságait
   fedi: T9 qty>1 tizedes egységár, T10 stornó-`szamlaKulsoAzon` visszakereshetőség,
   T11 stornó teljesítési dátumának öröklése.
3. **Turnstile élesítés**: `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` PÁRBAN
   (env-assert őrzi; újrabuild nem kell).
4. **Adatbázis-mentés (C14)** — továbbra sincs; éles Postgres-újraindítás tilos
   mentés nélkül.
5. **M-12** (Users-access) — emberi döntésű külön PR (task #51).
6. **Build-warning**: `src/lib/media-restore.ts:97` dinamikus fs-trace
   (Turbopack-figyelmeztetés, nem blokkoló).
7. **Lockfile-regenerálás** (a `--legacy-peer-deps` kivezetéséhez) — külön,
   emberi döntésű PR.
8. **🔴 `orders.refunds` séma-drift** — lásd a 8. szakaszt. ÉLES HIBA, elsőbbséget élvez.
9. **T-013 statisztika-nézet** — lásd a 9. szakaszt (megrendelői igény, nincs megírva).
10. **Admin videó-feltöltés (tus)** — lásd a 10. szakaszt (tudatos eltérés a specifikációtól).

---

# MÁSODIK RÉSZ — FELADATLEÍRÁSOK A KÖVETKEZŐ AGENTNEK

> Ez a rész **2026-08-10-én került a doksiba**, a „minden be van kötve?"
> ellenőrző kör eredményeként. A 8–10. szakasz **nincs megvalósítva** — ezek
> kiadható feladatok. Mindegyik önmagában elég részletes ahhoz, hogy egy másik
> agent a repó ismerete nélkül nekiálljon: pontos fájlnevek, mezőnevek,
> oszlopnevek, bekötési pontok, buktatók és elfogadási kritériumok.

## 8. 🔴 KRITIKUS ÉLES HIBA: `orders.refunds` oszlop hiányzik az adatbázisból

### 8.1 Mi a baj

A Payload-konfigban (`src/plugins/ecommerce.ts`, az orders-override `refunds`
json-mezője) létezik egy `refunds` mező, **de egyetlen migráció sem hozza létre
a `refunds` oszlopot** az `orders` táblában. A séma-snapshotokban szerepel
(`src/migrations/20260730_080404_sync_schema_code.json`-tól kezdve mindegyikben),
a hozzá tartozó `.ts` migráció viszont csak az `order_number` és a
`total_huf_snapshot` oszlopot adja hozzá — a `refunds`-t nem.

Ez azért maradt észrevétlen, mert **fejlesztői módban a Payload `push`-a némán
létrehozza** a hiányzó oszlopot (és beír egy `dev` sort a `payload_migrations`
táblába). Éles módban (`NODE_ENV=production`) a push ki van kapcsolva → az
oszlop soha nem jön létre.

### 8.2 Bizonyíték (reprodukálható, 2026-08-10-én lefuttatva)

Tiszta adatbázis + **csak a commitolt migrációk** (`npx payload migrate`), majd
`NODE_ENV=production` mellett Payload-lekérdezés:

```
FIND FAILED: Failed query: select "orders"."id", … "orders"."refunds", … from "orders"
REFUND WRITE FAILED: Failed query: select … "orders"."refunds" … where "orders"."order_number" ilike $1
```

A `psql` visszaigazolja, hogy a migrációk után csak `refund_reason` és
`refunded_at` létezik, `refunds` nem:

```sql
select column_name from information_schema.columns
where table_name='orders' and column_name like '%refund%';
-- refunded_at, refund_reason        (refunds NINCS)
```

### 8.3 Következmény élesben

A drizzle a **kód-oldali sémából** építi a SELECT-et, ezért a hiányzó oszlop
nem csak az írást, hanem **minden orders-olvasást** eldönt:

- Az admin **Rendelések lista és rendelés-részletező 500-zal elszáll.**
- **Új rendelés nem hozható létre**: a rendelésszám-generáló hook `find`-ol az
  `order_number`-re → ugyanez a hibás SELECT → a checkout elhasal.
- A **visszatérítés (RefundPanel)** sem működik.

Azért nem robbant még be, mert a pénzútvonal élesben **még nem futott** (a
`BARION_POSKEY_TEST` ál-kulcs, éles vásárlás nem történt). Az első valódi
vásárlás viszont ebbe fut bele.

### 8.4 A javítás (kb. 15 perc)

**TILOS kézzel migrációt írni** (CLAUDE.md 3. zóna) — a Payload eszközével kell
generálni. Recept (a helyi Postgres a 5. szakaszban leírt módon indítandó, a
`pgdata`-t a `pgrun` felhasználó által **elérhető** könyvtárba tedd, pl.
`/home/pgrun/pgcheck` — a scratchpad alá tett `pgdata` „Permission denied"-del bukik):

```bash
export DATABASE_URI=postgresql://kineticare@127.0.0.1:5432/kineticare
npx payload migrate          # a meglévők lefuttatása TISZTA adatbázison
npx payload migrate:create szamlazz_refunds_oszlop
```

A generált migráció várhatóan egyetlen sor: `ALTER TABLE "orders" ADD COLUMN
"refunds" jsonb;`. **Fontos:** a `migrate:create` csak akkor generálja helyesen,
ha az adatbázisban **nem futott dev-push** (nincs `dev` sor a
`payload_migrations`-ben) — különben a Payload már szinkronban látja a sémát és
„nincs változás"-t ír. Ezért kell tiszta DB.

**Ellenőrzés a merge előtt** (ez a lényeg, ne hagyd ki): tiszta adatbázis →
`npx payload migrate` → `NODE_ENV=production` mellett egy `payload.find({
collection: 'orders' })` fusson le hiba nélkül.

**Élesítés után** a Railway a `startCommand`-ban (`npx payload migrate && npm
start`) automatikusan lefuttatja. A deploy-log ellenőrzendő: szerepelnie kell a
`Migrated: …szamlazz_refunds_oszlop` sornak (CLAUDE.md üzemeltetési 1. és 5.).

### 8.5 Tanulság, amit érdemes kikényszeríteni

A hiba osztálya általános: **a séma-snapshot és a generált SQL szétcsúszhat**.
Érdemes egy CI-lépés vagy teszt, ami tiszta DB-n lefuttatja a migrációkat, majd
`NODE_ENV=production` mellett minden collectionre egy `find`-ot végez. Ez
minden jövőbeli drift-et azonnal elkap. (Ez maga is kiadható feladat.)

## 9. T-013 — Statisztika/kimutatás admin-nézet (MEGRENDELŐI IGÉNY, NINCS MEG)

### 9.1 Miért ez a feladat

A `docs/megrendeloi-igeny-specifikacio.txt` „Admin-igények" szakasza szó
szerint kéri:

> „Statisztika/grafikon/kimutatás: havi bevétel, bontásban szakmai
> (professzionális) vs. otthoni-rehabilitációs értékesítés szerint."

**Ez nincs megvalósítva**: nincs admin-nézet, nincs aggregáció, nincs
diagram-könyvtár a `package.json`-ben.

⚠️ **Figyelem, félrevezető nyom:** a `docs/igeny-valtozas-pontok.md` 10. sora
azt állítja, hogy „T-013 statisztika/grafikon ✅ orders-aggregáció +
kategória-bontás". **Ez téves.** A kódban a T-013 a **menük láthatósági
access-szabálya** (`src/access/menus-visibility.ts`, `src/access/policies.ts:20`) —
a jegyszámozás elcsúszott, a pipa nem erre a funkcióra vonatkozik. A feladat
része, hogy **ezt a sort is javítsd** a mapping-doksiban.

### 9.2 Elfogadási kritériumok

1. Az adminban elérhető egy **Statisztika** nézet a bal oldali navigációból.
2. **Havi bontású bevétel** táblázatban ÉS oszlopdiagramon, alapértelmezésben az
   utolsó 12 hónap.
3. Minden hónapra három szám: **otthoni (laikus)**, **szakmai (szakember)**,
   **összesen** — forintban, magyar ezres tagolással (`toLocaleString('hu-HU')`).
4. Csak a **`paid`** státuszú rendelések számítanak bevételnek; a `refunded`
   külön oszlopban jelenik meg (vagy kimarad — lásd 9.6), nem keveredik bele.
5. A nézet **csak `staff`/`owner` szerepkörnek** érhető el; `customer` nem.
6. **Nincs új npm-függőség**, nincs adatbázis-migráció (a 9.5-ös „B" opció
   kivételével, ami külön döntés).
7. Zöld kapu: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

### 9.3 Az adatforrás — pontosan mi van a DB-ben

**`orders` tábla** (mezőnév → oszlopnév):

| Payload-mező | Oszlop | Megjegyzés |
| --- | --- | --- |
| `status` | `status` | enum: `created`, `payment_pending`, `paid`, `payment_failed`, `cancelled`, `refunded` |
| `totalHufSnapshot` | `total_huf_snapshot` | **Ezt használd** a rendelés-szintű végösszeghez (Ft). Nincs rajta olvasási access-korlát. |
| `amount` | `amount` | plugin-mező, ugyanezt tükrözi — tartalék |
| `orderNumber` | `order_number` | `KH-<év>-<6 jegy>` |
| `invoiceCompletionDate` | `invoice_completion_date` | `YYYY-MM-DD` string, a számla teljesítési dátuma |
| `createdAt` | `created_at` | timestamptz |
| `refunds` | *(hiányzik, lásd 8. szakasz!)* | **owner-only olvasás** — ne olvasd be ebbe a nézetbe |

**`orders_items` tábla** (a rendelés tételei — ez kell az ág-bontáshoz):

| Payload-mező | Oszlop |
| --- | --- |
| `items[].product` | `product_id` → `products.id` |
| `items[].quantity` | `quantity` |
| `items[].titleSnapshot` | `title_snapshot` (a **sku**, nem a marketingcím) |
| `items[].priceHufSnapshot` | `price_huf_snapshot` (**egységár**, Ft) |

**`products` tábla:** `audience` oszlop — select, `'laikus' | 'szakember'`,
**nullable** (a mező bevezetése előtti sorokban NULL).

🔑 **Kulcsszabály:** az ág-bontást **tétel-szinten** kell számolni, nem
rendelés-szinten — egy rendelés tartalmazhat otthoni ÉS szakmai kurzust is.
A tétel bevétele = `price_huf_snapshot × quantity`.

🔑 **Az `audience` normalizálása kötelezően a meglévő helperrel történik:**
`normalizeAudience()` a `src/lib/course-audience.ts`-ből — minden nem-`'szakember'`
érték (NULL, ismeretlen string) a **laikus** ágba esik. A megjelenő nevek
ugyanonnan: `AUDIENCE_LABELS`.

### 9.4 Fájlterv

| Fájl | Mi kerül bele |
| --- | --- |
| `src/lib/statistics/revenue.ts` | **Tiszta** aggregáló függvények — se DB, se React. Ez a tesztelhető mag. |
| `src/lib/statistics/query.ts` | A Payload-lekérdezés + leképezés az aggregátor bemenetére. |
| `src/components/admin/StatisticsView.tsx` | Az admin-nézet (React **szerver**-komponens). |
| `src/components/admin/RevenueChart.tsx` | Tiszta SVG oszlopdiagram (nincs függőség). |
| `src/components/admin/StatisticsNavLink.tsx` | `'use client'` link a bal oldali navba. |
| `src/__tests__/statistics-revenue.test.ts` | Az aggregátor egységtesztjei. |

Minta a szerkezetre és a stílusra: `src/components/admin/RefundPanel.tsx` és
`GrantPurchasePanel.tsx` (meglévő, működő admin-komponensek), illetve a
`src/lib/refund/route-handler.ts` a függőség-injekciós, tesztelhető mintára.

### 9.5 A LEGFONTOSABB DÖNTÉS: melyik dátum szerint csoportosítunk?

**Nincs `paidAt` mező.** A `paid` átmenet
(`src/lib/order-status/apply-barion-state.ts`, a `data: { status: 'paid' }` írás)
**nem ír időbélyeget**. Három út:

- **(A) `createdAt` szerint — ajánlott v1-re.** Nulla migráció, azonnal
  működik. Kockázat: a hónapfordulón leadott, de a következő hónapban fizetett
  rendelés az előző hónapba esik. Kártyás fizetésnél ez ritka és kicsi.
  A nézet feliratában **írd ki**: „a rendelés leadásának hónapja szerint".
- **(B) `invoiceCompletionDate` elsőbbséggel, `createdAt` tartalékkal** — szintén
  migráció nélküli, és számviteli szempontból pontosabb, mert a számla
  teljesítési dátuma. Hátrány: amíg a számlázás nincs élesítve
  (`SZAMLAZZ_AGENT_KEY` nincs beállítva), ez a mező üres → mindenhol a tartalék
  fut. **Jó középút.**
- **(C) Új `paidAt` date-mező.** Pontos, de: mező felvétele az orders-overridebe
  + **Payload-generált** migráció + írás a `paid` átmenetnél + a régi sorokra
  backfill nincs (marad NULL → `createdAt`-re esik vissza). Csak akkor válaszd,
  ha a megrendelő kifejezetten a fizetés dátumát kéri.

**Javaslat:** (B) — és a fallback-logikát tedd az aggregátorba, hogy tesztelhető
legyen.

⚠️ **Időzóna:** a hónap-kulcsot **Budapest szerint** kell képezni, NEM
`toISOString().slice(0, 7)`-tel (az UTC → a hónapforduló körüli rendelések rossz
hónapba kerülnek; ez pontosan az F9 finding tanulsága). Használd az
`Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest', … })` mintát —
kész implementáció: `budapestDateString()` a `src/lib/szamlazz/xml.ts`-ben.
Ha közösen használnád, emeld ki egy `src/lib/date/budapest.ts` modulba, és a
szamlazz-oldali importot vezesd át rá (a szamlazz-tesztek fogják őrizni).

### 9.6 Az aggregátor (`src/lib/statistics/revenue.ts`)

Tiszta függvény, DB nélkül — ez teszi egységtesztelhetővé:

```ts
export interface RevenueOrderItemInput {
  audience: unknown        // products.audience — normalizeAudience() szűri
  priceHuf: number         // priceHufSnapshot (EGYSÉGÁR)
  quantity: number
}

export interface RevenueOrderInput {
  status: string
  createdAt: string                  // ISO
  invoiceCompletionDate?: string | null   // 'YYYY-MM-DD'
  totalHuf: number | null
  items: RevenueOrderItemInput[]
}

export interface MonthlyRevenueRow {
  month: string            // 'YYYY-MM', Budapest szerint
  laikusHuf: number
  szakemberHuf: number
  totalHuf: number
  orderCount: number
}

export function aggregateMonthlyRevenue(
  orders: RevenueOrderInput[],
  options?: { months?: number; now?: Date },
): MonthlyRevenueRow[]
```

Viselkedési szabályok, amiket a teszt is ellenőrizzen:

1. Csak `status === 'paid'` számít bele.
2. A hónap-kulcs `invoiceCompletionDate` → ha nincs, `createdAt`; **Budapest**
   időzóna szerint.
3. A tétel bevétele `priceHuf × quantity`, az ág `normalizeAudience(audience)`.
4. `laikusHuf + szakemberHuf` legyen egyenlő a hónap `totalHuf`-jával.
   Ha egy rendelésnek **nincs tétele** (régi/hibás sor), a `totalHuf`-ját tedd
   a laikus ágba, és ezt kommenteld — különben az összegek nem stimmelnek.
5. A hiányzó hónapok **nullás sorként** jelenjenek meg (ne ugorja át őket a
   diagram), az utolsó `months` (alapérték 12) hónapra, növekvő sorrendben.
6. Üres bemenet → az utolsó 12 hónap, csupa nulla.

### 9.7 A lekérdezés (`src/lib/statistics/query.ts`)

Payload local API, a nézet szerver-komponenséből:

```ts
const result = await payload.find({
  collection: 'orders',
  where: { status: { equals: 'paid' } },
  depth: 1,            // hozza a products-ot az items[].product alá (audience kell)
  limit: 0,            // minden találat — lásd a méret-figyelmeztetést lent
  overrideAccess: true, // CSAK a 9.8 szerinti explicit szerepkör-kapu UTÁN!
})
```

- `depth: 1` kell, hogy az `items[].product` objektumként jöjjön az `audience`
  mezővel; `depth: 0`-nál csak az id-t kapod.
- **Ne olvasd be a `refunds` mezőt** semmilyen formában (owner-only, és
  jelenleg nem is létezik az oszlop — 8. szakasz).
- **Méret:** amíg pár ezer rendelés van, a `limit: 0` rendben. Ha ez nő, vagy a
  nézet lassul, váltás nyers SQL-aggregátumra a drizzle-n keresztül
  (`payload.db.drizzle.execute(sql\`…\`)`) — ez **nem migráció**, tehát nem
  ütközik a 3. tilos zónával:

```sql
SELECT to_char(o.created_at AT TIME ZONE 'Europe/Budapest', 'YYYY-MM') AS month,
       COALESCE(p.audience, 'laikus')                                  AS audience,
       SUM(oi.price_huf_snapshot * oi.quantity)                        AS revenue_huf,
       COUNT(DISTINCT o.id)                                            AS order_count
FROM orders o
JOIN orders_items oi ON oi._parent_id = o.id
LEFT JOIN products  p ON p.id = oi.product_id
WHERE o.status = 'paid'
GROUP BY 1, 2
ORDER BY 1;
```

### 9.8 Bekötés — pontosan hova

**a) `src/payload.config.ts`** — a meglévő `admin` blokkot bővítsd (a
`buildConfig({ admin: { … } })` rész, jelenleg `user`, `importMap` és `meta`
kulcsokkal):

```ts
admin: {
  user: Users.slug,
  importMap: { baseDir: path.resolve(dirname) },
  meta: { titleSuffix: ' – Kineticare admin' },
  components: {
    views: {
      statisztika: {
        Component: '/components/admin/StatisticsView#StatisticsView',
        path: '/statisztika',
        exact: true,
        meta: { title: 'Statisztika' },
      },
    },
    // A Payload NEM teszi be automatikusan a navigációba a saját nézetet:
    afterNavLinks: ['/components/admin/StatisticsNavLink#StatisticsNavLink'],
  },
},
```

Az útvonal így `/admin/statisztika` lesz. A `Component` string alakja
**ugyanaz a konvenció**, mint a már bekötött `RefundPanel`-é
(`'/components/admin/RefundPanel#RefundPanel'`) — a `/` a `importMap.baseDir`-hez
(`src/`) képest értendő.

**b) Az importMap regenerálása KÖTELEZŐ** — enélkül a nézet nem töltődik be, és
a build is elhasalhat:

```bash
npm run generate:importmap
```

Ez az `src/app/(payload)/admin/importMap.js` fájlt írja át. **A generált fájlt
commitold** (a meglévők is be vannak commitolva).

**c) Szerepkör-kapu a nézetben — ezt NE hagyd ki.** Egy egyedi admin-nézet
alapból csak a „be van jelentkezve az adminba" szintet garantálja; a
szerepkört magadnak kell ellenőrizned:

```tsx
import type { AdminViewServerProps } from 'payload'
import { hasStaffOrOwnerRole } from '../../access/roles'

export const StatisticsView = async ({ initPageResult }: AdminViewServerProps) => {
  const { req } = initPageResult
  if (!hasStaffOrOwnerRole(req.user)) {
    return <div>Ehhez a nézethez nincs jogosultságod.</div>   // magyar hibaüzenet!
  }
  // …lekérdezés + aggregáció + render
}
```

A `hasStaffOrOwnerRole` a `src/access/roles.ts`-ben van (`RoleUser` típussal).
A `StatisticsNavLink` kliens-komponensben is érdemes elrejteni a linket
nem-jogosult felhasználó elől, de **a védelem a szerver-oldali kapu** — a
link elrejtése csak kozmetika.

### 9.9 A diagram — ne hozz be függőséget

Nincs chart-könyvtár a projektben, és **ne is tegyél bele** (a `package.json`
és a lockfile érintése külön, emberi döntésű PR — lásd 7. szakasz 7. pont).
Egy havi oszlopdiagramhoz bőven elég a kézzel írt SVG:

- `<svg viewBox="0 0 W H" role="img" aria-label="…">`, hónaponként két
  `<rect>` (otthoni / szakmai) egymás mellett vagy egymásra halmozva.
- A magasság `érték / maxÉrték * grafikonMagasság`; a `maxÉrték` 0 esetén
  védekezz a nullosztás ellen.
- **Színek**: a Payload admin CSS-változóit használd (`var(--theme-elevation-…)`,
  `var(--theme-success-…)`), hogy sötét témában is olvasható maradjon.
- **Akadálymentesség**: a diagram mellett **mindig legyen ott a táblázat is** —
  a számokat képernyőolvasó is elérje. WCAG AA kontraszt kötelező.
- A `docs/ertekesitesi-ux-skill.md` betöltése **ehhez nem szükséges**: az a
  kezdőlapra, navigációra, termék-megjelenítésre és tipográfiára vonatkozik
  (CLAUDE.md „Felületi (UX/UI) munka"), ez viszont belső admin-felület.

### 9.10 Tesztek (`src/__tests__/statistics-revenue.test.ts`)

Az aggregátor tiszta függvény → nem kell hozzá DB. Minimum esetek:

1. **Hónapforduló Budapest szerint**: `2026-01-31T23:30:00Z` (= budapesti
   február 1. 00:30) a **`2026-02`** vödörbe essen.
2. **NULL `audience`** → laikus ág.
3. **Vegyes rendelés** (egy otthoni + egy szakmai tétel) helyesen hasadjon szét.
4. **`quantity > 1`** → `priceHuf × quantity`.
5. **Nem-`paid` státusz** (`refunded`, `payment_failed`, `cancelled`) kimarad.
6. **Üres hónap** nullás sorként jelenjen meg, ne hiányozzon.
7. `laikusHuf + szakemberHuf === totalHuf` minden során.

⚠️ **Tesztből valódi hálózati hívás és valódi DB-hívás TILOS** (volt már
kicsúszó éles hívás — 5. szakasz). Az aggregátor-teszt tiszta adatokkal
dolgozzon; ha DB-t érintő tesztet írnál, a meglévő TCP-próbás skip-mintát kövesd.

### 9.11 Buktatók, amikbe bele fogsz futni

1. **`npm run generate:importmap` elfelejtése** → a nézet 404/üres. Ez a
   leggyakoribb hiba.
2. **`depth: 0`** → `items[].product` csak id → nincs `audience` → minden
   laikusnak látszik.
3. **`toISOString()` hónap-kulcs** → UTC-drift a hónapfordulón (9.5).
4. **`overrideAccess: true` szerepkör-kapu nélkül** → adatszivárgás. Előbb a
   kapu, utána a lekérdezés.
5. **`any` típus** → CLAUDE.md tiltja; `unknown` + szűkítés (az `audience`
   pontosan ezért `unknown` a bemeneti típusban).
6. **Kikommentezett kód** nem maradhat a repóban (CLAUDE.md).
7. **Branch-konvenció**: `feat/<ticket>-<rovid-nev>`, ékezet nélkül,
   pl. `feat/T-013-statisztika-nezet`.

## 10. Másodlagos hiány: admin videó-feltöltés (tus) — tudatos eltérés

A megrendelői specifikáció „Kurzuskezelés" pontja **adminból induló tus
feltöltést** kért (eredetileg Cloudflare Streamre). A megvalósult állapot: a
videó-platform **Bunny Stream** lett (`docs/video-platform-dontes.md`), és az
adminban a `products.videos[]` tömbbe **kézzel kell beilleszteni a Bunny GUID-ot**
— a feltöltés a Bunny felületén történik.

Ez **dokumentált döntés, nem elfelejtett funkció**, de a megrendelő felé
tisztázandó, hogy így marad-e. Ha bekötendő, a feladat: Bunny Stream
`POST /library/{id}/videos` → tus-feltöltés az adminból, a visszakapott GUID
automatikus beírásával. Ehhez a Bunny API-kulcs **szerver-oldali** kezelése kell
(kliensbe kulcs nem kerülhet — CLAUDE.md 1. zóna), tehát egy saját route-handler
a `src/app/(frontend)/api/admin/…` alatt, a refund-route mintájára.

## 11. Ami a fentieken túl NINCS lezárva (az igény-ellenőrzés eredménye)

Ezek nem hiányzó funkciók, hanem **nem igazolt** működés — az átadás előtt
tisztázandók:

1. **A pénzútvonal élesben soha nem futott.** A `BARION_POSKEY_TEST` ál-érték,
   a `SZAMLAZZ_AGENT_KEY` nincs beállítva. Éles kulcsokkal végigvitt
   próbavásárlás (fizetés → hozzáférés → számla → visszatérítés) még hátravan.
2. **Nincs böngészős végponttól-végpontig teszt** (C6 nyitott). Az 1335 teszt
   egységteszt; a valódi checkout-folyamatot ember vagy Playwright-teszt kell
   végigvigye. A recept: `docs/e2e-staging-runbook.md`.
3. **Számlázz.hu teszt-fiókos validálás** (T1–T11) — 4. szakasz „AMI MÉG
   HÁTRAVAN".
4. **Adatbázis-mentés (C14)** — nincs. Éles Postgres-újraindítás mentés nélkül
   tilos (CLAUDE.md üzemeltetési 3.).
