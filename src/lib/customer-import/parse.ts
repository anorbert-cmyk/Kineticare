/**
 * systeme.io → Kineticare vásárló-import: CSV-beolvasás és sor-normalizálás.
 *
 * KÜLSŐ FÜGGŐSÉG NÉLKÜL. A modul tiszta (nem érint adatbázist, hálózatot,
 * fájlrendszert), ezért mock nélkül unit-tesztelhető — a fájl beolvasása a
 * hívó (CLI) dolga, ide már a nyers szöveg érkezik.
 *
 * Amit a parser kezel (mind valós systeme.io-export alak):
 *  - UTF-8 BOM a fájl elején (Excel így menti),
 *  - idézőjeles mező vesszővel ÉS sortöréssel a mező belsejében,
 *  - kettőzött idézőjel (`""`) mint escape-elt idézőjel,
 *  - CRLF / LF / CR sorvég vegyesen,
 *  - konfigurálható elválasztó (alap: `,`; a magyar Excel `;`-t ír).
 *
 * Oszlop-hozzárendelés NÉV szerint történik (a fejlécsor alapján), mert az
 * export oszlopsorrendje verziónként változik. A név egyeztetése kis-/nagybetű-
 * és szóköz-érzéketlen; a hívó felülírhatja (`emailColumn`, `nameColumn`,
 * `coursesColumn`).
 *
 * ÖSSZEFÉSÜLÉS: az exportok kétféle alakot használnak ugyanarra — egy cellában
 * több kurzus (`|` vagy `;` elválasztóval), VAGY ugyanaz az e-mail több sorban,
 * soronként egy kurzussal. Mindkettőt ugyanarra a normalizált alakra hozzuk:
 * e-mailenként EGY sor, uniózott kurzuslistával.
 *
 * HIBAKEZELÉS: a hibás sor (üres/rossz e-mail, hiányzó oszlop) nem állítja meg
 * a feldolgozást — kimarad, és bekerül az `issues` listába, hogy a futás végén
 * a mérlegben megjelenjen. Csendes kihagyás sehol nincs.
 */

/**
 * Az UTF-8 BOM kódpontja szövegként — a fájl elejéről levágandó. Szándékosan
 * escape-elt alakban (a nyers karakter láthatatlan lenne a forrásban).
 */
export const UTF8_BOM = '\uFEFF'

/** Egy nyers CSV-rekord: a mezői és a rekord KEZDŐ fizikai sora (1-alapú). */
export interface CsvRecord {
  readonly fields: readonly string[]
  /**
   * A rekord első fizikai sorának száma a fájlban. Idézőjeles, sortörést
   * tartalmazó mezőnél a rekord több fizikai sorra nyúlik — a hibaüzenetben a
   * KEZDŐ sor a használható fogódzó.
   */
  readonly line: number
}

/** Egy kihagyott sor és a magyar indoklása — a záró mérleg hibalistája. */
export interface RowIssue {
  readonly line: number
  readonly reason: string
  readonly email?: string
}

/** Egy normalizált, importálható vásárlói sor. */
export interface CustomerRow {
  /** Kisbetűsített, trimmelt e-mail — ez a sor egyedi kulcsa. */
  readonly email: string
  /** Megjelenő név (a users.name kötelező mezője). Sosem üres. */
  readonly name: string
  /** A sorhoz tartozó kurzusnevek, eredeti írásmóddal, duplikátumok nélkül. */
  readonly courseNames: readonly string[]
  /** Mely fájlbeli sorokból állt össze (összefésülésnél több elem). */
  readonly lines: readonly number[]
}

/** A felismert oszlopok indexe a fejlécben (`null` = nincs ilyen oszlop). */
export interface ResolvedColumns {
  readonly email: number
  readonly name: number | null
  readonly courses: number | null
}

export interface ParseOptions {
  /** Mezőelválasztó. Alap: `,`. A `\t` / `tab` szöveg tabulátorra fordul. */
  readonly delimiter?: string
  /** Az e-mail-oszlop fejlécneve (felülírja az automatikus felismerést). */
  readonly emailColumn?: string
  /** A név-oszlop fejlécneve. */
  readonly nameColumn?: string
  /** A kurzus-oszlop fejlécneve. */
  readonly coursesColumn?: string
}

export interface ParsedCsv {
  readonly header: readonly string[]
  readonly columns: ResolvedColumns
  /** E-mailenként egy sor, e-mail szerint növekvő, determinisztikus sorrendben. */
  readonly rows: readonly CustomerRow[]
  readonly issues: readonly RowIssue[]
  /** Nem hibák, de a futás végén ki kell írni őket (pl. összefésült e-mailek). */
  readonly warnings: readonly string[]
}

/** Automatikus fejléc-felismerés: e-mail-oszlop lehetséges nevei. */
const EMAIL_HEADERS: readonly string[] = [
  'email',
  'e-mail',
  'e-mail cím',
  'e-mail cim',
  'email cím',
  'email cim',
  'email address',
  'contact email',
  'customer email',
]

/** Automatikus fejléc-felismerés: név-oszlop lehetséges nevei. */
const NAME_HEADERS: readonly string[] = [
  'name',
  'full name',
  'nev',
  'név',
  'teljes nev',
  'teljes név',
  'customer name',
  'first name',
  'keresztnev',
  'keresztnév',
]

/** Automatikus fejléc-felismerés: kurzus-oszlop lehetséges nevei. */
const COURSES_HEADERS: readonly string[] = [
  'courses',
  'course',
  'kurzus',
  'kurzusok',
  'products',
  'product',
  'termek',
  'termék',
  'termekek',
  'termékek',
  'tags',
  'tag',
  'cimke',
  'címke',
  'cimkek',
  'címkék',
]

/**
 * Cellán belül több kurzus elválasztói. A `;` azért is biztonságos, mert a
 * mező-szintű `;` elválasztót a tokenizer már feldolgozta: ide csak a cella
 * BELSEJE jut el.
 */
const COURSE_SPLIT = /[|;]/

/**
 * Szándékosan megengedő e-mail-ellenőrzés: a cél a nyilvánvalóan hibás cella
 * kiszűrése (üres, szóközös, `@` nélküli, pont nélküli domain), nem az RFC 5322
 * teljes újraimplementálása — a szigorúbb szabály valódi címeket zárna ki.
 */
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/

/** Egyeztetési kulcs fejléchez és kurzusnévhez: trim + kisbetű + szóköz-normalizálás. */
export function normalizeKey(value: string): string {
  return value.replace(UTF8_BOM, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** A `--delimiter` értékének feloldása (a `\t` / `tab` szöveg tabulátort jelent). */
export function resolveDelimiter(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return ','
  }
  const normalized = raw === '\\t' || raw.toLowerCase() === 'tab' ? '\t' : raw
  if ([...normalized].length !== 1) {
    throw new Error(
      `Az elválasztó pontosan egy karakter lehet (kapott: "${raw}"). Példa: --delimiter=";"`,
    )
  }
  if (normalized === '"' || normalized === '\r' || normalized === '\n') {
    throw new Error('Az elválasztó nem lehet idézőjel vagy sortörés.')
  }
  return normalized
}

/**
 * RFC 4180 szerinti tokenizer: mezőt csak a mező ELEJÉN álló idézőjel nyit,
 * belül a `""` egyetlen idézőjelre fordul, a mezőn belüli sortörés pedig a
 * mező része marad (`\n`-re normalizálva, hogy a sorvég-konvenció ne
 * szivárogjon be az adatba).
 */
export function parseCsvRecords(input: string, delimiter = ','): CsvRecord[] {
  const text = input.startsWith(UTF8_BOM) ? input.slice(UTF8_BOM.length) : input
  const records: CsvRecord[] = []
  let fields: string[] = []
  let field = ''
  let inQuotes = false
  let line = 1
  let recordLine = 1
  let index = 0
  let started = false

  const endField = (): void => {
    fields.push(field)
    field = ''
  }
  const endRecord = (): void => {
    endField()
    // A záró sortörés utáni „üres rekord" nem rekord — csak a fájl vége.
    if (fields.length > 1 || fields[0] !== '') {
      records.push({ fields, line: recordLine })
    }
    fields = []
    started = false
  }

  while (index < text.length) {
    const char = text[index]
    if (!started) {
      recordLine = line
      started = true
    }

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      if (char === '\r') {
        // Mezőn belüli sortörés — CRLF és CR is egységesen \n lesz.
        field += '\n'
        line += 1
        index += text[index + 1] === '\n' ? 2 : 1
        continue
      }
      if (char === '\n') {
        field += '\n'
        line += 1
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"' && field === '') {
      inQuotes = true
      index += 1
      continue
    }
    if (char === delimiter) {
      endField()
      index += 1
      continue
    }
    if (char === '\r' || char === '\n') {
      endRecord()
      line += 1
      index += char === '\r' && text[index + 1] === '\n' ? 2 : 1
      continue
    }
    field += char
    index += 1
  }

  if (started || field !== '' || fields.length > 0) {
    endRecord()
  }
  return records
}

/** Egy cella kurzusnevekre bontása (`|` és `;`), trimmel és duplikátum-szűréssel. */
export function splitCourseNames(cell: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const raw of cell.split(COURSE_SPLIT)) {
    const name = raw.trim()
    if (name === '') {
      continue
    }
    const key = normalizeKey(name)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    names.push(name)
  }
  return names
}

/** Az e-mail-cella normalizálása: trim + kisbetű (a users.email is így tárol). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Alaki e-mail-ellenőrzés (lásd EMAIL_PATTERN indoklását). */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

function findColumn(
  header: readonly string[],
  explicit: string | undefined,
  candidates: readonly string[],
): number | null {
  const keys = header.map(normalizeKey)
  if (explicit !== undefined && explicit.trim() !== '') {
    const index = keys.indexOf(normalizeKey(explicit))
    return index === -1 ? null : index
  }
  for (const candidate of candidates) {
    const index = keys.indexOf(candidate)
    if (index !== -1) {
      return index
    }
  }
  return null
}

/** Névpótlék hiányzó név esetén: az e-mail `@` előtti része (a users.name kötelező). */
function fallbackName(email: string): string {
  const localPart = email.split('@')[0] ?? email
  return localPart.trim() === '' ? email : localPart
}

interface MutableRow {
  email: string
  name: string
  courseNames: string[]
  courseKeys: Set<string>
  lines: number[]
}

/**
 * A teljes CSV feldolgozása normalizált vásárlói sorokká.
 *
 * DOBÁS csak akkor, ha a fájl szerkezete miatt egyetlen sor sem értelmezhető
 * (nincs meg az e-mail-oszlop) — minden más hiba SOR-szintű, és a feldolgozás
 * megy tovább.
 */
export function parseCustomerCsv(input: string, options: ParseOptions = {}): ParsedCsv {
  const delimiter = resolveDelimiter(options.delimiter)
  const records = parseCsvRecords(input, delimiter)

  if (records.length === 0) {
    return {
      header: [],
      columns: { email: -1, name: null, courses: null },
      rows: [],
      issues: [],
      warnings: ['A fájl üres — nincs benne fejlécsor sem.'],
    }
  }

  const header = records[0].fields.map((cell) => cell.trim())
  const emailIndex = findColumn(header, options.emailColumn, EMAIL_HEADERS)
  if (emailIndex === null) {
    throw new Error(
      options.emailColumn !== undefined
        ? `Nincs "${options.emailColumn}" nevű oszlop a fájlban. A fejléc: ${header.join(', ')}`
        : `Nem található e-mail-oszlop a fájlban. A fejléc: ${header.join(', ')}. ` +
          'Add meg kézzel: --email-col="<oszlopnév>"',
    )
  }
  const nameIndex = findColumn(header, options.nameColumn, NAME_HEADERS)
  const coursesIndex = findColumn(header, options.coursesColumn, COURSES_HEADERS)

  const warnings: string[] = []
  if (options.nameColumn !== undefined && nameIndex === null) {
    warnings.push(
      `Nincs "${options.nameColumn}" nevű oszlop — a név az e-mail-cím @ előtti részéből képződik.`,
    )
  }
  if (options.coursesColumn !== undefined && coursesIndex === null) {
    warnings.push(
      `Nincs "${options.coursesColumn}" nevű oszlop — a fájlból nem olvasható ki kurzus.`,
    )
  } else if (coursesIndex === null) {
    warnings.push(
      'Nem található kurzus-oszlop — csak felhasználók jönnének létre, kurzus-hozzáférés nélkül. ' +
        'Add meg kézzel: --courses-col="<oszlopnév>"',
    )
  }

  const issues: RowIssue[] = []
  const byEmail = new Map<string, MutableRow>()
  const mergedEmails: string[] = []
  let missingNameCount = 0

  for (const record of records.slice(1)) {
    const { fields, line } = record
    if (fields.every((cell) => cell.trim() === '')) {
      continue
    }
    // A fejléctől eltérő mezőszám ELCSÚSZOTT sort jelent: ilyenkor a kurzus-cella
    // már nem oda tartozik, ahova a fejléc mutat — a vevő rossz (vagy semmilyen)
    // hozzáférést kapna. Ezért a sor kimarad, és a hibalistába kerül.
    if (fields.length !== header.length) {
      issues.push({
        line,
        reason: `Hiányzó vagy többlet oszlop: a sorban ${fields.length} mező van a fejléc ${header.length} oszlopa helyett.`,
      })
      continue
    }

    const rawEmail = fields[emailIndex] ?? ''
    const email = normalizeEmail(rawEmail)
    if (email === '') {
      issues.push({ line, reason: 'Üres e-mail-cím — a sor nem importálható.' })
      continue
    }
    if (!isValidEmail(email)) {
      issues.push({ line, reason: `Hibás e-mail-formátum: "${rawEmail.trim()}".`, email })
      continue
    }

    const rawName = nameIndex === null ? '' : (fields[nameIndex] ?? '').trim()
    if (rawName === '') {
      missingNameCount += 1
    }
    const name = rawName === '' ? fallbackName(email) : rawName
    const courseNames = coursesIndex === null ? [] : splitCourseNames(fields[coursesIndex] ?? '')

    const existing = byEmail.get(email)
    if (existing === undefined) {
      byEmail.set(email, {
        email,
        name,
        courseNames: [...courseNames],
        courseKeys: new Set(courseNames.map(normalizeKey)),
        lines: [line],
      })
      continue
    }

    // Ugyanaz az e-mail többször: uniózzuk a kurzusokat, a nevet az első
    // KITÖLTÖTT érték adja (a pótolt névnél a valódi név erősebb).
    if (rawName !== '' && existing.name === fallbackName(email)) {
      existing.name = rawName
    }
    for (const courseName of courseNames) {
      const key = normalizeKey(courseName)
      if (!existing.courseKeys.has(key)) {
        existing.courseKeys.add(key)
        existing.courseNames.push(courseName)
      }
    }
    existing.lines.push(line)
    if (existing.lines.length === 2) {
      mergedEmails.push(email)
    }
  }

  if (missingNameCount > 0) {
    warnings.push(
      `${missingNameCount} sorban hiányzott a név — az e-mail-cím @ előtti részét használjuk.`,
    )
  }
  if (mergedEmails.length > 0) {
    const shown = mergedEmails.slice(0, 10).join(', ')
    warnings.push(
      `${mergedEmails.length} e-mail többször szerepel a fájlban — a kurzusaikat összefésültük: ` +
        `${shown}${mergedEmails.length > 10 ? ' …' : ''}`,
    )
  }

  const rows: CustomerRow[] = [...byEmail.values()]
    .map((row) => ({
      email: row.email,
      name: row.name,
      courseNames: row.courseNames,
      lines: row.lines,
    }))
    .sort((a, b) => (a.email < b.email ? -1 : a.email > b.email ? 1 : 0))

  return {
    header,
    columns: { email: emailIndex, name: nameIndex, courses: coursesIndex },
    rows,
    issues,
    warnings,
  }
}
