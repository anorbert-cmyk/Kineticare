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
  normalizeEmail,
  normalizeKey,
  parseCsvRecords,
  parseCustomerCsv,
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
    expect(parsed.columns).toEqual({ email: 0, name: 1, courses: 2 })
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
