# CI-őrök (G1–G4 + meta-őr)

A CLAUDE.md **3. TILOS ZÓNÁJÁNAK** („Adatbázis-migrációkat kézzel ne írj és ne
módosíts.") és a séma↔kód egyeztetésének **végrehajtható őrei**. Dokumentált
tilalom önmagában nem véd: ezek a tesztek minden CI-futásban lefutnak, és
bukással jutalmazzák a szabálysértést.

## Miért léteznek

A **2026-08-10-i séma-drift incidens** mutatta meg a vakfoltot: a config és a
migrációs lánc csendben szétcsúszott, és **9 napig zöld CI mellett állt az éles
környezet** — a build és a tesztek mind átmentek, mert semmi sem asszertálta,
hogy a deklarált séma, a snapshotok és a migrációs fájlok egymásnak megfelelnek.
A négy őr ennek a négy független csúszásmódnak a fogása; a meta-őr pedig magukat
az őröket védi a csendes eltűnéstől.

Az őrök a vitest-sor részei (`src/__tests__/`), tehát a `verify` CI-job
(typecheck → vitest → eslint) futtatja őket minden PR-en és main-pushon.

## Őrönként: mit fog, miért, bukáskor mi a teendő

### G1 — schema-drift-guard (`src/__tests__/schema-drift-guard.test.ts`)

- **Mit fog:** a migrációs lánc replay-je a legfrissebb snapshotot állítja elő
  — ha a migrációk nem reprodukálják a snapshotot, valahol a generált lánc és a
  deklarált séma szétcsúszott.
- **Miért:** az incidens pontosan ez a csúszás volt; a snapshot a
  `migrate:create` kiindulási alapja, a sérült lánc minden későbbi migrációt
  megfertőz.
- **Bukáskor:** a migráció hibás — a sorban ne patkold. A legfrissebb migrációt
  a Payload eszközével generáltasd újra (`migrate:create`), hogy a snapshot és a
  .ts újra konzisztens legyen; a hibás migráció eltávolításához lásd a
  baseline-szabályt lentebb.
- A G1 pozitív kontroll mérése: 855 up-statement (és 331 down-statement parse), 0 ismeretlen utasítás.

### G2 — schema-config-sync (`src/__tests__/schema-config-sync.test.ts`)

- **Mit fog:** a payload.config deklarált sémája ↔ a legfrissebb migrációs
  snapshot eltérése (collection, mező, típus).
- **Miért:** a config-változás migráció nélkül csendes drift — a G1 a láncon
  belüli konzisztenciát, a G2 a config↔lánc konzisztenciáját fogja.
- **Bukáskor:** új migráció generálása a Payload eszközével (`migrate:create`),
  sosem kézi .ts-írás; az új migráció után a G3/G4 kötelezettségei érvényesek
  (lásd lent: pár + manifest).

### G3 — migráció-immutabilitás (`src/__tests__/migration-immutability.test.ts`)

- **Mit fog:** (a) a `src/migrations/.checksums.json` manifest minden datált
  migrációs fájl LF-normalizált sha256-át tartalmazza, és a working-tree
  bit-pontosan egyezik vele; (b) a **baseline** (a manifestet behozó commit,
  dinamikusan: `git log --diff-filter=A -1 -- src/migrations/.checksums.json`)
  óta a könyvtárban datált fájl csak újként és csak .ts+.json párban jöhet, az
  index.ts és a manifest csak módosulhat; (c) a manifest append-only; (d) a
  baseline-commit tiszta (pontosan a manifestet adta hozzá); (e) az új .ts
  fájlok **up() oldalán** destruktív utasítás csak elismerő sorral (a down()
  sosem igényel markert).
- **Miért:** a már lefutott migráció utólagos bitorlása visszafordíthatatlan —
  az éles adatbázis a régi tartalmat alkalmazta. A baseline azért kell, mert a
  main története NEM tiszta (a `20260730_080404_sync_schema_code.ts` és a .json
  párja külön commitban jött) — a szabályok csak a baseline utáni eseményekre
  haraphatnak.
- **Bukáskor:**
  - **Régi fájl módosult** (checksum-eltérés vagy történeti M/D): állítsd vissza
    a tartalmat (**revert**) — meglévő migrációt sosem szerkesztünk; ha a
    módosítás szándékos volt, az emberi maintainer dönt (lásd baseline lent).
  - **Új migrációt adtál hozzá:** frissítsd a manifestet ugyanabban a PR-ben:
    `npx tsx src/scripts/update-migration-checksums.ts`
  - **Destruktív-op jelzés:** ha az új migráció **up() oldala** `DROP TABLE` /
    `DROP COLUMN` / `DROP TYPE` / `SET DATA TYPE ... USING` utasítást tartalmaz,
    a fájlba a kategóriánkénti elismerő sor kell, pontosan így:
    `// destruct-op-ack: <DROP TABLE|DROP COLUMN|DROP TYPE|USING> — <indoklás>`
    (em-dash, nem-üres indoklás). A detektor KIZÁRÓLAG az up()-oldalt vizsgálja
    — a forrást az `export async function down` határán bontja, és a repo
    migrációinak egységes vázától eltérő fájlnál hangosan bukik. A down()
    **sosem igényel markert**: minden Payload-generált down() rutinszerűen
    DROP TABLE/DROP TYPE-ot tartalmaz, az a visszagörgetés szükségszerű része.
    A marker **nem kivétel-engedély**: a humán
    PR-review-nek szóló **kényszer-nyilatkozat**, amely kikényszeríti, hogy a
    destruktív művelet tudatosan le legyen írva és review-ban látható legyen.
    A `DROP INDEX` szándékosan nem kategória — az index újraépíthető.
  - **A marker a G3 kapujára szól, a G1 replay-motorjára NEM felmentés:** egy
    elismert destruktív up() (pl. `DROP TABLE`) a G1-ben ma is hangosan bukik,
    mert a replay-whitelist az ilyen családokat szándékosan csak down()-oldalon
    ismeri. Jóváhagyott destruktív migráció élesítéséhez a G1 replay-kezelőit
    is tudatosan ki kell bővíteni ugyanabban a PR-ben — ez emberi review-val
    járó, szándékos bővítés, nem mellékhatás.

### G4 — migráció-integritás (`src/__tests__/migration-integrity.test.ts`)

- **Mit fog:** (a) minden `YYYYMMDD_HHMMSS_<név>.ts`-hez létezik az azonos nevű
  .json és fordítva; (b) a könyvtár whitelist-tiszta (csak datált párak,
  index.ts, .checksums.json, .DS_Store); (c) az időbélyeg-prefixek egyediek, a
  lista szigorúan monoton nő; (d) minden snapshot .json parse-olható, `version`
  és `dialect` string kulccsal; (e) az index.ts `migrations`-tömbje pontosan a
  rendezett könyvtári .ts-lista.
- **Miért:** az éles futtatás a KÖNYVTÁRAT olvassa (`readMigrationFiles`: név
  szerint rendez, az index.ts-t kihagyva minden .ts-t importál) — egy kóbor .ts
  éles deploy-összeomlás; az árva pár a `migrate:create`-et töri; a
  fejlesztői futtatás az index.ts-t olvassa, a kettő szétcsúszása kettős láncot
  jelentene.
- **Bukáskor:** a fájlhalmazt kell konzisztenssé tenni (hiányzó pár legeneráltatva
  a Payload eszközzel, kóbor fájl eltávolítva, index.ts a generált állapotra
  hozva) — sosem kézi migrációszerkesztéssel. Új migráció után a manifestet is
  frissíteni kell (lásd G3).

### Meta-őr (`src/__tests__/guard-files-integrity.test.ts`)

- **Mit fog:** a kilenc őrzött fájl létezik (a vitest-include egy törölt
  őrtesztet némán elnézne): az öt őrteszt (G1–G4 + meta-őr), a G1/G2 megosztott
  motorja (`helpers/migration-schema.ts`), a 2. tilos zóna végrehajtható őre
  (`ecommerce-payments-guard.test.ts`) és az incidens-regressziós őrök
  (`koszonom-oldal.test.ts`, `payload-config.test.ts`) — és egyik sem
  tartalmazhatja a kihagyó/fókuszáló/környezet-elnéző tokeneket, még kommentben
  sem.
- **Bukáskor:** a törölt őrfájlt visszaállítani; a tokent eltávolítani. Az
  őrfájl-halmaz tudatos módosítása csak külön, emberi review-jú PR-ben, a
  meta-őr egyidejű frissítésével.

## Teljes klón követelmény (`fetch-depth: 0`)

A G3 git-történetet olvas a baseline-commitig, ezért **teljes klón kell**:
shallow klónban a baseline nem oldható fel, és a G3 **fail-closed** módon bukik
(sosem megy át csendben). A CI `verify` job checkoutja ezért `fetch-depth: 0`
(gitleaks-minta), és helyi munkához is teljes klón kell — a
`git clone --depth`-tel készült másolatban a G3 történeti tesztjei nem futnak.

## A baseline „frissítése" — SZÁNDÉKOSAN NEM rutinfolyamat

A baseline a manifestet behozó commit, amelyhez képest a G3 a történeti
szabályokat méri. **Nincs olyan fejlesztői út, amely a baseline-t „frissíti".**
Ha a történet bepiszkítása tudatosan rendezendő (pl. régi migráció jogos
cseréje), az kizárólag **tudatos újrabevezető PR-ben** történhet: a manifest
**törlése és újra-hozzáadása külön, tiszta commitban** (a törlő commit a régi
baseline-t zárja, a tiszta add-commit lesz az új baseline — a (d) tisztasági
szabály miatt a commit a könyvtárban csak a manifestet adhatja hozzá). A PR-ben
az indoklás és az emberi jóváhagyás kötelező.

## Megjegyzések

- **`.checksums.json` név:** a `migrate:create` a legfrissebb snapshotot
  `readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse()[0]`
  módon választja — a pont-prefix miatt a manifest a rendezés elejére kerül,
  így sosem választódhat „legutolsó" snapshotnak. A manifestet ezért kötelező
  pontosan így nevezni, és az src/migrations/ alatt tartani.
- **`.DS_Store`:** a macOS-szemét explicit engedélyezett a könyvtárban (a
  gitignore úgyis kiszűri, commitba nem kerülhet) — a G4 whitelistje azért
  engedi, hogy egy fejlesztői Finder-megnyitás ne törje a CI-t; minden más
  idegen fájl bukás.
- **Sorvégek:** a checksumok LF-normalizált tartalomra szólnak; a
  `.gitattributes` (`src/migrations/** text eol=lf`) és a `.prettierignore`
  (`src/migrations/`) gondoskodik róla, hogy eszköz ne írhassa át a bájtokat.
