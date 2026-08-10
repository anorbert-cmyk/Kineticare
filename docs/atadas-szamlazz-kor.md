# Kineticare — átadás-dokumentum

> **Kinek szól:** a következő agent-session vagy emberi fejlesztő, aki átveszi
> a munkát. **Frissítve: 2026-08-10 ~14:05 UTC.** **Önálló dokumentum** — a
> session mulandó állapotára (scratchpad, futó folyamatok, worktree-k) nem
> támaszkodik; ami kell, az a repóban van.
>
> **Hogyan használd:** a 0. szakasz a helyzet egy percben. Az 1. mondja meg,
> mi van élesben. **A 2. a következő feladatod.** A 3. a priorizált backlog, a
> 4. pedig azt, amit NE csinálj meg. Az 5–11. szakasz technikai anyag:
> receptek, specifikációk, környezet, tilos zónák.
>
> **Előzmény:** a doksi a Számlázz.hu-megfelelőségi kör (#53) naplójaként
> indult; az akkori 21 review-finding teljesítés-naplója a 4. szakaszból a
> `docs/szamlazz-megfeleles.md` és a git-történet felé mutat tovább.

---
## 0. HA CSAK EGY DOLGOT OLVASOL EL

**A rendszer élesben fut, és ma odáig jutott, hogy a fizetési főlánc egyáltalán
működőképes legyen.** Kiderült ugyanis, hogy addig nem volt az: az éles
adatbázis nem azt a sémát tartalmazta, amit a kód feltételez, ezért élesben
rendelés létre sem jöhetett. Ezt két Payload-generált migráció javította
(#59, #60), és igazoltuk is.

**A következő feladatod a 2. szakaszban van:** a pénzútvonal két megerősített
KRITIKUS hibájának javítása **kész, zöld és élesítésre vár** a #62 PR-ben —
három iteráció és két keresztreview után. **Egyetlen dolog hiányzik: egy
tulajdonosi visszaigazolás** arról, hogy az `ENABLE_JOB_WORKERS` `true`-ra van
állítva a Railway service-en (2.4).

⚠️ **A legfontosabb tanulság, ami rád is vonatkozik:** a ma feltárt hibák MIND
némák voltak. Nem dobtak kivételt, nem írtak logot, a CI zöld volt, a Railway
„SUCCESS"-t mutatott — és közben az éles rendszer fele nem működött. Fejlesztői
módban minden jónak látszott, mert a Payload `push`-a némán pótolta a hiányzó
sémát. **Ne a zöld CI-ból következtess a működésre.** A 8.2-ben van egy
reprodukálható recept, amivel ezt bármikor ellenőrizheted, és a 3.1-ben négy
javasolt CI-őr, ami gépivé tenné.

## 1. Mi van ÉLESBEN (2026-08-10)

| PR | main | Mit vitt ki | Igazolás |
| --- | --- | --- | --- |
| #59 | `d4c5ca1` | Kurzusok-lista javítás + `orders.refunds` migráció | valódi `next build`; `Migrated: …szamlazz_refunds_oszlop (4ms)`; `server_start` a SHA-val |
| #60 | `db9ed72` | A fizetési főfolyam séma-driftje (állapotgép-enum, job-slug enumok, `webhook_events`) | `Migrated: …sema_drift_allapotgep_es_jobok (16ms)`; `server_start` a SHA-val |
| #61 | `82940ef` | Rendelések/Kosarak/Űrlapbeküldések listák + keresés-őr + doksi | `server_start` a SHA-val; migrációt nem igényelt |

`/` · `/admin` · `/kurzusok` → HTTP 200. Railway: projekt `pretty-spontaneity`,
service `Kineticare`, domain `kineticare-production.up.railway.app`.

**Amit ez megjavított:**

1. **Az admin listák használhatók.** A Kurzusok lista korábban NULLA
   adat-oszloppal rendelődött ki (a plugin `defaultColumns: ['prices']`-t állít
   be, de nincs `prices` nevű mező), ezért a kurzus meg sem volt nyitható. A
   Rendelések és Kosarak keresője Postgres-hibára futott (`ILIKE` egy
   `timestamptz` oszlopon). Az Űrlapbeküldések listája azonosítót és
   Turnstile-tokent mutatott beküldő és dátum helyett.
2. **A fizetési főlánc sémája teljes.** Rendelés létrejön (`created` →
   `payment_pending` → `paid` → `refunded`), a Barion-callback le tudja
   könyvelni a kimenetelét, és mind az öt job beütemezhető.

**Független igazolás:** a configból felépített teljes drizzle-séma
(**112 tábla, 60 enum**) ma pontosan megegyezik a legutolsó migrációs
snapshottal — **nincs több drift**.

**Ami ettől még NEM működik élesben:** a `BARION_POSKEY_TEST` ál-érték és a
`SZAMLAZZ_AGENT_KEY` nincs beállítva, tehát valódi vásárlás és számlázás még
nem futott. Lásd a 11. szakaszt.

## 2. ➡️ A KÖVETKEZŐ FELADAT: a pénzútvonal-javítás élesítése

> **Állapot 2026-08-10 ~14:00 UTC:** a munka **kész és zöld**, a
> `claude/higgsfield-mcp-integration-za6671` branchen (`8acfadc`), a **#62**
> PR-ben. **Egyetlen dolog hiányzik az élesítéshez: egy tulajdonosi
> visszaigazolás** (2.4). A PR címe még „WIP" — átcímezendő.

### 2.1 Mit old meg (két megerősített KRITIKUS hiba)

**Jobok.** A `jobs.autoRun` a Payloadban NEM állít sorba jobokat, csak a MÁR
SORBAN ÁLLÓKAT futtatja (a Payload saját típusdokumentációja mondja ki). A
kódban mindössze három task került valaha sorba (`invoice-issue`,
`storno-issue`, `corrective-invoice-issue`), az `order-poll` és a
`webhook-retry` **egy sem**. Élesben ez azt jelentette, hogy egy elveszett vagy
késői Barion-callback SOHA nem pótlódott: a fizető vevő rendelése örökre
`payment_pending` maradt — pénz levonva, kurzus nincs.

**Pénztár.** A „Számlázási adatok" kártya díszlet volt: a `handleSubmit` nem
olvasta ki az inputokat, a `<form>` `noValidate`. A beírt adat elveszett, és
hiányos profil mellett a fizetés lement, a kurzus kiment, **számla viszont soha
nem állt ki** — az egyetlen nyom egy warn-szintű naplósor.

### 2.2 Hogyan lett megoldva (három iteráció, két keresztreview)

| Kör | Mi történt |
| --- | --- |
| 1. | Két worktree-ügynök megírta a javítást. **Mindkettő elbukott a keresztreview-n**; a jobs-ág egy **blokkolóval**: a `schedule` bekapcsolása Payload-oldali sémaváltozást hoz, migráció nélkül a deploy a ma működő jobrendszert is leállította volna. |
| 2. | Javító kör. A jobs-ág két utat mért össze (marad a `schedule` + migráció, vagy saját `onInit`-ütemező) és indokolt döntést hozott; a checkout-ág hét találatot rendezett. **A review ismét „javítandó"** — a checkout-nál az EREDETI hiba még mindig visszaállítható volt zöld suite mellett. |
| 3. | A fő szál rendezte a maradékot (2.3), és legenerálta a migrációt. |

### 2.3 Amit a második review talált — és ami emiatt változott

1. **Az eredeti kliens-hiba visszaállítható volt zöld suite mellett.** A review
   független worktree-ben átírta a `handleSubmit`-et úgy, hogy megkerülje a
   tiszta magot és üres számlázási adatot küldjön — **168/168 teszt átment**. A
   `planCheckoutSubmission` jól tesztelt volt, de a **mag és a komponens közti
   huzalozás** — pontosan az a pont, ahol a hiba élt — fedezetlen maradt.
   Javítás: a mellékhatás-lánc külön gyárba került
   (`createCheckoutSubmitHandler`), és `src/__tests__/checkout-submit-handler.test.ts`
   DOM nélkül állítja, hogy a beküldött törzs a MÓDOSÍTOTT állapotból épül.
   **Negatív kontroll: az eredeti hiba visszaállítása négy teszten bukik.**
2. **Az akadálymentességi javítás fedezetlen volt** (a fókusz és a
   mezőhiba-törlés kivehető volt anélkül, hogy bármi bukjon). Most le van fedve,
   és az `aria-live` régió **mindig renderelődik**, üresen is — a dinamikusan
   beszúrt élő régiót több képernyőolvasó megbízhatatlanul jelenti be.
3. **A saját hibaüzenetünk példája** (`12345678-1-42`) olyan adószám volt, amit
   a rendszer elutasít: a vevő betűre követte volna az utasítást, és másik
   hibát kapott volna. A példa CDV-helyesre cserélve, és **önellenőrző teszt**
   futtatja át a súgószövegekből kiszedett példákat a validáción.
4. **A jobs-ág javító köre HAMIS állítást vitt a kódba**: azt írta, hogy a
   listáról hiányzó auth-hibakódot a szállítási-hiba-számláló „úgyis elkapja".
   A forrásból cáfolható — az `order`-osztályba esik, tehát SOHA nem szakít meg.
   A komment javítva, és bevezetve a hiányzó háló: **`MAX_LEADING_FAILURES` (5)**
   futás-szintű mennyezet, ami csak addig él, amíg nem volt egyetlen sikeres
   válasz sem — így a „rossz kulcs / teljes kimaradás" eset elkapódik, de egy
   mérgezett rendelés a sor elején nem tud sorfejként blokkolni.

Megnyugtató mellékeredmény: a review a CDV-algoritmust **három valódi magyar
cégadószámon** (MOL, OTP, Richter) ellenőrizte — mind átmegy, tehát a
szigorítás nem zár ki legitim céges vevőt.

### 2.4 ⚠️ Az élesítés EGYETLEN nyitott feltétele

**Be van-e állítva az `ENABLE_JOB_WORKERS` `true`-ra a Railway service-en?**

A jobok csak akkor futnak, ha igen (`src/jobs/index.ts`: `env.ENABLE_JOB_WORKERS === 'true'`).
Az agent ezt **nem tudja ellenőrizni**: a Railway MCP `railway-agent` helyesen
elrejti a változók értékét (`<hidden_from_agent>`), a `.env*` olvasása pedig
tilos. Annyi igazolt, hogy **a változó létezik** a service-en.

- Ha `true` → a deploy után a jobok azonnal futni kezdenek.
- Ha nem → a migráció akkor is biztonságosan lefut (additív), de a jobok nem
  indulnak; a beállítás lesz a következő lépés.

### 2.5 A migráció (a fő szál generálta, Payload-eszközzel)

`src/migrations/20260810_132919_job_utemezes_stats.ts` — **tisztán additív**:

```sql
CREATE TABLE "payload_jobs_stats" (
  "id" serial PRIMARY KEY NOT NULL, "stats" jsonb,
  "updated_at" timestamp(3) with time zone, "created_at" timestamp(3) with time zone);
ALTER TABLE "payload_jobs" ADD COLUMN "meta" jsonb;
```

Meglévő adatot nem ír át, **nem tud elbukni**, és a rollback is ártalmatlan (a
régi kód figyelmen kívül hagyja). Ez élesen más osztály, mint a #60 enum-cseréje.

**Kereszt-ellenőrzés:** a generált SQL **szó szerint egyezik** azzal, amit az
ügynök a snapshot-diffből előre megadott — két független úton ugyanaz.

**Igazolás éles módban, tiszta adatbázison:** a migráció lefut; a
`config.jobs.scheduling` ÉS `stats` igaz; mindkét periodikus task ütemezve (a
három esemény-vezérelt nem); a `payload-jobs-stats` global és a
`payload_jobs.meta` oszlop létezik és olvasható; a `payload_migrations`-ben
**nincs `dev` sor**.

### 2.6 Élesítés után KÖTELEZŐ megnézni

A jobok most futnak először élesben, **ál-Barion-kulccsal**. A javítás pont
ezt kezeli (megszakít és riaszt), de az első futásokat nézd meg a Railway
deploy-logban: van-e `RIASZTÁS:` sor, és nem termel-e naplóözönt.

### 2.7 Amit a review nyitva hagyott (alacsony súly, NEM blokkoló)

| Ág | Tétel |
| --- | --- |
| jobs | Maradék sorfej-blokkolás: 3 egymást követő szállítási hiba a batch ELEJÉN tartósan elzárja a mögötte lévőket |
| jobs | Beragadt job mellett fékezetlen error-szintű naplóözön (nincs throttling) |
| checkout | Az „elérhetetlen ág" találat csak részben teljesült, a hozzáírt komment téves |
| checkout | A külföldi irányítószám-kompromisszum dokumentációja alábecsüli a hatást |
| checkout | Elavult adószám-fixtúrák a repóban, és a két éles viselkedésváltozás sehol nincs rögzítve |

**A két éles viselkedésváltozás, amit a megrendelőnek tudnia kell:**
(a) hiányos számlázási adattal **innentől nem lehet fizetni** (eddig lement a
fizetés, csak a számla maradt el) — ez helyes, de a konverzióban látszani fog;
(b) **nem magyar irányítószámról nem lehet vásárolni**, mert a számla-XML
`<vevo>` blokkja ma nem tartalmaz `<orszag>` taget. Ez tulajdonosi döntést
igényel.

## 3. Nyitott, IGAZOLT tételek — prioritással

Ezeket egy 17 ügynökös audit-kör tárta fel, és mindegyiket egy független
ügynök adverzariálisan igazolta (`valos=true`). A sorrend az én javaslatom.

| # | Tétel | Miért ennyire fontos |
| --- | --- | --- |
| 1 | **G1–G4 CI-őrök** (lásd 3.1) | Ezek a MAI teljes incidenst elkapták volna. Két őrhöz működő prototípus is készült. |
| 2 | A 2. szakasz két javításának befejezése | Pénz és számlaadási kötelezettség múlik rajta. |
| 3 | **A checkout a PISZKOZAT verzióból dönt** | A `startCheckout` `draft: true`-val olvas, az ár-snapshot és a storefront a publikált sorból. Egy félkész szerkesztés azonnal átbillenti a vásárolhatóságot, miközben az oldalon semmi nem változik: a kurzusoldal árat és „Megveszem" gombot mutat, de minden vásárlás 400-zal hasal el. Fordítva: piszkozatban `published`-re állított kurzus az API-n megvásárolható, miközben meg sem jelenik. Napló nincs. |
| 4 | **A Rendelések listán nem látszik, MIT vettek** | A megrendelő első admin-igénye („ki mit vett és mikor"). A tételek egy névtelen tab alatt, összecsukott tömbben ülnek; oszlopként sem segít, mert a Payload `ArrayCell`-je csak darabszámot ír ki. Külön megjelenítés kell. |
| 5 | **A carts keresője némán 0 találatot ad** | A #61-ben a `carts.useAsTitle` `id` lett, ami megszünteti a Postgres-hibát — de a Payload a `like`-ot `equals`-re fordítja az id-n, tehát nem-számra némán üres, számra pedig pontos egyezés. Nem hiba, de dokumentálandó/jobbítandó. |
| 6 | T-013 statisztika-nézet | Megrendelői igény, nincs megírva. Teljes spec a 9. szakaszban. **Tulajdonosi döntésre vár.** |
| 7 | Admin videó-feltöltés (tus) | Megrendelői igény; a megvalósult állapot tudatos eltérés (Bunny + kézi GUID). **Megrendelői döntés kell.** |

### 3.1 A négy javasolt CI-őr (G1–G4)

Egy ügynök nem csak javasolta, hanem **meg is építette és lemérte** őket.

- **G1 — séma-drift őr** (`src/__tests__/schema-drift-guard.test.ts`): a
  migrációk `up()` blokkjait ál-`db`-vel lefuttatja, a drizzle SQL-objektum
  `queryChunks`-ából kiolvassa a statikus SQL-t, újrajátssza a sémát, és
  összeveti a legutolsó snapshottal. **Adatbázis nem kell.** Pozitív kontroll a
  mai HEAD-en: 12 migráció, 833 statement, 0 ismeretlen utasítás, 0 eltérés,
  2,8 s. Negatív kontroll (a mai két javító migrációt kivéve): pontosan a négy
  éles driftet adja vissza, hamis találat nélkül.
- **G2 — konfig ↔ snapshot őr** (`src/__tests__/schema-config-sync.test.ts`): a
  Payload postgres-adapter séma-építése NEM igényel DB-kapcsolatot, ezért a
  configból `generateDrizzleJson`-nal előállítható ugyanaz a formátum, mint a
  snapshot. **Ez fogta volna el a driftet ELSŐKÉNT** — a kód már tartalmazta a
  `refunds` mezőt és a `payment_pending` státuszt, amikor a snapshot még nem.
- **G3 — migráció-immutabilitás** (`.checksums.json` manifest + CI-lépés): a
  CLAUDE.md 3. tilos zónája ma őr nélkül áll, és **pont ez okozta a driftet** —
  egy későbbi commit visszanyúlt egy korábbi migráció snapshotjához
  (`git log` szerint a 2026-07-30-i migráció snapshotja a 08-08-i commitban
  keletkezett). A git-ág előfeltétele: a `ci.yml` `actions/checkout` lépéseihez
  `fetch-depth: 0` kell.
- **G4 — migráció-integritás**: minden `.ts`-hez van `.json`, az `index.ts`
  pontosan a fájlokat sorolja lexikografikus sorrendben, a fájlnevek
  időrend-tartók. **A mai incidens ELSŐ dominója egy hiányzó `.json` volt** — a
  migráció 9 napig snapshot nélkül állt a repóban, zöld CI mellett.

## 4. ⛔ Amit MEGCÁFOLTAK — ezeket NE csináld meg

Az adverzariális kör két „hibát" is elejtett. Ez megtakarított munka, ne
kezdd újra:

- **„Néma ingyenes-csapda az árazásban"** — az az állítás, hogy a `HUF ár
  engedélyezése` pipa hiánya ingyen kiadja az egyébként fizetős kurzust,
  **a teherhordó magjában hamis**.
- **„Fordítatlan select-opciócímkék őre"** — a bejelentett három élő találat
  nem áll fenn, és a javasolt szabály maga okozott volna regressziót.

Ugyanígy: a #61 kódváltozásait hat támadási vektorral próbálták megtörni, és
**egyik sem talált valós hibát** — az `orderNumber` NULL-esete, a
`listSearchableFields` access-oldala, az `orders` oszlopainak owner-only
szivárgása és a magyar címkék DB-hatása mind tisztázva van.

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

## 6. Tilos zónák — amire a gyakorlatban figyelj

- Titok soha, sehova (a tesztek DUMMY-mintát használnak); `.env*`-hez nem nyúlunk
  (a `.env.example`-bővítés maintainer-teendőként jelzendő).
- `confirmOrder` tilos — a `ecommerce-payments-guard.test.ts` végrehajtható őr.
- Migráció csak Payload-generálva; meglévő migrációs fájl nem szerkeszthető.
- Access-control-változás emberi jóváhagyás nélkül tilos — **ez a kör nem érint
  access-t**; az F7-nél felmerült field-access-ötlet és az M-12 (Users-access)
  külön, emberi jóváhagyású PR-re vár (task #51).
- Pinned `@payloadcms/*`, package.json, lockfile: érintetlen marad.

## 7. Üzemeltetői és fiók-oldali backlog (nem kód)

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

A KÓD-oldali backlog a 3. szakaszban van, prioritással.

---

# MÁSODIK RÉSZ — TECHNIKAI ANYAG

> A 8. szakasz a ma lezárt séma-drift esete: **a receptjei újra kelleni
> fognak**, ezért maradt benne. A 9–11. szakasz kiadható feladatleírás — elég
> részletes ahhoz, hogy egy másik agent a repó ismerete nélkül nekiálljon:
> pontos fájlnevek, mezőnevek, oszlopnevek, bekötési pontok és elfogadási
> kritériumok.

## 8. SÉMA-DRIFT: a ma lezárt eset és a receptek

> **✅ LEZÁRVA** — mindkét migráció élesben van (#59 `d4c5ca1`, #60 `db9ed72`),
> és a konfigból generált séma ma pontosan egyezik a snapshottal. Ez a szakasz
> **azért marad benne**, mert a hiba osztálya néma és visszatérő: a 8.2-es
> ellenőrző recept és a 8.3-as migráció-generálási fogás újra kelleni fog. A
> 8.5–8.6 a kockázatkezelést és a kétlépcsős élesítést rögzíti.

### 8.1 Mi a baj — a hiba osztálya

Több mező és enum-érték szerepel a Payload-konfigban **és a séma-snapshotokban**
(`src/migrations/*.json`), **de egyetlen migrációs `.ts` sem hozza létre őket**.

Azért maradt észrevétlen, mert **fejlesztői módban a Payload `push`-a némán
pótolja** a hiányzókat (és beír egy `dev` sort a `payload_migrations` táblába).
Éles módban (`NODE_ENV=production`) a push ki van kapcsolva → a séma soha nem
áll össze. Minden fejlesztői próba működik, az éles rendszer néma halott.

**A drift teljes listája** (tiszta, csak-migrációs adatbázis vs. a konfig
szerinti igazi séma összevetéséből):

| Hiányzik élesben | Következmény |
| --- | --- |
| `orders.refunds` (jsonb) | **minden** orders-olvasás és -írás elszáll |
| `enum_orders_status`: `created`, `payment_pending`, `paid`, `payment_failed` | rendelés **létre sem jön**, fizetés nem rögzíthető |
| `enum_payload_jobs_task_slug` + `..._log_task_slug`: `invoice-issue`, `order-poll` | a **számlázó** és a **fizetés-lekérdező** job nem ütemezhető |
| `webhook_events.processed_at`, `webhook_events.result` + `enum_webhook_events_result` (5 érték) | a Barion-callback nem tudja lekönyvelni a kimenetelét |

Vagyis: a fizetési főlánc élesben **működésképtelen volt**. Ez magyarázza,
hogy „még nem futott éles vásárlás" — nem is tudott volna.

### 8.2 Hogyan derül ki (reprodukálható recept)

Ez a legfontosabb rész: **ezzel a módszerrel bármikor újra ellenőrizhető.**

1. Tiszta adatbázis A: `createdb` → `npx payload migrate` → ez a **valós éles
   séma** (csak a commitolt migrációk).
2. Tiszta adatbázis B: `createdb` → `npx payload migrate` → majd **fejlesztői
   módban** egy `getPayload({ config })` hívás → a push szinkronba hozza a
   konfiggal → ez a **konfig szerinti igazi séma**.
3. Vesd össze a kettőt:

```sql
-- oszlopok
select table_name||'.'||column_name||' :: '||data_type
from information_schema.columns where table_schema='public' order by 1;
-- enum-értékek
select t.typname||' = '||e.enumlabel from pg_enum e
join pg_type t on t.oid=e.enumtypid order by t.typname, e.enumsortorder;
```

`comm -13 <A> <B>` = ami élesben HIÁNYZIK. Üres kimenet = nincs drift.

4. Végső próba éles módban, A adatbázison:
   `NODE_ENV=production` + `payload.find`/`create`/`update` + `payload.jobs.queue`.
   Ellenőrizd, hogy a `payload_migrations`-ben **nincs `dev` sor** — különben a
   push pótolt, és hamis zöldet mérsz.

### 8.3 Hogyan generálj migrációt, ha a snapshot HAZUDIK

Ez a kör legfontosabb fogása. A `payload migrate:create` a **legutolsó
séma-snapshotot** diffeli a konfig ellen (`buildCreateMigration.js`:
`generateMigration(drizzleJsonBefore, drizzleJsonAfter)`), **nem az
adatbázist**. Ha a snapshot már tartalmazza a hiányzó oszlopot, a válasz:
`No schema changes detected` — és felajánl egy üres migrációt, amit kézzel
kellene kitölteni. **Az tilos** (CLAUDE.md 3. zóna).

**A megoldás — kétlépéses generálás, végig a Payload eszközével:**

1. **Ideiglenesen állítsd a konfigot a VALÓS éles állapotra** (vedd ki a
   mezőt, állítsd vissza az enum-értékeket, vedd ki a job-taskokat). Készíts
   előbb másolatot az érintett fájlokról!
2. `npx payload migrate:create temp_valos_eles_allapot` → ez **eldobható**, de
   a mellette született `.json` snapshot mostantól a valóságot tükrözi. (A
   `down()`-ja pont a keresett SQL — de NE másold ki kézzel.)
3. **Állítsd vissza a konfigot** a másolatokból.
4. `npx payload migrate:create <rendes_nev>` → a Payload most a valós
   állapotból diffel, és **maga generálja** a helyes `ALTER TABLE` /
   `ALTER TYPE` utasításokat.
5. **Töröld az eldobható migrációt** (`.ts` + `.json`), és vedd ki a
   bejegyzését a `src/migrations/index.ts`-ből. Ez a saját, még soha nem
   futtatott melléktermék eltávolítása — NEM meglévő migráció szerkesztése.

Így az SQL-t végig a Payload írja; kézzel egyetlen utasítást sem fogalmazol.

### 8.4 ✅ ÉLESÍTVE — mindkét migráció kint van

| | 1. lépcső | 2. lépcső |
| --- | --- | --- |
| Migráció | `20260810_094820_szamlazz_refunds_oszlop` | `20260810_095237_sema_drift_allapotgep_es_jobok` |
| PR | #59 | #60 |
| main | `d4c5ca1` | `db9ed72` |
| deploy-log | `Migrated: … (4ms)` | `Migrated: … (16ms)` |
| `server_start` commitSha | `d4c5ca1` | `db9ed72` |

Az 1. lépcső **additív** volt (`ALTER TABLE "orders" ADD COLUMN "refunds" jsonb;`),
tehát adattól függetlenül nem tudott elbukni — ezért mehetett előre. A 2.
lépcső kockázatos magja az `orders.status` enum újraépítése volt (lásd 8.5).

Igazolás élesítés előtt: tiszta adatbázis → `npx payload migrate` →
`NODE_ENV=production` mellett a teljes életciklus lefut — rendelés létrehozás
(`created`, `KH-2026-000001`) → `payment_pending` → `paid` → `refunded` →
visszatérítés-nyom írás → webhook-esemény kimenetellel → **mind az öt job**
ütemezése (`order-poll`, `invoice-issue`, `storno-issue`,
`corrective-invoice-issue`, `webhook-retry`). A `payload_migrations` táblában
**nincs `dev` sor**, tehát nem a fejlesztői push takarta el a hiányt.

### 8.5 A 2. lépcső kockázata és ahogy kezeltük

A generált SQL kockázatos MAGJA az `orders.status` enum újraépítése (a
migráció ezen felül a job-task-slug enumok `ADD VALUE`-jait, az
`enum_webhook_events_result` létrehozását és a két `webhook_events` oszlopot is
tartalmazza — azok mind additívak):

```sql
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'created'::text;
DROP TYPE "public"."enum_orders_status";
CREATE TYPE "public"."enum_orders_status" AS ENUM('created','payment_pending','paid','payment_failed','cancelled','refunded');
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'created'::"public"."enum_orders_status";
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
```

Ha **bármelyik meglévő sor** `processing` vagy `completed` státuszú, a `USING`
konverzió elszáll. Kipróbálva, ez a pontos hibaüzenet:

```
invalid input value for enum enum_orders_status: "processing"
```

A Railway `startCommand`-ja `npx payload migrate && npm start`, tehát egy bukó
migráció azt jelenti, hogy **az alkalmazás el sem indul** — éles leállás.

**Amit tettünk:** előbb az 1. lépcső (additív) ment ki. Attól kezdve a
Rendelések lista élesben újra működött, és a tulajdonos visszaigazolta, hogy a
lista **teljesen üres** — nincs átkonvertálandó sor. Csak ezután ment ki a 2.
lépcső. Az éles adathoz az agent nem fér hozzá: a Railway MCP `railway-agent`
helyesen NEM adja ki a Postgres jelszavát (`<hidden_from_agent>`), a `.env*`
olvasása pedig tilos.

### 8.6 Ha LEGKÖZELEBB enum-értéket kell cserélni

Ez a recept marad érvényes, ha a jövőben megint enum-készlet változik ÉS már
van éles adat:

1. **Adat-ellenőrzés előbb.** `SELECT status, count(*) FROM orders GROUP BY status;`
   Ha van olyan sor, aminek az értéke az ÚJ készletben nem szerepel, a
   típus-újraépítés elbukik.
2. **Ha van ilyen sor**, két járható út van:
   - a szerkesztő az adminban átállítja őket egy megmaradó státuszra, vagy
   - a konfig **megtartja** a régi értékeket az enumban — de ez **csak akkor
     additív, ha a megtartott értékek EREDETI RELATÍV SORRENDJE sértetlen
     marad.** A drizzle-kit pozíció-alapú szekvencia-diffel dolgozik: ha a régi
     érték a listában hátrébb kerül, azt `removed`+`added` párnak látja, és nem
     `ADD VALUE`-t, hanem TÍPUS-ÚJRAÉPÍTÉST generál — vagyis pontosan a fenti,
     elbukó `USING` konverziót. Az `options` tömböt tehát úgy kell
     összeállítani, hogy a régi DB-sorrend részsorozata maradjon az újnak.
     **A generált migrációban ellenőrizd is:** csak `ALTER TYPE … ADD VALUE`
     sorok lehetnek benne, `DROP TYPE` egy sem.
3. **Kétlépcsős élesítés**, ha a kockázatos rész elkülöníthető: előbb az
   additív fele, utána — a felszabaduló felület birtokában — a kockázatos.

### 8.7 Tanulság, amit érdemes kikényszeríteni

A hiba osztálya általános és néma. Érdemes CI-lépés vagy teszt, ami tiszta
adatbázison lefuttatja a migrációkat, majd `NODE_ENV=production` mellett
minden collectionre végez egy `find`-ot, és elvégzi a 8.2-es A/B
séma-összevetést. Ez minden jövőbeli driftet azonnal elkap. **Ez maga is
kiadható feladat**, és a mostani tapasztalat alapján magas prioritású:
két teljes fejlesztési kör (fizetés-állapotgép, job-alapú számlázás) landolt
úgy, hogy élesben egyáltalán nem működhetett.

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
4. Bevételnek **kizárólag a `paid` státuszú rendelések** számítanak; a
   `refunded`, `payment_failed` és `cancelled` teljes egészében kimarad az
   aggregátumból (lásd 9.6 1. szabály és 9.10 5. teszteset). A visszatérítések
   külön kimutatása **nem része ennek a feladatnak** — ha később mégis kell, az
   a `refunds` mező owner-only olvasása miatt önálló, jogosultsági döntést
   igénylő kör.
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
| `refunds` | `refunds` | **owner-only olvasás** (`read: isOwnerFieldAccess`) — **ne olvasd be ebbe a nézetbe**. Az oszlop a 8.4 óta élesben létezik. |

A táblázat a **konfig szerinti** sémát írja le, ami a 8. szakasz két
migrációja óta megegyezik az élessel. Korábban nem egyezett — ha valaha
gyanús eltérést látsz, a 8.2-es A/B recepttel ellenőrizd, ne feltételezd.

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
- **Ne olvasd be a `refunds` mezőt** semmilyen formában: owner-only olvasás,
  tehát egy `staff` szerkesztőnek látható nézetbe nem kerülhet (CLAUDE.md 4.
  zóna).
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

⚠️ Ez a vázlat **`created_at` szerint** csoportosít, tehát a 9.5-ös (A) utat
képezi le. Ha az aggregátorban a javasolt (B) utat választottad, a hónap-kulcsot
itt is a `COALESCE(o.invoice_completion_date, to_char(o.created_at AT TIME ZONE
'Europe/Budapest','YYYY-MM-DD'))` első 7 karakteréből kell képezni — különben a
nyers SQL más hónapba sorol, mint a JS-aggregátor.

⚠️ A `COUNT(DISTINCT o.id)` itt (hónap, célközönség) bontásban számol: egy
vegyes rendelés MINDKÉT sorban megjelenik, ezért a két sor darabszáma **nem
adható össze** havi rendelésszámmá. A `MonthlyRevenueRow.orderCount`-hoz külön,
csak hónapra csoportosító `COUNT(DISTINCT o.id)` lekérdezés kell.

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

**c) 🔴 Szerepkör-kapu a nézetben — ez NEM opcionális, ez az EGYETLEN védelem.**

A Payload 3.86 az `admin.components.views`-ben regisztrált útvonalakat
**nyilvános** admin-route-ként kezeli: az `isCustomAdminView` bármely
konfigurált view-path-ra igazat ad, ezért a Root view auth-átirányítása
(`Root/index.js`: `if (!permissions.canAccessAdmin && !isPublicAdminRoute(…) &&
!isCustomAdminView(…)) redirect(…)`) **kimarad**.

Következmény: **be sem jelentkezett látogató is elérheti a
`/admin/statisztika` oldalt**, és a szerver-komponensed `req.user === null`
mellett fut le. A kapu tehát nem „a bejelentkezés fölé" jön — a kapu maga a
teljes védelem, és a be-nem-jelentkezett esetet is le kell fednie. A
`hasStaffOrOwnerRole(null)` `false`-t ad, ezért az alábbi minta helyes; a kapu
elhagyása vagy pusztán a NavLink elrejtése **nyilvános bevétel-kimutatást**
eredményezne.

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

**Írj rá tesztet is:** a kapu a nézet egyetlen védelme, tehát ugyanolyan
elbánást érdemel, mint egy access-szabály — legyen eset a be-nem-jelentkezett
(`req.user === null`), a `customer` és a `staff` ágra.

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
