import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

/**
 * A CLAUDE.md 3. TILOS ZÓNÁJÁNAK VÉGREHAJTHATÓ ŐRE (G3 — migráció-immutabilitás).
 *
 * „Adatbázis-migrációkat kézzel ne írj és ne módosíts." — a zóna azért létezik,
 * mert a már lefutott migrációk utólagos bitorlása visszafordíthatatlan: az éles
 * adatbázis a régi tartalmat alkalmazta, a migrációs lánc a fájltartalmakra épül,
 * és a Payload éles futtatása a KÖNYVTÁRAT olvassa (readMigrationFiles: `.sort()`,
 * az index.ts-t kihagyva minden .ts-t dynamic-importál). A 2026-08-10-i
 * séma-drift incidens (9 nap zöld CI éles leállás mellett) mutatta meg, hogy a
 * dokumentált tilalom önmagában kevés — végrehajtható őr kell.
 *
 * A G3 öt, EGYMÁSTÓL FÜGGETLEN fogása:
 *
 *  1. working-tree ↔ manifest: a src/migrations/.checksums.json minden datált
 *     migrációs fájl (`YYYYMMDD_HHMMSS_<név>.ts` / `.json`) LF-normalizált
 *     sha256-át tartalmazza; a working-tree mindkét irányban teljesen egyezik
 *     vele (hiányzó entry, eltérő checksum, árva fájl = bukás, a javító
 *     paranccsal együtt);
 *  2. git-történeti szabályok a BASELINE óta: a `baseline..HEAD` diffben a
 *     datált fájlok CSAK újként (A) és csak .ts↔.json párban jöhetnek; az
 *     index.ts és a manifest csak módosulhat (M); minden más státusz vagy
 *     idegen fájl bukás (a `--no-renames` miatt az átnevezés D+A-ként látszik,
 *     és a D buktat);
 *  3. append-only manifest: a baseline-beli manifest minden entry-je
 *     változatlanul szerepel a HEAD-beliben (kurtítás vagy újrahash-elés bukás);
 *  4. baseline-tisztaság: a baseline-commit a könyvtárban PONTOSAN a manifestet
 *     adhatta hozzá — különben maga a baseline hordozhat bepiszkítást;
 *  5. destruktív-op detektor: a baseline óta HOZZÁADOTT .ts fájlokban
 *     statement-szintű `DROP TABLE` / `DROP COLUMN` / `DROP TYPE` /
 *     `SET DATA TYPE ... USING` jelenléte bukás, KIVÉVE ha a fájl a
 *     kategóriánkénti elismerő sort tartalmazza:
 *       // destruct-op-ack: <DROP TABLE|DROP COLUMN|DROP TYPE|USING> — <indoklás>
 *     A marker nem kivétel-engedély, hanem a humán PR-review-nek szóló
 *     KÉNYSZER-NYILATKOZAT (lásd docs/ci-orok.md). A `DROP INDEX` szándékosan
 *     NEM kategória — az index újraépíthető, adatot nem veszít.
 *
 * BASELINE-feloldás: dinamikus, NINCS beégetett sha — a legfrissebb commit, ami
 * a manifestet hozzáadta (`git log --diff-filter=A -1`). Azért kell baseline,
 * mert a main története NEM tiszta: a 20260730_080404_sync_schema_code.ts a
 * 60ce40c-ben, a .json párja csak a 7cebfea-ban jött — a szabályok tehát csak a
 * baseline UTÁNI eseményekre haraphatnak.
 *
 * FAIL-CLOSED: git-hiba, hiányzó történet (shallow klón) vagy feloldhatatlan
 * baseline mind BUKÁS — a teszt sosem megy át csendben. Teljes klón kell
 * (CI-ben actions/checkout `fetch-depth: 0` — a ci.yml verify jobban).
 *
 * A git-szabálymotor tisztán tesztelhető függvényekre van bontva, és a (2)-(4)
 * szabályait SZINTETIKUS FIXTURE-REPÓBAN is igazoljuk (temp könyvtár, helyi
 * `git init` és scriptelt commitok — ez NEM hálózati hívás). A destruktív-op
 * detektor a valódi repóban a baseline commitja előtt vakuumban zöld lenne,
 * ezért a markerprotokoll minden ága szintetikus forrás-stringekkel van
 * letesztelve ugyanebben a fájlban.
 */

// ---------------------------------------------------------------------------
// Közös konstansok és típusok
// ---------------------------------------------------------------------------

/** A datált migrációs fájl nevének alakja — a G4-őr és a generátor ugyanezt használja. */
const DATED_FILE = /^\d{8}_\d{6}_[a-z0-9_]+\.(ts|json)$/
const DATED_TS = /^\d{8}_\d{6}_[a-z0-9_]+\.ts$/
const MANIFEST_REL = 'src/migrations/.checksums.json'
const MIGRATIONS_PREFIX = 'src/migrations/'
const FIX_COMMAND = 'npx tsx src/scripts/update-migration-checksums.ts'

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const MIGRATIONS_DIR = join(REPO_ROOT, 'src/migrations')

interface ChecksumManifest {
  version: number
  entries: Record<string, string>
}

/** A `git diff/show --name-status` egy sora (a `--no-renames` miatt a státusz egybetűs). */
interface NameStatusEntry {
  status: string
  path: string
}

/** A destruktív-op detektor kategóriái — az elismerő sor ezeket nevezi meg. */
type DestructCategory = 'DROP TABLE' | 'DROP COLUMN' | 'DROP TYPE' | 'USING'

// ---------------------------------------------------------------------------
// Tisztán tesztelhető szabálymotor-függvények
// ---------------------------------------------------------------------------

/** LF-normalizált sha256 — a generátor (update-migration-checksums.ts) pontosan így számol. */
function sha256Lf(content: string): string {
  return createHash('sha256').update(content.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

/** Manifest-parse típusőrrel — hibás alaknál a javító parancsra utaló kivétel. */
function parseManifest(json: string, source: string): ChecksumManifest {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error(`a manifest (${source}) nem érvényes JSON — futtasd: ${FIX_COMMAND}`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`a manifest (${source}) nem objektum — futtasd: ${FIX_COMMAND}`)
  }
  const candidate = raw as { version?: unknown; entries?: unknown }
  if (candidate.version !== 1) {
    throw new Error(`a manifest (${source}) version mezője nem 1 — futtasd: ${FIX_COMMAND}`)
  }
  const entriesRaw = candidate.entries
  if (typeof entriesRaw !== 'object' || entriesRaw === null || Array.isArray(entriesRaw)) {
    throw new Error(`a manifest (${source}) entries mezője nem objektum — futtasd: ${FIX_COMMAND}`)
  }
  const entries: Record<string, string> = {}
  for (const [name, value] of Object.entries(entriesRaw as Record<string, unknown>)) {
    if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
      throw new Error(
        `a manifest (${source}) '${name}' entry-je nem sha256-hex — futtasd: ${FIX_COMMAND}`,
      )
    }
    entries[name] = value
  }
  return { version: 1, entries }
}

/** `git --name-status` kimenet parse-olása (a sorok `STÁTUSZ<TAB>útvonal` alakúak). */
function parseNameStatus(output: string): NameStatusEntry[] {
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => {
      const tab = line.indexOf('\t')
      if (tab === -1) {
        throw new Error(`feldolgozhatatlan name-status sor: '${line}'`)
      }
      return { status: line.slice(0, tab), path: line.slice(tab + 1) }
    })
}

/**
 * A (2)-es szabály: a baseline..HEAD diff szabályossága.
 * Visszatérési érték: a szabálysértések magyar üzenetei (üres = zöld).
 */
function evaluateMigrationDiff(entries: NameStatusEntry[]): string[] {
  const violations: string[] = []
  const addedStems = new Map<string, { ts: boolean; json: boolean }>()

  for (const { status, path } of entries) {
    if (!path.startsWith(MIGRATIONS_PREFIX)) {
      violations.push(`a diff a src/migrations/ könyvtáron kívüli fájlt érint: ${path} (${status})`)
      continue
    }
    const name = path.slice(MIGRATIONS_PREFIX.length)

    if (name === 'index.ts') {
      if (status !== 'M') {
        violations.push(`az index.ts a baseline óta csak módosulhat (M) — státusz: ${status}`)
      }
      continue
    }
    if (name === '.checksums.json') {
      if (status !== 'M') {
        violations.push(
          `a .checksums.json a baseline óta csak módosulhat (M) — státusz: ${status} ` +
            '(törlése/újra-hozzáadása a baseline manipulálása lenne)',
        )
      }
      continue
    }
    if (DATED_FILE.test(name)) {
      if (status !== 'A') {
        violations.push(
          `a ${name} létező migrációs fájl nem újként érintett (státusz: ${status}) — ` +
            'meglévő migráció módosítása, törlése vagy átnevezése TILOS (CLAUDE.md 3. tilos zóna)',
        )
        continue
      }
      const stem = name.replace(/\.(ts|json)$/, '')
      const record = addedStems.get(stem) ?? { ts: false, json: false }
      if (name.endsWith('.ts')) {
        record.ts = true
      } else {
        record.json = true
      }
      addedStems.set(stem, record)
      continue
    }
    violations.push(
      `nem engedélyezett fájl a src/migrations/ alatt: ${name} (státusz: ${status}) — ` +
        'egy kóbor .ts-t a PROD migrációként importálna (readMigrationFiles)',
    )
  }

  for (const [stem, pair] of addedStems) {
    if (pair.ts !== pair.json) {
      violations.push(
        `az új ${stem} migráció nem teljes pár — ${pair.ts ? 'hiányzik a .json' : 'hiányzik a .ts'}; ` +
          'új migráció csak .ts + .json párosában adható hozzá',
      )
    }
  }
  return violations
}

/** A (4)-es szabály: a baseline-commit a könyvtárban PONTOSAN a manifestet adhatta hozzá. */
function evaluateBaselineEntries(entries: NameStatusEntry[]): string[] {
  if (entries.length === 1 && entries[0].status === 'A' && entries[0].path === MANIFEST_REL) {
    return []
  }
  const actual = entries.map((entry) => `${entry.status}\t${entry.path}`).join('; ')
  return [
    'a baseline-commit a src/migrations/ alatt PONTOSAN egy fájlt adhatott hozzá: ' +
      `a manifestet (A\t${MANIFEST_REL}) — aktuális tartalma: [${actual || 'üres'}]. ` +
      'Ha a baseline maga bepiszkítást hordoz, azt egy tudatos újrabevezető PR-ben kell kezelni (docs/ci-orok.md).',
  ]
}

/** A (3)-as szabály: a baseline-manifest minden entry-je változatlanul megmaradt a HEAD-ben. */
function evaluateAppendOnly(baseline: ChecksumManifest, head: ChecksumManifest): string[] {
  const violations: string[] = []
  for (const [name, sha] of Object.entries(baseline.entries)) {
    const current = head.entries[name]
    if (current === undefined) {
      violations.push(`a(z) ${name} entry kikerült a manifestből — a manifest append-only`)
    } else if (current !== sha) {
      violations.push(
        `a(z) ${name} checksumja megváltozott a manifestben (${sha.slice(0, 12)}… -> ${current.slice(0, 12)}…) — a manifest append-only`,
      )
    }
  }
  return violations
}

const DESTRUCT_PATTERNS: { category: DestructCategory; matches: (statement: string) => boolean }[] = [
  { category: 'DROP TABLE', matches: (statement) => /\bDROP\s+TABLE\b/i.test(statement) },
  { category: 'DROP COLUMN', matches: (statement) => /\bDROP\s+COLUMN\b/i.test(statement) },
  { category: 'DROP TYPE', matches: (statement) => /\bDROP\s+TYPE\b/i.test(statement) },
  {
    category: 'USING',
    matches: (statement) => /\bSET\s+DATA\s+TYPE\b/i.test(statement) && /\bUSING\b/i.test(statement),
  },
]

/** Statement-szintű (`;`-határolt) destruktív-utasítás detektor. A `DROP INDEX` szándékosan kimarad. */
function findDestructiveOps(source: string): DestructCategory[] {
  const found = new Set<DestructCategory>()
  for (const statement of source.split(';')) {
    for (const { category, matches } of DESTRUCT_PATTERNS) {
      if (matches(statement)) {
        found.add(category)
      }
    }
  }
  return [...found].sort()
}

/** Az elismerő sor pontos alakja: `// destruct-op-ack: <KATEGÓRIA> — <nem-üres indoklás>` (em-dash). */
const ACK_LINE = /^\s*\/\/\s*destruct-op-ack:\s*(DROP TABLE|DROP COLUMN|DROP TYPE|USING)\s*—\s*\S.*$/

function findAcknowledgedCategories(source: string): DestructCategory[] {
  const acknowledged = new Set<DestructCategory>()
  for (const line of source.split('\n')) {
    const match = ACK_LINE.exec(line)
    if (match) {
      acknowledged.add(match[1] as DestructCategory)
    }
  }
  return [...acknowledged].sort()
}

/** Az (5)-ös szabály: destruktív utasítás csak kategóriánkénti elismerő sorral. */
function evaluateDestructiveOps(fileName: string, source: string): string[] {
  const acknowledged = new Set(findAcknowledgedCategories(source))
  return findDestructiveOps(source)
    .filter((category) => !acknowledged.has(category))
    .map(
      (category) =>
        `${fileName}: destruktív utasítás (${category}) elismerő sor nélkül. ` +
        `Ha a művelet szándékos és átgondolt, a fájlba egy sort kell felvenni: ` +
        `\`// destruct-op-ack: ${category} — <indoklás>\` ` +
        '(a marker a humán PR-review-nek szóló kényszer-nyilatkozat — docs/ci-orok.md).',
    )
}

// ---------------------------------------------------------------------------
// Git-hozzáférés (fail-closed: minden hiba BUKÁS, teljes klónra utaló üzenettel)
// ---------------------------------------------------------------------------

function git(repoRoot: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `a G3-őr git-parancsa sikertelen: \`git ${args.join(' ')}\`. ` +
        'A G3-őr teljes git-történetet igényel — teljes klón kell (CI-ben az actions/checkout ' +
        '`fetch-depth: 0` beállítása, lásd .github/workflows/ci.yml verify job). ' +
        `Eredeti hiba: ${detail}`,
    )
  }
}

/**
 * A baseline-commit dinamikus feloldása: a legfrissebb commit, ami a manifestet
 * hozzáadta. Ha nincs ilyen (a manifest még nincs commitolva, vagy shallow a
 * klón), BUKÁS — a történeti szabályok csak baseline után értelmezhetők.
 */
function resolveBaseline(repoRoot: string): string {
  const output = git(repoRoot, ['log', '--diff-filter=A', '--format=%H', '-1', '--', MANIFEST_REL]).trim()
  if (!output) {
    throw new Error(
      `nem található baseline-commit: a ${MANIFEST_REL} még nincs commitolva (vagy shallow a klón). ` +
        'A G3 történeti szabályai a manifestet behozó commit UTÁNI eseményekre vonatkoznak — ' +
        'commitold a manifestet tiszta, kizárólag azt hozzáadó commitban, és dolgozz teljes klónban ' +
        '(CI-ben `fetch-depth: 0`).',
    )
  }
  return output.split('\n')[0]
}

/** A `baseline..HEAD` name-status diff a src/migrations/ alatt (`--no-renames`: a rename D+A). */
function diffSinceBaseline(repoRoot: string, baseline: string): NameStatusEntry[] {
  return parseNameStatus(
    git(repoRoot, ['diff', '--name-status', '--no-renames', `${baseline}..HEAD`, '--', MIGRATIONS_PREFIX]),
  )
}

/** A baseline-commit saját name-status listája a könyvtárban (a (4)-es tisztasági szabályhoz). */
function baselineCommitEntries(repoRoot: string, baseline: string): NameStatusEntry[] {
  return parseNameStatus(
    git(repoRoot, ['show', '--name-status', '--no-renames', '--format=', baseline, '--', MIGRATIONS_PREFIX]),
  )
}

/** Manifest beolvasása egy megadott refből (pl. `${baseline}:…` vagy `HEAD:…`). */
function manifestAtRef(repoRoot: string, ref: string): ChecksumManifest {
  return parseManifest(git(repoRoot, ['show', `${ref}:${MANIFEST_REL}`]), `${ref}:${MANIFEST_REL}`)
}

// ---------------------------------------------------------------------------
// Szintetikus fixture-repó építő (a git-szabálymotor end-to-end igazolásához)
// ---------------------------------------------------------------------------

const fixtureDirs: string[] = []

afterAll(() => {
  for (const dir of fixtureDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fixtureGit(dir: string, args: string[]): void {
  execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function fixtureCommitAll(dir: string, message: string): void {
  fixtureGit(dir, ['add', '-A'])
  fixtureGit(dir, ['-c', 'user.email=g3@test.local', '-c', 'user.name=G3', 'commit', '-q', '-m', message])
}

function fixtureWrite(dir: string, relativePath: string, content: string): void {
  writeFileSync(join(dir, relativePath), content, 'utf8')
}

/** A generátor viselkedésének tükre: az összes datált fájlra újraszámolja a manifestet. */
function fixtureRebuildManifest(dir: string): void {
  const migrationsDir = join(dir, 'src/migrations')
  const entries: Record<string, string> = {}
  for (const name of readdirSync(migrationsDir).filter((file) => DATED_FILE.test(file)).sort()) {
    entries[name] = sha256Lf(readFileSync(join(migrationsDir, name), 'utf8'))
  }
  fixtureWrite(dir, MANIFEST_REL, `${JSON.stringify({ version: 1, entries }, null, 2)}\n`)
}

function fixtureWritePair(dir: string, stem: string): void {
  fixtureWrite(dir, `src/migrations/${stem}.ts`, `// fixture-migráció ${stem}\nexport async function up(): Promise<void> {}\n`)
  fixtureWrite(dir, `src/migrations/${stem}.json`, '{"version":"7","dialect":"postgresql"}\n')
}

/**
 * Seed (egy létező pár + index.ts) és egy TISZTA baseline-commit (kizárólag a
 * manifestet adja hozzá) — pontosan úgy, ahogy a valódi repóban a bevezető
 * commit készül. Visszaadja a fixture gyökerét és a baseline feloldását.
 */
function createFixtureRepo(): { dir: string; baseline: string } {
  const dir = mkdtempSync(join(tmpdir(), 'g3-fixture-'))
  fixtureDirs.push(dir)
  fixtureGit(dir, ['init', '-q'])
  mkdirSync(join(dir, 'src/migrations'), { recursive: true })
  fixtureWritePair(dir, '20260729_231123_initial_schema')
  fixtureWrite(dir, 'src/migrations/index.ts', 'export const migrations = []\n')
  fixtureCommitAll(dir, 'seed')
  fixtureRebuildManifest(dir)
  fixtureCommitAll(dir, 'baseline: checksum-manifest')
  return { dir, baseline: resolveBaseline(dir) }
}

// ---------------------------------------------------------------------------
// Tesztek
// ---------------------------------------------------------------------------

describe('G3 — migráció-immutabilitás (CLAUDE.md 3. tilos zóna)', () => {
  describe('working-tree ↔ manifest (commitfüggetlen)', () => {
    it('a manifest létezik, érvényes JSON, version: 1, sha256-hex entrykkel', () => {
      const manifestPath = join(MIGRATIONS_DIR, '.checksums.json')
      expect(
        existsSync(manifestPath),
        `hiányzik a ${MANIFEST_REL} — hozd létre: ${FIX_COMMAND}`,
      ).toBe(true)
      expect(() => parseManifest(readFileSync(manifestPath, 'utf8'), MANIFEST_REL)).not.toThrow()
    })

    it('minden manifest-entryhez létezik a fájl, és a checksum egyezik', () => {
      const manifest = parseManifest(readFileSync(join(MIGRATIONS_DIR, '.checksums.json'), 'utf8'), MANIFEST_REL)
      const violations: string[] = []
      for (const [name, expectedSha] of Object.entries(manifest.entries)) {
        const filePath = join(MIGRATIONS_DIR, name)
        if (!existsSync(filePath)) {
          violations.push(`${name}: a fájl nem létezik a working-tree-ben`)
          continue
        }
        const actualSha = sha256Lf(readFileSync(filePath, 'utf8'))
        if (actualSha !== expectedSha) {
          violations.push(
            `${name}: a tartalom eltér a manifesttől (${expectedSha.slice(0, 12)}… != ${actualSha.slice(0, 12)}…)` +
              ' — MEGLEVO MIGRÁCIÓT NEM SZERKESZTÜNK: állítsd vissza a tartalmat (revert)',
          )
        }
      }
      expect(
        violations,
        `a manifest és a working-tree eltér — ha ÚJ migrációt adtál hozzá, frissítsd: ${FIX_COMMAND}`,
      ).toEqual([])
    })

    it('minden datált fájlhoz van entry, és minden entry datált fájl (mindkét irány teljes)', () => {
      const manifest = parseManifest(readFileSync(join(MIGRATIONS_DIR, '.checksums.json'), 'utf8'), MANIFEST_REL)
      const datedFiles = readdirSync(MIGRATIONS_DIR).filter((name) => DATED_FILE.test(name))
      const violations: string[] = []
      for (const name of datedFiles) {
        if (!(name in manifest.entries)) {
          violations.push(`${name}: hiányzik a manifestből — futtasd: ${FIX_COMMAND}`)
        }
      }
      for (const name of Object.keys(manifest.entries)) {
        if (!DATED_FILE.test(name)) {
          violations.push(`${name}: nem datált migrációs fájl, nem lehetne entry — futtasd: ${FIX_COMMAND}`)
        }
      }
      expect(violations).toEqual([])
    })
  })

  describe('git-történeti szabályok a baseline óta (fail-closed)', () => {
    it('a baseline feloldható (a manifest commitolva van, és teljes a klón)', () => {
      expect(() => resolveBaseline(REPO_ROOT)).not.toThrow()
    })

    it('(2) a baseline..HEAD diffben csak új, páros migráció és index/manifest-módosítás van', () => {
      const baseline = resolveBaseline(REPO_ROOT)
      const violations = evaluateMigrationDiff(diffSinceBaseline(REPO_ROOT, baseline))
      expect(violations).toEqual([])
    })

    it('(3) a manifest append-only: a baseline minden entry-je változatlanul megvan a HEAD-ben', () => {
      const baseline = resolveBaseline(REPO_ROOT)
      const violations = evaluateAppendOnly(manifestAtRef(REPO_ROOT, baseline), manifestAtRef(REPO_ROOT, 'HEAD'))
      expect(violations).toEqual([])
    })

    it('(4) a baseline-commit tiszta: a könyvtárban pontosan a manifestet adta hozzá', () => {
      const baseline = resolveBaseline(REPO_ROOT)
      const violations = evaluateBaselineEntries(baselineCommitEntries(REPO_ROOT, baseline))
      expect(violations).toEqual([])
    })

    it('(5) a baseline óta hozzáadott .ts fájlokban nincs elismeretlen destruktív utasítás', () => {
      const baseline = resolveBaseline(REPO_ROOT)
      const newTsPaths = diffSinceBaseline(REPO_ROOT, baseline)
        .filter((entry) => entry.status === 'A')
        .map((entry) => entry.path)
        .filter((path) => path.startsWith(MIGRATIONS_PREFIX) && DATED_TS.test(path.slice(MIGRATIONS_PREFIX.length)))
      // A worktree-ben és a közvetlen merge után ez a halmaz üres — a szabálymotor
      // valós viselkedését a lenti szintetikus fixture-ök bizonyítják.
      const violations = newTsPaths.flatMap((path) =>
        evaluateDestructiveOps(path, readFileSync(join(REPO_ROOT, path), 'utf8')),
      )
      expect(violations).toEqual([])
    })
  })

  describe('a diff-szabálymotor egységtesztjei (szintetikus name-status stringek)', () => {
    const evaluate = (diff: string): string[] => evaluateMigrationDiff(parseNameStatus(diff))

    it('új migráció .ts+.json párban → zöld', () => {
      expect(
        evaluate('A\tsrc/migrations/20260811_000001_uj_dolog.ts\nA\tsrc/migrations/20260811_000001_uj_dolog.json'),
      ).toEqual([])
    })

    it('index.ts- és manifest-módosítás → zöld', () => {
      expect(evaluate('M\tsrc/migrations/index.ts\nM\tsrc/migrations/.checksums.json')).toEqual([])
    })

    it('üres diff → zöld', () => {
      expect(evaluate('')).toEqual([])
    })

    it('árva új .ts (pár nélkül) → piros', () => {
      const violations = evaluate('A\tsrc/migrations/20260811_000001_arva.ts')
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('nem teljes pár')
    })

    it('árva új .json (pár nélkül) → piros', () => {
      const violations = evaluate('A\tsrc/migrations/20260811_000001_arva.json')
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('nem teljes pár')
    })

    it('létező migrációs fájl módosítása → piros', () => {
      const violations = evaluate('M\tsrc/migrations/20260729_231123_initial_schema.ts')
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('TILOS')
    })

    it('létező migrációs fájl törlése → piros', () => {
      const violations = evaluate('D\tsrc/migrations/20260729_231123_initial_schema.json')
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('TILOS')
    })

    it('átnevezés (--no-renames miatt D+A) → piros a D-n, még teljes pár esetén is', () => {
      const violations = evaluate(
        'D\tsrc/migrations/20260729_231123_initial_schema.ts\n' +
          'D\tsrc/migrations/20260729_231123_initial_schema.json\n' +
          'A\tsrc/migrations/20260729_231124_initial_schema_atnevezve.ts\n' +
          'A\tsrc/migrations/20260729_231124_initial_schema_atnevezve.json',
      )
      expect(violations).toHaveLength(2)
      expect(violations.every((violation) => violation.includes('TILOS'))).toBe(true)
    })

    it('index.ts hozzáadása vagy törlése → piros', () => {
      expect(evaluate('A\tsrc/migrations/index.ts')).toHaveLength(1)
      expect(evaluate('D\tsrc/migrations/index.ts')).toHaveLength(1)
    })

    it('manifest törlése vagy újra-hozzáadása → piros (a baseline manipulációja)', () => {
      expect(evaluate('D\tsrc/migrations/.checksums.json')).toHaveLength(1)
      expect(evaluate('A\tsrc/migrations/.checksums.json')).toHaveLength(1)
    })

    it('idegen fájl a könyvtárban → piros (a PROD migrációként importálná)', () => {
      const violations = evaluate('A\tsrc/migrations/jegyzetek.md')
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('readMigrationFiles')
    })
  })

  describe('a baseline- és append-only szabályok egységtesztjei', () => {
    const sha = (seed: string): string => createHash('sha256').update(seed).digest('hex')
    const manifest = (entries: Record<string, string>): ChecksumManifest => ({ version: 1, entries })

    it('tiszta baseline (pontosan A manifest) → zöld', () => {
      expect(evaluateBaselineEntries(parseNameStatus(`A\t${MANIFEST_REL}`))).toEqual([])
    })

    it('piszkos baseline (migrációs fájlt is érint) → piros', () => {
      const violations = evaluateBaselineEntries(
        parseNameStatus(`M\tsrc/migrations/20260729_231123_initial_schema.ts\nA\t${MANIFEST_REL}`),
      )
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('PONTOSAN')
    })

    it('migráció nélküli, de nem-tiszta baseline → piros', () => {
      expect(evaluateBaselineEntries(parseNameStatus(''))).toHaveLength(1)
      expect(evaluateBaselineEntries(parseNameStatus('M\tsrc/migrations/index.ts'))).toHaveLength(1)
    })

    it('változatlan manifest → zöld; új entry hozzáadása → zöld (append megengedett)', () => {
      const baseline = manifest({ 'a.ts': sha('a') })
      expect(evaluateAppendOnly(baseline, manifest({ 'a.ts': sha('a') }))).toEqual([])
      expect(evaluateAppendOnly(baseline, manifest({ 'a.ts': sha('a'), 'b.ts': sha('b') }))).toEqual([])
    })

    it('kurtított manifest → piros', () => {
      const violations = evaluateAppendOnly(manifest({ 'a.ts': sha('a'), 'b.ts': sha('b') }), manifest({ 'a.ts': sha('a') }))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('kikerült')
    })

    it('újrahash-elt (módosított checksumú) entry → piros', () => {
      const violations = evaluateAppendOnly(manifest({ 'a.ts': sha('a') }), manifest({ 'a.ts': sha('mas') }))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('megváltozott')
    })
  })

  describe('a destruktív-op detektor egységtesztjei (szintetikus forrás-stringek)', () => {
    it('tiszta migráció (CREATE/ALTER ADD) → zöld', () => {
      const source = 'CREATE TABLE "a" ("id" serial PRIMARY KEY);\nALTER TABLE "b" ADD COLUMN "c" jsonb;'
      expect(evaluateDestructiveOps('fixture.ts', source)).toEqual([])
    })

    it('DROP TABLE marker nélkül → piros; a kategóriánkénti markerrel → zöld', () => {
      const source = 'DROP TABLE "payload_jobs_stats" CASCADE;'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(1)
      const acknowledged = `// destruct-op-ack: DROP TABLE — a down visszagörgeti az up tábláját\n${source}`
      expect(evaluateDestructiveOps('fixture.ts', acknowledged)).toEqual([])
    })

    it('DROP COLUMN marker nélkül → piros; markerrel → zöld', () => {
      const source = 'ALTER TABLE "payload_jobs" DROP COLUMN "meta";'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(1)
      const acknowledged = `// destruct-op-ack: DROP COLUMN — a meta oszlopot az up hozta létre\n${source}`
      expect(evaluateDestructiveOps('fixture.ts', acknowledged)).toEqual([])
    })

    it('DROP TYPE marker nélkül → piros; markerrel → zöld', () => {
      const source = 'DROP TYPE "enum_products_status";'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(1)
      const acknowledged = `// destruct-op-ack: DROP TYPE — az enumot az up hozta létre\n${source}`
      expect(evaluateDestructiveOps('fixture.ts', acknowledged)).toEqual([])
    })

    it('SET DATA TYPE … USING marker nélkül → piros; USING-markerrel → zöld', () => {
      const source = 'ALTER TABLE "orders" ALTER COLUMN "total" SET DATA TYPE integer USING "total"::integer;'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(1)
      const acknowledged = `// destruct-op-ack: USING — a cast minden soron értelmezhető\n${source}`
      expect(evaluateDestructiveOps('fixture.ts', acknowledged)).toEqual([])
    })

    it('SET DATA TYPE USING NÉLKÜL → zöld (nem kategória)', () => {
      const source = 'ALTER TABLE "orders" ALTER COLUMN "note" SET DATA TYPE text;'
      expect(evaluateDestructiveOps('fixture.ts', source)).toEqual([])
    })

    it('DROP INDEX → zöld (szándékosan NEM kategória: újraépíthető, adatot nem veszít)', () => {
      const source = 'DROP INDEX "idx_orders_created_at";'
      expect(evaluateDestructiveOps('fixture.ts', source)).toEqual([])
    })

    it('statement-szintű: a DROP másik statementben is kategória (több utasítás egy fájlban)', () => {
      const source = 'CREATE TABLE "a" ("id" serial);\nDROP TABLE "b";'
      const violations = evaluateDestructiveOps('fixture.ts', source)
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('DROP TABLE')
    })

    it('rossz kategóriájú marker nem takarja a jelen lévőt → piros', () => {
      const source = '// destruct-op-ack: DROP TABLE — indoklás\nALTER TABLE "t" DROP COLUMN "c";'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(1)
    })

    it('indoklás nélküli marker nem számít elismerésnek → piros', () => {
      const source = '// destruct-op-ack: DROP TABLE —\nDROP TABLE "b";'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(1)
    })

    it('több kategória egy fájlban: mindegyikhez külön marker kell', () => {
      const source = 'DROP TABLE "a";\nALTER TABLE "t" DROP COLUMN "c";'
      expect(evaluateDestructiveOps('fixture.ts', source)).toHaveLength(2)
      const halfAcknowledged = `// destruct-op-ack: DROP TABLE — indoklás\n${source}`
      expect(evaluateDestructiveOps('fixture.ts', halfAcknowledged)).toHaveLength(1)
      const fullyAcknowledged = `// destruct-op-ack: DROP COLUMN — indoklás\n${halfAcknowledged}`
      expect(evaluateDestructiveOps('fixture.ts', fullyAcknowledged)).toEqual([])
    })
  })

  describe('a git-szabálymotor end-to-end tesztjei (szintetikus fixture-repó)', () => {
    it('tiszta baseline utáni üres diff → minden történeti szabály zöld', () => {
      const { dir, baseline } = createFixtureRepo()
      expect(evaluateMigrationDiff(diffSinceBaseline(dir, baseline))).toEqual([])
      expect(evaluateBaselineEntries(baselineCommitEntries(dir, baseline))).toEqual([])
      expect(evaluateAppendOnly(manifestAtRef(dir, baseline), manifestAtRef(dir, 'HEAD'))).toEqual([])
    })

    it('új pár hozzáadása a szabályos úton (pár + index + manifest-append) → zöld', () => {
      const { dir, baseline } = createFixtureRepo()
      fixtureWritePair(dir, '20260811_000001_uj_dolog')
      fixtureWrite(dir, 'src/migrations/index.ts', 'export const migrations = [1]\n')
      fixtureRebuildManifest(dir)
      fixtureCommitAll(dir, 'új migráció párosában')

      expect(evaluateMigrationDiff(diffSinceBaseline(dir, baseline))).toEqual([])
      expect(evaluateAppendOnly(manifestAtRef(dir, baseline), manifestAtRef(dir, 'HEAD'))).toEqual([])
    })

    it('árva .ts hozzáadása → piros', () => {
      const { dir, baseline } = createFixtureRepo()
      fixtureWrite(dir, 'src/migrations/20260811_000001_arva.ts', '// árva fixture\n')
      fixtureCommitAll(dir, 'árva ts')

      const violations = evaluateMigrationDiff(diffSinceBaseline(dir, baseline))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('nem teljes pár')
    })

    it('létező migrációs fájl módosítása → piros', () => {
      const { dir, baseline } = createFixtureRepo()
      fixtureWrite(dir, 'src/migrations/20260729_231123_initial_schema.ts', '// bitorolt tartalom\n')
      fixtureCommitAll(dir, 'régi migráció bitorlása')

      const violations = evaluateMigrationDiff(diffSinceBaseline(dir, baseline))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('TILOS')
    })

    it('létező pár átnevezése → piros (a --no-renames D+A-ként mutatja)', () => {
      const { dir, baseline } = createFixtureRepo()
      fixtureGit(dir, [
        'mv',
        'src/migrations/20260729_231123_initial_schema.ts',
        'src/migrations/20260729_231124_atnevezett.ts',
      ])
      fixtureGit(dir, [
        'mv',
        'src/migrations/20260729_231123_initial_schema.json',
        'src/migrations/20260729_231124_atnevezett.json',
      ])
      fixtureCommitAll(dir, 'átnevezés')

      const violations = evaluateMigrationDiff(diffSinceBaseline(dir, baseline))
      expect(violations.some((violation) => violation.includes('TILOS'))).toBe(true)
    })

    it('létező migrációs fájl törlése → piros', () => {
      const { dir, baseline } = createFixtureRepo()
      fixtureGit(dir, ['rm', '-q', 'src/migrations/20260729_231123_initial_schema.ts'])
      fixtureCommitAll(dir, 'törlés')

      const violations = evaluateMigrationDiff(diffSinceBaseline(dir, baseline))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('TILOS')
    })

    it('a manifest utólagos kurtítása → a diff-szabály zöld, de az append-only piros', () => {
      const { dir, baseline } = createFixtureRepo()
      const manifestPath = join(dir, MANIFEST_REL)
      const curtailed = parseManifest(readFileSync(manifestPath, 'utf8'), MANIFEST_REL)
      delete curtailed.entries['20260729_231123_initial_schema.ts']
      fixtureWrite(dir, MANIFEST_REL, `${JSON.stringify(curtailed, null, 2)}\n`)
      fixtureCommitAll(dir, 'manifest kurtítása')

      expect(evaluateMigrationDiff(diffSinceBaseline(dir, baseline))).toEqual([])
      const violations = evaluateAppendOnly(manifestAtRef(dir, baseline), manifestAtRef(dir, 'HEAD'))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('kikerült')
    })

    it('piszkos baseline (a manifest-commit migrációs fájlt is érint) → a (4)-es szabály piros', () => {
      const dir = mkdtempSync(join(tmpdir(), 'g3-fixture-'))
      fixtureDirs.push(dir)
      fixtureGit(dir, ['init', '-q'])
      mkdirSync(join(dir, 'src/migrations'), { recursive: true })
      fixtureWritePair(dir, '20260729_231123_initial_schema')
      fixtureWrite(dir, 'src/migrations/index.ts', 'export const migrations = []\n')
      fixtureCommitAll(dir, 'seed')
      // A baseline-commit NEM tiszta: a manifest mellé egy régi fájl módosítását is beviszi.
      fixtureRebuildManifest(dir)
      fixtureWrite(dir, 'src/migrations/20260729_231123_initial_schema.ts', '// bepiszkított baseline\n')
      fixtureCommitAll(dir, 'piszkos baseline')
      const baseline = resolveBaseline(dir)

      const violations = evaluateBaselineEntries(baselineCommitEntries(dir, baseline))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toContain('PONTOSAN')
    })
  })
})
