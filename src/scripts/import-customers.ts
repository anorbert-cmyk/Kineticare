/**
 * systeme.io → Kineticare vásárló-átköltöztetés — tömeges CSV-import (C8 / T-061).
 *
 * Mit csinál: a régi rendszerből exportált vásárlói listát beolvassa, a
 * kurzusneveket a megadott `--map` párokkal Kineticare-termékekre képezi, és
 *   - létrehozza a hiányzó felhasználókat (szerepkör: `customer`, véletlen,
 *     soha ki nem írt kezdőjelszóval), majd
 *   - hozzáfűzi a hiányzó kurzus-hozzáféréseket a `users.purchases` mezőhöz.
 *
 * Mit NEM csinál: nem küld e-mailt, nem hoz létre rendelést vagy számlát, nem
 * módosít jelszót, szerepkört vagy MEGLÉVŐ vásárlást, és nem töröl semmit.
 *
 * ÚJRAFUTTATHATÓ. A művelet idempotens: minden sor előtt újraolvassuk a
 * felhasználó jelenlegi állapotát, és csak a ténylegesen hiányzó termékeket
 * írjuk be. Egy megszakadt futás (hálózat, sorzár, Ctrl-C) tehát nyugodtan
 * újraindítható — a második kör a kész sorokat kihagyja.
 *
 * A tényleges logika a `src/lib/customer-import/` modulokban él (parse / plan /
 * execute / invite); ez a fájl az argumentum-feldolgozás és a kiírás.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import { executeImportPlan, type ExecutionOutcome } from '../lib/customer-import/execute'
import {
  generateInviteLinks,
  renderInviteCsv,
  resolveServerUrl,
} from '../lib/customer-import/invite'
import { parseCustomerCsv, type RowIssue } from '../lib/customer-import/parse'
import { buildImportPlan, parseCourseMap, type ImportPlan } from '../lib/customer-import/plan'
import { createLogger } from '../lib/logger'
import config from '../payload.config'

const log = createLogger({ script: 'import-customers' })

const write = (text: string): void => {
  process.stdout.write(`${text}\n`)
}
const writeError = (text: string): void => {
  process.stderr.write(`${text}\n`)
}

interface CliArgs {
  file: string
  map: string[]
  dryRun: boolean
  outLinks?: string
  inviteAll: boolean
  delimiter?: string
  emailCol?: string
  nameCol?: string
  coursesCol?: string
}

const USAGE = [
  'Vásárló-import (systeme.io → Kineticare)',
  '',
  'Használat:',
  '  npx tsx src/scripts/import-customers.ts --file=export.csv --map "Kurzus A=SKU-A" [opciók]',
  '',
  'Kötelező:',
  '  --file=<út>            A beolvasandó CSV-fájl.',
  '',
  'Leképezés (ismételhető):',
  '  --map "Kurzusnév=SKU"  Egy systeme.io-kurzusnév → Kineticare-termék (sku).',
  '                         Minden kurzushoz kell egy pár; ami kimarad, az nem',
  '                         tűnik el csendben, hanem a mérlegben listázódik.',
  '',
  'Opciók:',
  '  --dry-run              PRÓBAFUTÁS: nulla írás, csak a teljes terv kiírása.',
  '  --out-links=<út>       Aktiválási linkek CSV-be (éles futás után).',
  '  --invite-all           Link ne csak az új, hanem minden érintett vevőnek.',
  '  --delimiter=<jel>      Mezőelválasztó (alap: ","; magyar Excel: ";").',
  '  --email-col=<név>      Az e-mail-oszlop fejlécneve.',
  '  --name-col=<név>       A név-oszlop fejlécneve.',
  '  --courses-col=<név>    A kurzus-oszlop fejlécneve.',
  '  --help                 Ez a súgó.',
  '',
  'ELŐBB MINDIG --dry-run. A próbafutás ugyanazt a tervet mutatja, amit az éles',
  'futás végrehajtana, és egyetlen sort sem ír az adatbázisba.',
  '',
  'ÚJRAFUTTATHATÓ: a művelet idempotens (meglévő jelszót, szerepkört és vásárlást',
  'sosem módosít, csak hiányzó hozzáférést fűz hozzá), ezért egy megszakadt futás',
  'biztonságosan újraindítható — a második kör a kész sorokat kihagyja.',
  '',
  'Kilépési kód: 0 = hibátlan futás, 1 = indítási hiba vagy hibás sor a futásban.',
].join('\n')

/**
 * Az argumentum-feldolgozás eredménye: futtatható argumentumok, súgó-kérés
 * (0-s kilépés) vagy hiba (1-es kilépés).
 */
type ArgsResult =
  | { readonly kind: 'args'; readonly args: CliArgs }
  | { readonly kind: 'help' }
  | { readonly kind: 'error' }

/** Argumentum-feldolgozás: `--kulcs=érték`, `--kulcs érték` és kapcsoló-alak is. */
function parseArgs(argv: readonly string[]): ArgsResult {
  const args: CliArgs = { file: '', map: [], dryRun: false, inviteAll: false }
  const valueKeys = new Set([
    'file',
    'map',
    'out-links',
    'delimiter',
    'email-col',
    'name-col',
    'courses-col',
  ])

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (raw === '--help' || raw === '-h') {
      write(USAGE)
      return { kind: 'help' }
    }
    if (raw === '--dry-run') {
      args.dryRun = true
      continue
    }
    if (raw === '--invite-all') {
      args.inviteAll = true
      continue
    }

    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(raw)
    if (!match) {
      writeError(`Hiba: érvénytelen argumentum: "${raw}" (a forma: --kulcs=érték).`)
      return { kind: 'error' }
    }
    const [, key, inlineValue] = match
    if (!valueKeys.has(key)) {
      writeError(`Hiba: ismeretlen argumentum: "--${key}".`)
      return { kind: 'error' }
    }
    let value = inlineValue
    if (value === undefined) {
      // Szóközzel elválasztott alak: --map "Kurzus A=SKU-A"
      value = argv[index + 1]
      index += 1
    }
    if (value === undefined || value.trim() === '') {
      writeError(`Hiba: a "--${key}" argumentum értéke nem lehet üres.`)
      return { kind: 'error' }
    }

    switch (key) {
      case 'file':
        args.file = value
        break
      case 'map':
        args.map.push(value)
        break
      case 'out-links':
        args.outLinks = value
        break
      case 'delimiter':
        args.delimiter = value
        break
      case 'email-col':
        args.emailCol = value
        break
      case 'name-col':
        args.nameCol = value
        break
      case 'courses-col':
        args.coursesCol = value
        break
      default:
        writeError(`Hiba: ismeretlen argumentum: "--${key}".`)
        return { kind: 'error' }
    }
  }

  if (args.file === '') {
    writeError('Hiba: a --file argumentum kötelező. Súgó: --help')
    return { kind: 'error' }
  }
  return { kind: 'args', args }
}

/** Egyszerű, fix szélességű táblázat — a próbafutás terve emberi szemnek. */
function renderTable(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const widths = header.map((cell, column) =>
    Math.max(cell.length, ...rows.map((row) => (row[column] ?? '').length), 0),
  )
  const line = (cells: readonly string[]): string =>
    cells.map((cell, column) => (cell ?? '').padEnd(widths[column])).join('  ').trimEnd()
  return [line(header), widths.map((width) => '-'.repeat(width)).join('  '), ...rows.map(line)].join(
    '\n',
  )
}

const ACTION_LABEL: Record<string, string> = {
  'create-user': 'ÚJ FIÓK',
  'append-purchases': 'BŐVÍTÉS',
  'skip-complete': 'KIHAGY',
  failed: 'HIBA',
}

function printPlan(plan: ImportPlan): void {
  if (plan.entries.length === 0) {
    write('A terv üres — nincs feldolgozható sor.')
    return
  }
  const rows = plan.entries.map((entry) => [
    ACTION_LABEL[entry.action] ?? entry.action,
    entry.email,
    entry.missingProducts.map((product) => product.sku).join(', ') || '—',
    entry.unknownCourseNames.join(', ') || '—',
  ])
  write(renderTable(['MŰVELET', 'E-MAIL', 'HOZZÁADANDÓ (SKU)', 'NEM LEKÉPEZETT KURZUS'], rows))
}

function printIssues(title: string, issues: readonly RowIssue[]): void {
  if (issues.length === 0) {
    return
  }
  write('')
  write(`${title} (${issues.length}):`)
  for (const issue of issues) {
    const where = issue.line > 0 ? `${issue.line}. sor` : (issue.email ?? 'ismeretlen sor')
    write(`  - ${where}: ${issue.reason}${issue.email && issue.line > 0 ? ` (${issue.email})` : ''}`)
  }
}

function printUnknownCourses(plan: ImportPlan): void {
  if (plan.unknownCourseNames.length === 0) {
    return
  }
  write('')
  write(`Nem leképezett kurzusnevek (${plan.unknownCourseNames.length}):`)
  for (const name of plan.unknownCourseNames) {
    write(`  - "${name}"  →  add meg: --map "${name}=<SKU>"`)
  }
}

/** Az aktiválási linkek CSV-jének kiírása (jogosultság-szűkítve). */
async function writeLinksFile(target: string, contents: string): Promise<void> {
  const absolute = path.resolve(target)
  await writeFile(absolute, contents, { encoding: 'utf8', mode: 0o600 })
  write(`Aktiválási linkek: ${absolute}`)
  write(
    'FIGYELEM: a fájl aktiválási tokeneket tartalmaz — ne kerüljön a repóba és ne maradjon ' +
      'a gépen a kiküldés után. Töröld, amint a levelek kimentek.',
  )
  if (!path.relative(process.cwd(), absolute).startsWith('..')) {
    write(
      'FIGYELEM: a fájl a projekt könyvtárán BELÜL jött létre — a véletlen commit elkerüléséhez ' +
        'inkább a projekten kívülre írasd (pl. --out-links="$HOME/kineticare-linkek.csv").',
    )
  }
}

async function readCsvFile(file: string): Promise<string> {
  try {
    return await readFile(path.resolve(file), 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      throw new Error(`Nem található a fájl: ${path.resolve(file)}. Ellenőrizd az útvonalat.`)
    }
    if (code === 'EACCES') {
      throw new Error(`A fájl nem olvasható (nincs jogosultság): ${path.resolve(file)}.`)
    }
    if (code === 'EISDIR') {
      throw new Error(`A megadott útvonal egy könyvtár, nem fájl: ${path.resolve(file)}.`)
    }
    throw new Error(
      `A fájl beolvasása sikertelen (${path.resolve(file)}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

async function run(args: CliArgs): Promise<number> {
  // --- 1. CSV beolvasása és értelmezése -------------------------------------
  const csv = await readCsvFile(args.file)
  const parsed = parseCustomerCsv(csv, {
    delimiter: args.delimiter,
    emailColumn: args.emailCol,
    nameColumn: args.nameCol,
    coursesColumn: args.coursesCol,
  })

  for (const warning of parsed.warnings) {
    write(`Figyelmeztetés: ${warning}`)
  }
  printIssues('Kihagyott sorok', parsed.issues)

  if (parsed.rows.length === 0) {
    write('')
    write('Nincs importálható sor.')
    return parsed.issues.length > 0 ? 1 : 0
  }

  // --- 2. Kurzusnév → SKU leképezés ------------------------------------------
  const courseMap = parseCourseMap(args.map)
  if (courseMap.errors.length > 0) {
    for (const error of courseMap.errors) {
      writeError(`Hiba: ${error}`)
    }
    return 1
  }

  // --- 3. Terv (CSAK OLVASÁS) ------------------------------------------------
  const payload = await getPayload({ config })
  const plan = await buildImportPlan(payload, { rows: parsed.rows, courseMap })

  if (plan.unknownSkus.length > 0) {
    writeError(
      `Hiba: a --map olyan SKU-ra hivatkozik, ami nincs az adatbázisban: ${plan.unknownSkus.join(', ')}. ` +
        'Ellenőrizd a kurzusok azonosítóit az admin felületen. Írás nem történt.',
    )
    return 1
  }

  write('')
  write(
    `Terv: ${plan.summary.create} új fiók, ${plan.summary.append} bővítés, ` +
      `${plan.summary.skip} kihagyás (${parsed.rows.length} vásárló a fájlban).`,
  )
  write('')
  printPlan(plan)
  printUnknownCourses(plan)

  // --- 4a. Próbafutás --------------------------------------------------------
  if (args.dryRun) {
    write('')
    write(
      `PRÓBAFUTÁS ÖSSZESÍTŐ — létrehozandó: ${plan.summary.create}, bővítendő: ${plan.summary.append}, ` +
        `kihagyva: ${plan.summary.skip}, hibás sor: ${parsed.issues.length}, ` +
        `nem leképezett kurzusnév: ${plan.unknownCourseNames.length}. ` +
        'Az adatbázisba SEMMI nem íródott.',
    )
    if (plan.emptyUserCollection && plan.summary.create > 0) {
      write(
        'FIGYELEM: a users kollekció ÜRES — az első létrehozott felhasználó tulajdonosi (owner) ' +
          'szerepkört kapna. Hozd létre előbb az admin-felhasználót; éles futás így nem indul el.',
      )
    }
    if (args.outLinks !== undefined) {
      write(
        'Megjegyzés: próbafutásban nem készülnek aktiválási linkek (a link-generálás tokent ír ' +
          'a felhasználóra). Éles futás után add meg újra a --out-links kapcsolót.',
      )
    }
    write('Éles futtatás: ugyanez a parancs a --dry-run kapcsoló NÉLKÜL.')
    return parsed.issues.length > 0 ? 1 : 0
  }

  // --- 4b. Éles futás --------------------------------------------------------
  // A linkek szerverneve MÉG az írás előtt ellenőrizendő: ne írjunk be
  // vásárlókat úgy, hogy utána a meghívó linkek generálása bukik el.
  const serverUrl = args.outLinks !== undefined ? resolveServerUrl() : undefined

  write('')
  write('ÉLES FUTÁS — a sorok feldolgozása:')
  const printOutcome = (outcome: ExecutionOutcome): void => {
    const label = ACTION_LABEL[outcome.action] ?? outcome.action
    const detail =
      outcome.action === 'failed'
        ? ` — ${outcome.error ?? 'ismeretlen hiba'}`
        : outcome.grantedSkus.length > 0
          ? ` — ${outcome.grantedSkus.join(', ')}`
          : ''
    write(`  [${label}] ${outcome.email}${detail}`)
  }

  const result = await executeImportPlan(payload, plan, { log, onOutcome: printOutcome })

  const failed: RowIssue[] = result.outcomes
    .filter((outcome) => outcome.action === 'failed')
    .map((outcome) => ({
      line: 0,
      email: outcome.email,
      reason: outcome.error ?? 'ismeretlen hiba',
    }))
  printIssues('Sikertelen sorok', failed)

  // --- 5. Aktiválási linkek (opcionális) ------------------------------------
  if (args.outLinks !== undefined && serverUrl !== undefined) {
    const targets = args.inviteAll ? result.touchedEmails : result.createdEmails
    if (targets.length === 0) {
      write('')
      write('Aktiválási link nem készült: nincs olyan vevő, akinek most kellene.')
    } else {
      const invites = await generateInviteLinks(payload, targets, { serverUrl, log })
      await writeLinksFile(args.outLinks, renderInviteCsv(invites.links))
      printIssues('Sikertelen aktiválási linkek', invites.issues)
      failed.push(...invites.issues)
    }
  }

  // --- 6. MÉRLEG -------------------------------------------------------------
  const rowErrorCount = parsed.issues.length + failed.length
  write('')
  write(
    `MÉRLEG — létrehozva: ${result.summary.letrehozva}, bővítve: ${result.summary.bovitve}, ` +
      `kihagyva (már megvolt): ${result.summary.kihagyva}, hibás sor: ${rowErrorCount}, ` +
      `nem leképezett kurzusnév: ${plan.unknownCourseNames.length}.`,
  )
  log.info('vásárló-import mérleg', {
    letrehozva: result.summary.letrehozva,
    bovitve: result.summary.bovitve,
    kihagyva: result.summary.kihagyva,
    hibasSor: rowErrorCount,
    nemLekepezettKurzus: plan.unknownCourseNames.length,
  })
  write(
    'Az import idempotens: ugyanez a parancs bármikor újrafuttatható — a kész sorok kimaradnak.',
  )

  return rowErrorCount > 0 ? 1 : 0
}

const parsedArgs = parseArgs(process.argv.slice(2))
if (parsedArgs.kind !== 'args') {
  process.exit(parsedArgs.kind === 'help' ? 0 : 1)
}

run(parsedArgs.args)
  .then((code) => {
    process.exit(code)
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    log.error('vásárló-import sikertelen', { error: message })
    writeError(`Hiba: ${message}`)
    process.exit(1)
  })
