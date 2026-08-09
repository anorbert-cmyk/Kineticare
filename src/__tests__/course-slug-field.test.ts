import type { FieldHook } from 'payload'
import { describe, expect, it } from 'vitest'

import { courseSlugField } from '../fields/course-slug'

/**
 * A kurzus slug-mezőjének beforeValidate hookja (C3).
 *
 * A tiszta slug-szabályokat a course-url.test.ts fedi; itt az ADATBÁZIS-FÜGGŐ
 * viselkedés a tét: a foglaltság-lekérdezés helyes szűrője (a saját sor
 * kizárása), a sorszámozás és az, hogy lekérdezési hiba se akassza meg a
 * mentést. A Payload egy szűk, memóriában élő utánzattal helyettesül — a repó
 * bevett tesztmintája (`as unknown as` cast, `any` sehol).
 */

interface FakeProductRow {
  id: number
  slug: string | null
}

interface FakeFindArgs {
  collection: string
  where?: Record<string, unknown>
}

interface WhereClause {
  slug?: { contains?: string }
  id?: { not_equals?: number }
}

function clausesOf(where: Record<string, unknown> | undefined): WhereClause[] {
  if (!where) {
    return []
  }
  const and = where.and
  return Array.isArray(and) ? (and as WhereClause[]) : [where as WhereClause]
}

function rowMatches(row: FakeProductRow, clause: WhereClause): boolean {
  const contains = clause.slug?.contains
  if (typeof contains === 'string' && !(row.slug ?? '').includes(contains)) {
    return false
  }
  const notEquals = clause.id?.not_equals
  if (typeof notEquals === 'number' && row.id === notEquals) {
    return false
  }
  return true
}

interface HookRun {
  /** A hook által megszólított collectionök (elgépelés-védelem). */
  collections: string[]
  slug: string | null
}

/** A mező hookja egy előre feltöltött „adatbázison" futtatva. */
async function runHook(args: {
  rows: FakeProductRow[]
  data?: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  value?: unknown
  failFind?: boolean
}): Promise<HookRun> {
  const collections: string[] = []
  const req = {
    payload: {
      find: ({ collection, where }: FakeFindArgs) => {
        collections.push(collection)
        if (args.failFind === true) {
          return Promise.reject(new Error('adatbázis nem elérhető'))
        }
        const clauses = clausesOf(where)
        return Promise.resolve({
          docs: args.rows.filter((row) => clauses.every((clause) => rowMatches(row, clause))),
        })
      },
    },
  }

  const hook = courseSlugField.hooks?.beforeValidate?.[0]
  if (!hook) {
    throw new Error('a slug-mezőnek beforeValidate hookkal kell rendelkeznie')
  }
  const slug = (await (hook as FieldHook)({
    data: args.data,
    originalDoc: args.originalDoc,
    req,
    value: args.value,
  } as unknown as Parameters<FieldHook>[0])) as string | null

  return { collections, slug }
}

describe('kurzus-slug generálása mentéskor', () => {
  it('a kurzus címéből (displayTitle) készül, a products collectionből ellenőrizve', async () => {
    const run = await runHook({
      rows: [],
      data: { displayTitle: 'Kézrehabilitáció otthon', sku: 'KURZUS-1' },
    })
    expect(run.slug).toBe('kezrehabilitacio-otthon')
    expect(run.collections).toEqual(['products'])
  })

  it('displayTitle nélkül a sku a forrás', async () => {
    const run = await runHook({ rows: [], data: { sku: 'SOS Kézrelax' } })
    expect(run.slug).toBe('sos-kezrelax')
  })

  it('a kézzel megadott webcímet slug-alakra normalizálja', async () => {
    const run = await runHook({
      rows: [],
      data: { displayTitle: 'Kézrehabilitáció otthon' },
      value: 'Kéz Torna!',
    })
    expect(run.slug).toBe('kez-torna')
  })

  it('se cím, se azonosító → nincs slug (a kurzus a régi, id-alapú címen marad)', async () => {
    const run = await runHook({ rows: [], data: { displayTitle: '  ', sku: null } })
    expect(run.slug).toBeNull()
    // Forrás híján felesleges lekérdezés sincs.
    expect(run.collections).toEqual([])
  })
})

describe('slug-ütközés feloldása mentéskor', () => {
  it('foglalt webcímnél sorszámot kap (a mentés nem bukik unique-hibára)', async () => {
    const run = await runHook({
      rows: [{ id: 1, slug: 'kez-torna' }],
      data: { displayTitle: 'Kéz torna' },
    })
    expect(run.slug).toBe('kez-torna-2')
  })

  it('több foglalt sorszám esetén a következő szabadat adja', async () => {
    const run = await runHook({
      rows: [
        { id: 1, slug: 'kez-torna' },
        { id: 2, slug: 'kez-torna-2' },
      ],
      data: { displayTitle: 'Kéz torna' },
    })
    expect(run.slug).toBe('kez-torna-3')
  })

  it('a hasonló kezdetű, de más kurzus nem számít ütközésnek', async () => {
    const run = await runHook({
      rows: [{ id: 1, slug: 'kez-torna-halado' }],
      data: { displayTitle: 'Kéz torna' },
    })
    expect(run.slug).toBe('kez-torna')
  })

  it('szerkesztéskor a saját, változatlan slug nem ütközik önmagával', async () => {
    const run = await runHook({
      rows: [{ id: 1, slug: 'kez-torna' }],
      data: { displayTitle: 'Kéz torna' },
      originalDoc: { id: 1, slug: 'kez-torna', displayTitle: 'Kéz torna' },
      value: 'kez-torna',
    })
    expect(run.slug).toBe('kez-torna')
    // Változatlan slugnál lekérdezés sincs (a piszkozat autosave miatt fontos).
    expect(run.collections).toEqual([])
  })

  it('szerkesztéskor az ÚJ slug a saját sort kizárva ellenőrződik', async () => {
    const run = await runHook({
      rows: [
        { id: 1, slug: 'kez-torna' },
        { id: 2, slug: 'csuklo-torna' },
      ],
      data: {},
      originalDoc: { id: 1, slug: 'kez-torna' },
      value: 'csuklo-torna',
    })
    expect(run.slug).toBe('csuklo-torna-2')
  })
})

describe('a webcím élettartama: piszkozatban követi a címet, közzététel után fagy', () => {
  it('piszkozatnál a félig begépelt címből lett slug követi a végleges címet', async () => {
    // Az autosave-es piszkozat különben „ke"-ként fagyasztaná be a webcímet.
    const run = await runHook({
      rows: [{ id: 1, slug: 'ke' }],
      data: { displayTitle: 'Kézrehabilitáció otthon' },
      originalDoc: { id: 1, slug: 'ke', displayTitle: 'Ké', status: 'draft' },
    })
    expect(run.slug).toBe('kezrehabilitacio-otthon')
  })

  it('KÖZZÉTETT kurzusnál a cím átírása NEM mozdítja el a webcímet', async () => {
    // Az élő URL nem törhet el egy cím-finomítástól.
    const run = await runHook({
      rows: [{ id: 1, slug: 'kez-torna' }],
      data: { displayTitle: 'Kéztorna otthon — 8 hetes program' },
      originalDoc: { id: 1, slug: 'kez-torna', displayTitle: 'Kéz torna', status: 'published' },
    })
    expect(run.slug).toBe('kez-torna')
    expect(run.collections).toEqual([])
  })

  it('ARCHIVÁLT kurzusnál a cím átírása NEM mozdítja el a webcímet (élő, linkelt URL)', async () => {
    // Az archivált oldal nyilvánosan kiszolgált (a lejárt hozzáférésű vevők
    // linkjei is ide mutatnak), és a régi slugról nincs átirányítás — a
    // cím-követés itt néma 404-et okozna. Részleges (slug mezőt nem hordozó)
    // frissítés a tipikus eset: pl. REST PATCH csak displayTitle-lel.
    const run = await runHook({
      rows: [{ id: 7, slug: 'kez-torna' }],
      data: { displayTitle: 'Kéztorna otthon' },
      originalDoc: { id: 7, slug: 'kez-torna', displayTitle: 'Kéz torna', status: 'archived' },
    })
    expect(run.slug).toBe('kez-torna')
    expect(run.collections).toEqual([])
  })

  it('a kézzel írt webcímet piszkozatban sem írja felül a cím', async () => {
    const run = await runHook({
      rows: [{ id: 1, slug: 'sajat-webcim' }],
      data: { displayTitle: 'Kézrehabilitáció otthon' },
      originalDoc: {
        id: 1,
        slug: 'sajat-webcim',
        displayTitle: 'Kézrehabilitáció',
        status: 'draft',
      },
    })
    expect(run.slug).toBe('sajat-webcim')
  })

  it('részleges frissítésnél (a slug nem érkezik) a meglévő webcím marad', async () => {
    const run = await runHook({
      rows: [{ id: 1, slug: 'kez-torna' }],
      data: { status: 'published' },
      originalDoc: { id: 1, slug: 'kez-torna', displayTitle: 'Kéz torna', status: 'draft' },
    })
    expect(run.slug).toBe('kez-torna')
    expect(run.collections).toEqual([])
  })
})

describe('hibatűrés', () => {
  it('lekérdezési hiba esetén az alap slug marad (a mentés nem akad el)', async () => {
    const run = await runHook({
      rows: [],
      data: { displayTitle: 'Kéz torna' },
      failFind: true,
    })
    expect(run.slug).toBe('kez-torna')
  })
})
