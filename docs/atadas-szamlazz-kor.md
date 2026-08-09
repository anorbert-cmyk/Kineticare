# Átadás-dokumentum: Számlázz.hu-megfelelőségi kör (#53) — állapot, döntések, hátralévő munka

> **Kinek szól:** a következő agent-session (vagy emberi fejlesztő), aki ezt a kört
> befejezi. **Készült:** 2026-08-09 ~23:30 UTC. **Önálló dokumentum** — a session
> mulandó állapotára (scratchpad, futó folyamatok) nem támaszkodik; ami kell, az
> a repóban van.

---

## 1. Pillanatkép — hol tartunk

- **main:** `5d6f5da` — a #52 PR (C-backlog + biztonsági kör 2) squash-merge-elve,
  **élesben kint és igazolva** (Railway build-logban tényleges `npm run build`,
  runtime `server_start` `commitSha=5d6f5da`, `turnstile_kikapcsolva` warn él).
- **Munkabranch:** `claude/higgsfield-mcp-integration-za6671` — a mainről újraalapozva,
  rajta **ez a kör** (lásd 3. szakasz commitjai). A branch pusholva, draft PR nyitva
  (számát lásd a GitHubon a branchhez — a PR-leírás ennek a doksinak a kivonata).
- **Kapu-állapot:** a `6c9a03f` commitnál TELJES kapu zölden futott
  (typecheck ✔, vitest **1295 teszt / 0 bukó** ✔, lint 0 error ✔, build ✔).
  Az azutáni commitok (admin-leírás, 2 generált migráció + séma, doksik) után
  typecheck + a számlázós tesztek (113) újra zölden futottak; teljes kapu a
  javító-kör után újra kötelező.
- **A kör NEM mergelhető még:** a 3-lencsés adverszariális Opus-review **21
  findingot** adott (7 egyedi súlyos + duplikátumok), a javításuk MÉG NEM történt
  meg. A triázs és minden döntés a 4. szakaszban — a javítás ebből egy az egyben
  implementálható.

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
| `01b5726` | `correctiveInvoiceAttemptsSeq` oszlop + generált migráció (a 4. szakasz F1-döntésének előkészítése — **a mező már létezik és típusgenerálva van**, a KÓD még nem használja!) |
| `0a466fb` | A hivatalos követelmény-szintézis a repóba |
| (ez) | Ez az átadás-doksi |

## 4. A REVIEW 21 FINDINGJA ÉS A DÖNTÉSEK — a javító-kör specifikációja

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

### A javító-kör kötelező zárása
1. `npm run generate:types` NEM kell újra (a séma kész), de a **teljes kapu igen**:
   typecheck + teljes vitest + lint + build (CI-mintájú álértékekkel).
2. A `docs/szamlazz-megfeleles.md` érintett sorai (A9, A12, C3, C5, C6, plafon-tábla)
   és a T-lista bővítése (qty>1, stornó-kulsoAzon, stornó-dátum) — a doksi NE
   állítson többet, mint a kód.
3. Fókuszált commitok, magyar üzenettel, a szokásos footerrel.
4. Push után a draft PR leírását frissíteni (findingok → javítva státusz),
   CI zöldre, majd — MIVEL A KÖR ACCESS-CONTROLT NEM ÉRINT — mehet a merge +
   Railway deploy-ellenőrzés (build-logban TÉNYLEGES `npm run build` +
   `server_start` az új SHA-val!). Merge után: `payload migrate` élesben a deploy
   részeként fut? — NEM: a migrációkat a Railway indulás NEM futtatja automatikusan;
   ellenőrizd a start-parancsot (`railway.json` / service-beállítás), és ha kell,
   futtasd a `payload migrate`-et az éles DB-n a bevett módon (ahogy a
   `20260809_180031` került fel — lásd repo-történet / deploy-doksi).

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
- **Ismert infra-hiba (múltbeli):** „permission handler returned updatedInput" —
  workflow-ügynökök Bash-hívásait törte szórványosan; session-újraindulás óta nem
  jelentkezett. Ha újra előjön: a munkát a fő szálban kell befejezni, a worktree-k
  és a workflow-journal (`~/.claude/projects/.../subagents/workflows/<runId>/journal.jsonl`)
  alapján minden visszanyerhető.
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
2. **Teszt-fiókos validálási lista** (T1–T8 + a javító-kör új T-tételei) —
   éles bekötés ELŐTT futtatandó.
3. **Turnstile élesítés**: `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` PÁRBAN
   (env-assert őrzi; újrabuild nem kell).
4. **Adatbázis-mentés (C14)** — továbbra sincs; éles Postgres-újraindítás tilos
   mentés nélkül.
5. **M-12** (Users-access) — emberi döntésű külön PR (task #51).
6. **Build-warning**: `src/lib/media-restore.ts:97` dinamikus fs-trace
   (Turbopack-figyelmeztetés, nem blokkoló).
7. **Lockfile-regenerálás** (a `--legacy-peer-deps` kivezetéséhez) — külön,
   emberi döntésű PR.
