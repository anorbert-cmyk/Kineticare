/**
 * A vásárló-import CSV-parsere (src/lib/customer-import/parse.ts).
 *
 * A tesztek a VALÓS export-alakokra épülnek: Excelből mentett BOM, idézőjeles
 * mező vesszővel és sortöréssel, vegyes sorvég, magyar Excel `;` elválasztója,
 * és ugyanaz az e-mail több sorban.
 *
 * MINDEN ADAT KITALÁLT (example.com) — valódi vásárlói adat nem kerülhet a repóba.
 */

import { describe, expect, it } from 'vitest'

import {
  composeCustomerName,
  normalizeEmail,
  normalizeKey,
  parseCsvRecords,
  parseCustomerCsv,
  parseRegisteredAt,
  resolveDelimiter,
  splitCourseNames,
  UTF8_BOM,
} from '../../lib/customer-import/parse'

describe('CSV-tokenizer', () => {
  it('levágja az UTF-8 BOM-ot a fájl elejéről', () => {
    const records = parseCsvRecords(`${UTF8_BOM}email,nev\na@example.com,Anna\n`)
    expect(records[0].fields).toEqual(['email', 'nev'])
  })

  it('idézőjeles mezőben megtartja a vesszőt', () => {
    const records = parseCsvRecords('email,kurzusok\na@example.com,"Kurzus A, bővített"\n')
    expect(records[1].fields).toEqual(['a@example.com', 'Kurzus A, bővített'])
  })

  it('idézőjeles mezőben megtartja a sortörést, és a rekord KEZDŐ sorát jelenti', () => {
    const records = parseCsvRecords('email,megjegyzes\na@example.com,"első sor\nmásodik sor"\nb@example.com,rendben\n')
    expect(records[1].fields[1]).toBe('első sor\nmásodik sor')
    expect(records[1].line).toBe(2)
    // A többsoros mező után a következő rekord a 4. fizikai sorban kezdődik.
    expect(records[2].line).toBe(4)
    expect(records[2].fields[0]).toBe('b@example.com')
  })

  it('a kettőzött idézőjel egyetlen idézőjelre fordul', () => {
    const records = parseCsvRecords('nev\n"Kata ""a kezes"" Kiss"\n')
    expect(records[1].fields[0]).toBe('Kata "a kezes" Kiss')
  })

  it('CRLF, LF és CR sorvéget egyaránt kezel', () => {
    expect(parseCsvRecords('a,b\r\nc,d\r\n')).toHaveLength(2)
    expect(parseCsvRecords('a,b\nc,d\n')).toHaveLength(2)
    expect(parseCsvRecords('a,b\rc,d')).toHaveLength(2)
  })

  it('a záró sortörés nem hoz létre üres rekordot, a záró sortörés hiánya sem veszít sort', () => {
    expect(parseCsvRecords('a,b\nc,d\n')).toHaveLength(2)
    expect(parseCsvRecords('a,b\nc,d')).toHaveLength(2)
  })

  it('a mezőn belüli CRLF is egységesen \\n lesz', () => {
    const records = parseCsvRecords('a\n"sor1\r\nsor2"\n')
    expect(records[1].fields[0]).toBe('sor1\nsor2')
  })

  it('konfigurálható elválasztó (magyar Excel: ;)', () => {
    const records = parseCsvRecords('email;nev\na@example.com;Anna\n', ';')
    expect(records[1].fields).toEqual(['a@example.com', 'Anna'])
  })
})

describe('elválasztó feloldása', () => {
  it('alapértelmezés a vessző, a \\t és a "tab" tabulátort jelent', () => {
    expect(resolveDelimiter(undefined)).toBe(',')
    expect(resolveDelimiter(';')).toBe(';')
    expect(resolveDelimiter('\\t')).toBe('\t')
    expect(resolveDelimiter('tab')).toBe('\t')
  })

  it('több karakteres vagy tiltott elválasztónál magyar hibaüzenettel dob', () => {
    expect(() => resolveDelimiter('::')).toThrow(/pontosan egy karakter/)
    expect(() => resolveDelimiter('"')).toThrow(/idézőjel/)
  })
})

describe('cellán belüli kurzuslista', () => {
  it('a | és a ; is elválaszt, trimmel és duplikátumot szűr', () => {
    expect(splitCourseNames('Kurzus A | Kurzus B ; Kurzus A')).toEqual(['Kurzus A', 'Kurzus B'])
    expect(splitCourseNames('   ')).toEqual([])
  })
})

describe('segédfüggvények', () => {
  it('az e-mail kisbetűsödik és trimmelődik', () => {
    expect(normalizeEmail('  Pelda.Vasarlo@Example.COM ')).toBe('pelda.vasarlo@example.com')
  })

  it('a kulcs-normalizálás szóköz- és kis/nagybetű-érzéketlen', () => {
    expect(normalizeKey('  Kéz  Rehab   Alap ')).toBe('kéz rehab alap')
  })
})

describe('teljes CSV feldolgozása', () => {
  const csv = [
    'Email,Name,Courses',
    'pelda.vasarlo@example.com,Példa Vásárló,Kéz Rehab Alap|Kéz Rehab Halado',
    'masik.vasarlo@example.com,Másik Vásárló,Kéz Rehab Alap',
    '',
  ].join('\n')

  it('a fejléc alapján ismeri fel az oszlopokat', () => {
    const parsed = parseCustomerCsv(csv)
    expect(parsed.columns).toEqual({
      email: 0,
      name: 1,
      courses: 2,
      // A generic alaknál nincs külön vezetéknév- és dátum-oszlop.
      lastName: null,
      registeredAt: null,
    })
    expect(parsed.format).toBe('generic')
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.issues).toEqual([])
  })

  it('e-mail szerint növekvő, determinisztikus sorrendet ad', () => {
    expect(parseCustomerCsv(csv).rows.map((row) => row.email)).toEqual([
      'masik.vasarlo@example.com',
      'pelda.vasarlo@example.com',
    ])
  })

  it('a kurzusokat cellán belül is felbontja', () => {
    const row = parseCustomerCsv(csv).rows.find((entry) => entry.email.startsWith('pelda'))
    expect(row?.courseNames).toEqual(['Kéz Rehab Alap', 'Kéz Rehab Halado'])
  })

  it('kézzel megadott oszlopnevekkel is dolgozik', () => {
    const custom = [
      'azonosito;levelcim;megnevezes;csomagok',
      '1;pelda.vasarlo@example.com;Példa Vásárló;Kéz Rehab Alap',
      '',
    ].join('\r\n')
    const parsed = parseCustomerCsv(custom, {
      delimiter: ';',
      emailColumn: 'levelcim',
      nameColumn: 'megnevezes',
      coursesColumn: 'csomagok',
    })
    expect(parsed.rows).toEqual([
      {
        email: 'pelda.vasarlo@example.com',
        name: 'Példa Vásárló',
        courseNames: ['Kéz Rehab Alap'],
        lines: [2],
      },
    ])
  })

  it('ugyanazt az e-mailt több sorból ÖSSZEFÉSÜLI (a kurzusok unióját adja)', () => {
    const duplicated = [
      'Email,Name,Courses',
      'pelda.vasarlo@example.com,,Kéz Rehab Alap',
      'PELDA.VASARLO@example.com,Példa Vásárló,Kéz Rehab Halado',
      'pelda.vasarlo@example.com,Példa Vásárló,Kéz Rehab Alap',
      '',
    ].join('\n')
    const parsed = parseCustomerCsv(duplicated)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].courseNames).toEqual(['Kéz Rehab Alap', 'Kéz Rehab Halado'])
    // A név a legelső KITÖLTÖTT értékből jön, nem a pótlékból.
    expect(parsed.rows[0].name).toBe('Példa Vásárló')
    expect(parsed.rows[0].lines).toEqual([2, 3, 4])
    expect(parsed.warnings.join(' ')).toMatch(/összefésültük/)
  })

  it('hiányzó névnél az e-mail @ előtti részét használja, és figyelmeztet', () => {
    const parsed = parseCustomerCsv('Email,Name,Courses\npelda.vasarlo@example.com,,Kéz Rehab Alap\n')
    expect(parsed.rows[0].name).toBe('pelda.vasarlo')
    expect(parsed.warnings.join(' ')).toMatch(/hiányzott a név/)
  })
})

describe('hibás sorok gyűjtése (a futás megy tovább)', () => {
  const csv = [
    'Email,Name,Courses',
    'jo.vasarlo@example.com,Jó Vásárló,Kéz Rehab Alap',
    ',Névtelen,Kéz Rehab Alap',
    'nem-email,Hibás Cím,Kéz Rehab Alap',
    'rovid.sor@example.com',
    'masik.jo@example.com,Másik Jó,Kéz Rehab Alap',
    '',
  ].join('\n')

  it('a hibás sorokat kihagyja, de a jó sorokat feldolgozza', () => {
    const parsed = parseCustomerCsv(csv)
    expect(parsed.rows.map((row) => row.email)).toEqual([
      'jo.vasarlo@example.com',
      'masik.jo@example.com',
    ])
    expect(parsed.issues).toHaveLength(3)
  })

  it('a hibalista magyar indoklást és sorszámot tartalmaz', () => {
    const issues = parseCustomerCsv(csv).issues
    expect(issues[0]).toMatchObject({ line: 3, reason: expect.stringContaining('Üres e-mail') })
    expect(issues[1]).toMatchObject({ line: 4, reason: expect.stringContaining('Hibás e-mail') })
    expect(issues[2]).toMatchObject({
      line: 5,
      reason: expect.stringContaining('Hiányzó vagy többlet oszlop'),
    })
  })

  it('az üres sorokat némán átugorja (nem hiba)', () => {
    const parsed = parseCustomerCsv('Email,Name\n\njo.vasarlo@example.com,Jó\n\n')
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.issues).toEqual([])
  })
})

describe('üres fájl és csak fejléc', () => {
  it('üres fájlnál nincs sor és nincs kivétel', () => {
    const parsed = parseCustomerCsv('')
    expect(parsed.rows).toEqual([])
    expect(parsed.warnings.join(' ')).toMatch(/A fájl üres/)
  })

  it('csak fejléc esetén nincs importálható sor', () => {
    const parsed = parseCustomerCsv('Email,Name,Courses\n')
    expect(parsed.rows).toEqual([])
    expect(parsed.issues).toEqual([])
  })

  it('hiányzó e-mail-oszlopnál érthető magyar hibaüzenettel dob', () => {
    expect(() => parseCustomerCsv('azonosito,nev\n1,Anna\n')).toThrow(/e-mail-oszlop/)
    expect(() => parseCustomerCsv('Email,Name\n', { emailColumn: 'nincs-ilyen' })).toThrow(
      /Nincs "nincs-ilyen" nevű oszlop/,
    )
  })
})


/**
 * A systeme.io kontakt-export alakja (`Email, First name, Last name, Tag,
 * Date Registered`).
 *
 * MINDEN ADAT KITALÁLT — a valódi lista SZEMÉLYES ADAT, tesztfixtúrába sem
 * kerülhet.
 */
describe('systeme.io kontakt-export (címke-alapú bemenet)', () => {
  const header = '"Email","First name","Last name","Tag","Date Registered"'
  const csv = [
    header,
    '"anna.teszt@example.com","Anna","Teszt","SOS KézRelax vásárló","2025-01-02 10:11:12 (UTC+1)"',
    '"bela.teszt@example.com","Béla","Teszt","Otthoni KézRehab vásárló, Visszatérítés Kézrehab","2025-02-03 08:00:00 (UTC+1)"',
    '"cili.teszt@example.com","Cili","","Előjelentkezők, SOS KézRelax vásárló","2025-03-04 09:30:00 (UTC+2)"',
    '"dora.teszt@example.com","Dóra","Teszt","Hírlevél feliratkozó","2025-04-05 11:00:00 (UTC+2)"',
    '"edit.teszt@example.com","Edit","Teszt","","2025-05-06 12:00:00 (UTC+2)"',
    '',
  ].join('\n')

  const parsed = parseCustomerCsv(csv)
  const rowFor = (email: string) => parsed.rows.find((row) => row.email === email)

  it('a fejlécből felismeri a systeme.io-alakot és minden oszlopát', () => {
    expect(parsed.format).toBe('systeme')
    expect(parsed.columns).toEqual({
      email: 0,
      name: 1,
      courses: 3,
      lastName: 2,
      registeredAt: 4,
    })
  })

  it('a vásárlás-címkéből kurzus-hozzáférés lesz', () => {
    expect(rowFor('anna.teszt@example.com')?.courseNames).toEqual(['SOS KézRelax vásárló'])
  })

  it('a VISSZATÉRÍTETT kurzushoz nem jár hozzáférés', () => {
    const row = rowFor('bela.teszt@example.com')
    expect(row?.courseNames).toEqual([])
    expect(row?.refundedCourseNames).toEqual(['Otthoni KézRehab vásárló'])
  })

  it('az előjelentkező címke nem ad hozzáférést, a mellette lévő vásárlás igen', () => {
    const row = rowFor('cili.teszt@example.com')
    expect(row?.courseNames).toEqual(['SOS KézRelax vásárló'])
    expect(row?.ignoredTags).toEqual(['Előjelentkezők'])
  })

  it('az ismeretlen címke figyelmeztetés, nem hiba — a sor bekerül, hozzáférés nélkül', () => {
    const row = rowFor('dora.teszt@example.com')
    expect(row).toBeDefined()
    expect(row?.courseNames).toEqual([])
    expect(row?.unknownTags).toEqual(['Hírlevél feliratkozó'])
    expect(parsed.issues).toEqual([])
    expect(parsed.warnings.join(' ')).toContain('ISMERETLEN CÍMKE')
    expect(parsed.warnings.join(' ')).toContain('Hírlevél feliratkozó')
  })

  it('üres címke-cella: fiók igen, hozzáférés nem', () => {
    expect(rowFor('edit.teszt@example.com')?.courseNames).toEqual([])
  })

  it('a régi vásárlás dátumát ISO-alakban őrzi meg', () => {
    expect(rowFor('anna.teszt@example.com')?.registeredAt).toBe('2025-01-02T10:11:12+01:00')
    expect(rowFor('cili.teszt@example.com')?.registeredAt).toBe('2025-03-04T09:30:00+02:00')
  })

  it('a címke-mérleg vevőnkénti számokat ad', () => {
    const stats = parsed.tagStats
    expect(stats).toBeDefined()
    expect(stats?.granted.get('SOS KézRelax vásárló')).toBe(2)
    expect(stats?.refunded.get('Otthoni KézRehab vásárló')).toBe(1)
    expect(stats?.ignored.get('Előjelentkezők')).toBe(1)
    expect(stats?.unknown.get('Hírlevél feliratkozó')).toBe(1)
    expect(stats?.customersWithoutTags).toBe(1)
    expect(stats?.customersWithoutAccess).toBe(3)
    expect(stats?.customersWithDate).toBe(5)
    expect(stats?.unparsableDates).toBe(0)
  })

  it('a `Courses` oszlopos (generic) fájl NEM vált címke-értelmezésre', () => {
    const generic = parseCustomerCsv('Email,Name,Courses\na@example.com,Anna,"Kurzus A|Kurzus B"\n')
    expect(generic.format).toBe('generic')
    expect(generic.tagStats).toBeUndefined()
    expect(generic.rows[0].courseNames).toEqual(['Kurzus A', 'Kurzus B'])
  })

  it('a --format=systeme kényszerítés a fejléctől függetlenül él', () => {
    const forced = parseCustomerCsv(
      'Email,Name,Tags\na@example.com,Anna,"SOS KézRelax vásárló, Előjelentkezők"\n',
      { format: 'systeme' },
    )
    expect(forced.format).toBe('systeme')
    expect(forced.rows[0].courseNames).toEqual(['SOS KézRelax vásárló'])
  })

  it('ugyanaz az e-mail több sorban: kurzusok uniója, a LEGKORÁBBI dátum marad', () => {
    const merged = parseCustomerCsv(
      [
        header,
        '"anna.teszt@example.com","Anna","Teszt","SOS KézRelax vásárló","2025-06-01 10:00:00 (UTC+2)"',
        '"anna.teszt@example.com","Anna","Teszt","Otthoni KézRehab vásárló","2024-02-02 09:00:00 (UTC+1)"',
        '',
      ].join('\n'),
    )
    expect(merged.rows).toHaveLength(1)
    expect(merged.rows[0].courseNames).toEqual([
      'SOS KézRelax vásárló',
      'Otthoni KézRehab vásárló',
    ])
    expect(merged.rows[0].registeredAt).toBe('2024-02-02T09:00:00+01:00')
  })

  it('az értelmezhetetlen dátum a sort NEM ejti ki, csak figyelmeztet', () => {
    const broken = parseCustomerCsv(
      [header, '"anna.teszt@example.com","Anna","Teszt","","tegnap"', ''].join('\n'),
    )
    expect(broken.rows).toHaveLength(1)
    expect(broken.rows[0].registeredAt).toBeUndefined()
    expect(broken.issues[0].reason).toContain('Értelmezhetetlen dátum')
  })
})

describe('név-összeállítás a két név-oszlopból', () => {
  it.each([
    ['mindkettő kitöltve', 'Anna', 'Teszt', 'Anna Teszt'],
    ['csak keresztnév', 'Anna', '', 'Anna'],
    ['csak vezetéknév', '', 'Teszt', 'Teszt'],
    ['ugyanaz mindkét oszlopban', 'Anna', 'anna', 'Anna'],
    ['az egyik oszlop a TELJES nevet hordozza', 'Teszt Anna', 'Anna', 'Teszt Anna'],
    ['fordított sorrendű teljes név a másodikban', 'Anna', 'Anna Teszt', 'Anna Teszt'],
    ['fölös szóközök', '  Anna   ', '  Teszt  ', 'Anna Teszt'],
    ['mindkettő üres', '', '', ''],
    ['két szó + két szó (nincs átfedés)', 'Anna Mária', 'Teszt Kiss', 'Anna Mária Teszt Kiss'],
  ])('%s', (_label, first, last, expected) => {
    expect(composeCustomerName(first, last)).toBe(expected)
  })

  it('a fájlban a névösszeállítás eredménye kerül a sorba', () => {
    const parsed = parseCustomerCsv(
      [
        '"Email","First name","Last name","Tag","Date Registered"',
        '"anna.teszt@example.com","Teszt Anna","Anna","",""',
        '"bela.teszt@example.com","","Teszt Béla","",""',
        '"cili.teszt@example.com","","","",""',
        '',
      ].join('\n'),
    )
    expect(parsed.rows.find((row) => row.email.startsWith('anna'))?.name).toBe('Teszt Anna')
    expect(parsed.rows.find((row) => row.email.startsWith('bela'))?.name).toBe('Teszt Béla')
    // Név nélküli sor: az e-mail @ előtti része a pótlék (a users.name kötelező).
    expect(parsed.rows.find((row) => row.email.startsWith('cili'))?.name).toBe('cili.teszt')
  })
})

describe('regisztrációs dátum értelmezése', () => {
  it.each([
    ['systeme.io alak (UTC+2)', '2025-03-04 09:30:00 (UTC+2)', '2025-03-04T09:30:00+02:00'],
    ['systeme.io alak (UTC+0)', '2025-03-04 09:30:00 (UTC+0)', '2025-03-04T09:30:00Z'],
    ['csak dátum', '2025-03-04', '2025-03-04'],
    ['ISO Z-vel', '2025-03-04T09:30:00Z', '2025-03-04T09:30:00Z'],
    ['ISO eltolással', '2025-03-04T09:30:00+02:00', '2025-03-04T09:30:00+02:00'],
    ['másodperc nélkül', '2025-03-04 09:30', '2025-03-04T09:30:00Z'],
  ])('%s', (_label, input, expected) => {
    expect(parseRegisteredAt(input)).toBe(expected)
  })

  it.each([
    ['üres cella', ''],
    ['szöveg', 'tegnap'],
    ['nem létező nap', '2025-02-31 10:00:00 (UTC+1)'],
    ['hibás hónap', '2025-13-01'],
    ['fordított alak', '04.03.2025'],
  ])('%s → null (nem talál ki dátumot)', (_label, input) => {
    expect(parseRegisteredAt(input)).toBeNull()
  })
})
