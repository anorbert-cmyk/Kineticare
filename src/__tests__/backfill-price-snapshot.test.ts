import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import {
  BACKFILL_LAPMERET,
  epitsdVisszairandoTeteleket,
  formazdJelentest,
  futtatBackfill,
  kiosztHianyzoArakat,
  parseMaxKapcsolo,
  rendelesAzonosito,
  type BackfillOrderDoc,
  type Kiosztas,
  type RendelesTetel,
} from '../scripts/backfill-price-snapshot'

/**
 * Az ár-snapshot backfill (src/scripts/backfill-price-snapshot.ts) mérése.
 *
 * A teszt KIZÁRÓLAG memóriabeli fixtúrákon és INJEKTÁLT Payload-mockon
 * dolgozik: sem adatbázis-, sem hálózati hívás nincs benne (CLAUDE.md 15.
 * üzemeltetési tanulság). A script futtató része szándékosan csak közvetlen
 * indításkor fut le, az importálás mellékhatásmentes.
 *
 * A mért tulajdonságok:
 *  (a) a kiosztás mind a négy ága (egytételes; több tétel egy hiánnyal; több
 *      hiány; hiányzó/0/negatív végösszeg), plusz a nem egész osztás,
 *  (b) MEGLÉVŐ árat — akár 0-t — a script SOSEM ír felül,
 *  (c) PRÓBAFUTÁSBAN NULLA `payload.update` hívás megy ki (ez a legfontosabb
 *      őr: a mért hívásszám 0),
 *  (d) éles futásban a TELJES tételsor íródik vissza, megtartott
 *      sor-azonosítóval — részleges tömb tételsorokat veszítene el,
 *  (e) a script SOSEM a termék MAI árából dolgozik (viselkedés + forrás-őr),
 *  (f) a lapozás felső korlátos, és a csonkolást a jelentés kimondja.
 */

/**
 * Laza tétel-fixtúra. A generált `RendelesTetel` típusban a `quantity`
 * KÖTELEZŐ szám (a DB-oszlop `NOT NULL DEFAULT 1`), a script védőhálója
 * viszont a hiányzó mennyiséget is kezeli — ezt a fixtúra egyetlen,
 * dokumentált ponton engedi modellezni.
 */
interface LazaTetel {
  readonly id?: string | null
  readonly product?: number | null
  readonly quantity?: number | null
  readonly titleSnapshot?: string | null
  readonly priceHufSnapshot?: number | null
}

const tetel = (reszlet: LazaTetel): RendelesTetel => reszlet as RendelesTetel

const rendeles = (reszlet: Partial<BackfillOrderDoc> & { id: number }): BackfillOrderDoc => ({
  orderNumber: `KH-2026-${String(reszlet.id).padStart(6, '0')}`,
  status: 'paid',
  totalHufSnapshot: null,
  items: [],
  ...reszlet,
})

/** Lapozó Payload-mock: a `find` lapokra vágja a fixtúrát, az `update` csak számol. */
function keszitsPayloadMockot(rendelesek: readonly BackfillOrderDoc[]) {
  const find = vi.fn(async (args: { collection: string; page?: number; limit?: number }) => {
    const limit = args.limit ?? BACKFILL_LAPMERET
    const page = args.page ?? 1
    const kezdet = (page - 1) * limit
    const docs = rendelesek.slice(kezdet, kezdet + limit)
    return {
      docs,
      hasNextPage: kezdet + limit < rendelesek.length,
      totalDocs: rendelesek.length,
    }
  })
  const update = vi.fn(async () => ({}))
  return { find, update }
}

/** A `futtatBackfill` injektált függőségei — a Payload-mock a repó mintája szerint. */
const fuggosegek = (
  payload: { find: unknown; update: unknown },
  tovabbi: { dryRun: boolean; max?: number; lapmeret?: number },
) => ({ payload: payload as never, ...tovabbi })

describe('kiosztHianyzoArakat — egytételes rendelés', () => {
  it('az ár a végösszeg / mennyiség (1 db)', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 79500,
      items: [{ priceHufSnapshot: null, quantity: 1 }],
    })
    expect(eredmeny).toEqual({
      dontes: 'ir',
      arak: [{ index: 0, priceHuf: 79500 }],
      mennyisegek: [],
    })
  })

  it('több darabnál a végösszeg elosztódik a mennyiséggel', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 238500,
      items: [{ priceHufSnapshot: null, quantity: 3 }],
    })
    expect(eredmeny).toEqual({
      dontes: 'ir',
      arak: [{ index: 0, priceHuf: 79500 }],
      mennyisegek: [],
    })
  })

  it('hiányzó mennyiséget 1-nek vesz, és külön műveletként jelenti', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 12000,
      items: [{ priceHufSnapshot: null, quantity: null }],
    })
    expect(eredmeny).toEqual({
      dontes: 'ir',
      arak: [{ index: 0, priceHuf: 12000 }],
      mennyisegek: [{ index: 0, quantity: 1 }],
    })
  })

  it('nem egész forintra osztó végösszegnél KIHAGY — nem kerekít', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 10000,
      items: [{ priceHufSnapshot: null, quantity: 3 }],
    })
    expect(eredmeny.dontes).toBe('kihagy')
    expect(eredmeny).toMatchObject({ indok: 'nem-egesz-egysegar' })
  })
})

describe('kiosztHianyzoArakat — több tétel, PONTOSAN egy hiánnyal', () => {
  it('a maradék lesz az ár, ha osztható a mennyiséggel', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 199500,
      items: [
        { priceHufSnapshot: 120000, quantity: 1 },
        { priceHufSnapshot: null, quantity: 1 },
      ],
    })
    expect(eredmeny).toEqual({
      dontes: 'ir',
      arak: [{ index: 1, priceHuf: 79500 }],
      mennyisegek: [],
    })
  })

  it('a többi tétel ára × mennyisége számít a maradékba', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 259000,
      items: [
        { priceHufSnapshot: 50000, quantity: 2 },
        { priceHufSnapshot: null, quantity: 3 },
      ],
    })
    // 259 000 − 100 000 = 159 000; 159 000 / 3 = 53 000
    expect(eredmeny).toEqual({
      dontes: 'ir',
      arak: [{ index: 1, priceHuf: 53000 }],
      mennyisegek: [],
    })
  })

  it('nem osztható maradéknál KIHAGY', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 100001,
      items: [
        { priceHufSnapshot: 50000, quantity: 1 },
        { priceHufSnapshot: null, quantity: 2 },
      ],
    })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'nem-egesz-egysegar' })
  })

  it('nem pozitív maradéknál KIHAGY', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 50000,
      items: [
        { priceHufSnapshot: 50000, quantity: 1 },
        { priceHufSnapshot: null, quantity: 1 },
      ],
    })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'nem-pozitiv-maradek' })
  })
})

describe('kiosztHianyzoArakat — több hiány és hiányzó végösszeg', () => {
  it('KÉT hiányzó árnál KIHAGY (a szétosztás kitalált adat lenne)', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 199500,
      items: [
        { priceHufSnapshot: null, quantity: 1 },
        { priceHufSnapshot: null, quantity: 1 },
      ],
    })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'tobb-hianyzo-ar' })
  })

  it.each([
    ['hiányzó (null)', null],
    ['undefined', undefined],
    ['nulla', 0],
    ['negatív', -1000],
  ])('%s végösszegnél KIHAGY', (_nev, vegosszeg) => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: vegosszeg,
      items: [{ priceHufSnapshot: null, quantity: 1 }],
    })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'hianyzo-vegosszeg' })
  })

  it('tétel nélküli, de pozitív végösszegű rendelést nevesítve jelent', () => {
    const eredmeny = kiosztHianyzoArakat({ totalHufSnapshot: 79500, items: [] })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'nincs-tetel' })
  })

  it('tétel és végösszeg nélkül nincs teendő', () => {
    expect(kiosztHianyzoArakat({ totalHufSnapshot: null, items: [] })).toEqual({
      dontes: 'nincs-teendo',
    })
  })

  it('jelen lévő, nem pozitív mennyiségnél KIHAGY (min:1 validáció + kitalált adat)', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 79500,
      items: [{ priceHufSnapshot: null, quantity: 0 }],
    })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'ervenytelen-mennyiseg' })
  })

  it('negatív meglévő tételárnál KIHAGY', () => {
    const eredmeny = kiosztHianyzoArakat({
      totalHufSnapshot: 79500,
      items: [
        { priceHufSnapshot: -1000, quantity: 1 },
        { priceHufSnapshot: null, quantity: 1 },
      ],
    })
    expect(eredmeny).toMatchObject({ dontes: 'kihagy', indok: 'ervenytelen-ar' })
  })
})

describe('kiosztHianyzoArakat — meglévő értéket SOSEM ír felül', () => {
  it('a 0 Ft ÉRVÉNYES ár (ingyenes kurzus): nincs teendő', () => {
    expect(
      kiosztHianyzoArakat({
        totalHufSnapshot: 79500,
        items: [{ priceHufSnapshot: 0, quantity: 1 }],
      }),
    ).toEqual({ dontes: 'nincs-teendo' })
  })

  it('meglévő, a végösszegtől ELTÉRŐ ár is érintetlen marad', () => {
    expect(
      kiosztHianyzoArakat({
        totalHufSnapshot: 79500,
        items: [{ priceHufSnapshot: 12345, quantity: 1 }],
      }),
    ).toEqual({ dontes: 'nincs-teendo' })
  })

  it('több tételnél is: ha mindegyiknek van ára, nincs teendő', () => {
    expect(
      kiosztHianyzoArakat({
        totalHufSnapshot: 1,
        items: [
          { priceHufSnapshot: 0, quantity: 1 },
          { priceHufSnapshot: 199500, quantity: 2 },
        ],
      }),
    ).toEqual({ dontes: 'nincs-teendo' })
  })
})

describe('epitsdVisszairandoTeteleket', () => {
  const kiosztas: Extract<Kiosztas, { dontes: 'ir' }> = {
    dontes: 'ir',
    arak: [{ index: 1, priceHuf: 79500 }],
    mennyisegek: [{ index: 0, quantity: 1 }],
  }

  it('a TELJES tömböt adja vissza, megtartott sor-azonosítóval és mezőkkel', () => {
    const eredmeny = epitsdVisszairandoTeteleket(
      [
        tetel({
          id: 'sor-a',
          product: 7,
          quantity: null,
          titleSnapshot: 'SKU-A',
          priceHufSnapshot: 120000,
        }),
        tetel({
          id: 'sor-b',
          product: 9,
          quantity: 1,
          titleSnapshot: 'SKU-B',
          priceHufSnapshot: null,
        }),
      ],
      kiosztas,
    )
    expect(eredmeny).toEqual([
      { id: 'sor-a', product: 7, quantity: 1, titleSnapshot: 'SKU-A', priceHufSnapshot: 120000 },
      { id: 'sor-b', product: 9, quantity: 1, titleSnapshot: 'SKU-B', priceHufSnapshot: 79500 },
    ])
  })

  it('a kiosztásban NEM szereplő tételhez hozzá sem ér', () => {
    const eredeti = tetel({
      id: 'x',
      product: 3,
      quantity: 2,
      titleSnapshot: 'SKU-X',
      priceHufSnapshot: 0,
    })
    const [eredmeny] = epitsdVisszairandoTeteleket([eredeti], {
      dontes: 'ir',
      arak: [],
      mennyisegek: [],
    })
    expect(eredmeny).toEqual(eredeti)
  })
})

describe('futtatBackfill — PRÓBAFUTÁS (a legfontosabb őr)', () => {
  it('NULLA payload.update hívás megy ki, miközben mindent kiszámol', async () => {
    const { find, update } = keszitsPayloadMockot([
      rendeles({
        id: 1,
        totalHufSnapshot: 79500,
        items: [tetel({ id: 'a', product: 1, quantity: 1, priceHufSnapshot: null })],
      }),
      rendeles({
        id: 2,
        totalHufSnapshot: 199500,
        items: [
          tetel({ id: 'b', product: 1, quantity: 1, priceHufSnapshot: 120000 }),
          tetel({ id: 'c', product: 2, quantity: 1, priceHufSnapshot: null }),
        ],
      }),
      rendeles({
        id: 3,
        totalHufSnapshot: null,
        items: [tetel({ id: 'd', product: 1, quantity: 1, priceHufSnapshot: null })],
      }),
    ])

    const jelentes = await futtatBackfill(fuggosegek({ find, update }, { dryRun: true }))

    // A MÉRT hívásszám — ez a kapu bizonyítéka.
    expect(update).toHaveBeenCalledTimes(0)
    expect(update.mock.calls).toHaveLength(0)

    expect(jelentes.dryRun).toBe(true)
    expect(jelentes.megnezettRendelesek).toBe(3)
    expect(jelentes.erintettRendelesek).toBe(2)
    expect(jelentes.arIrasok).toBe(2)
    expect(jelentes.kihagyottak).toHaveLength(1)
    expect(jelentes.kihagyottak[0]).toMatchObject({ indok: 'hianyzo-vegosszeg' })
  })

  it('a beolvasás nem használ korlátlan lekérdezést, és nem kér tulajdonos-only mezőt', async () => {
    const { find, update } = keszitsPayloadMockot([rendeles({ id: 1 })])
    await futtatBackfill(fuggosegek({ find, update }, { dryRun: true }))

    expect(find).toHaveBeenCalled()
    for (const [args] of find.mock.calls) {
      const hivas = args as {
        collection: string
        limit?: number
        select?: Record<string, unknown>
        depth?: number
      }
      expect(hivas.collection).toBe('orders')
      expect(hivas.limit).toBeGreaterThan(0)
      expect(hivas.depth).toBe(0)
      expect(hivas.select).toBeDefined()
      for (const tiltott of [
        'refunds',
        'customerSnapshot',
        'ipAddress',
        'invoiceNumber',
        'barionPaymentId',
      ]) {
        expect(hivas.select).not.toHaveProperty(tiltott)
      }
    }
  })
})

describe('futtatBackfill — ÉLES futás', () => {
  it('rendelésenként EGY update megy ki, a TELJES tételsorral', async () => {
    const { find, update } = keszitsPayloadMockot([
      rendeles({
        id: 11,
        totalHufSnapshot: 199500,
        items: [
          tetel({
            id: 'b',
            product: 1,
            quantity: 1,
            titleSnapshot: 'SKU-B',
            priceHufSnapshot: 120000,
          }),
          tetel({
            id: 'c',
            product: 2,
            quantity: 1,
            titleSnapshot: 'SKU-C',
            priceHufSnapshot: null,
          }),
        ],
      }),
    ])

    const jelentes = await futtatBackfill(fuggosegek({ find, update }, { dryRun: false }))

    expect(update).toHaveBeenCalledTimes(1)
    const [args] = update.mock.calls[0] as unknown as [
      {
        collection: string
        id: number
        overrideAccess?: boolean
        data: { items: RendelesTetel[] }
      },
    ]
    expect(args.collection).toBe('orders')
    expect(args.id).toBe(11)
    expect(args.overrideAccess).toBe(true)
    // A teljes tömb, megtartott azonosítóval — részleges írás sorokat veszítene.
    expect(args.data.items).toEqual([
      { id: 'b', product: 1, quantity: 1, titleSnapshot: 'SKU-B', priceHufSnapshot: 120000 },
      { id: 'c', product: 2, quantity: 1, titleSnapshot: 'SKU-C', priceHufSnapshot: 79500 },
    ])
    expect(jelentes.erintettRendelesek).toBe(1)
    expect(jelentes.irasHibak).toHaveLength(0)
  })

  it('a meglévő árat a KIÍRT adatban sem változtatja meg', async () => {
    const { find, update } = keszitsPayloadMockot([
      rendeles({
        id: 12,
        totalHufSnapshot: 5000,
        items: [
          tetel({ id: 'e', product: 1, quantity: 1, priceHufSnapshot: 0 }),
          tetel({ id: 'f', product: 2, quantity: 1, priceHufSnapshot: null }),
        ],
      }),
    ])

    await futtatBackfill(fuggosegek({ find, update }, { dryRun: false }))

    const [args] = update.mock.calls[0] as unknown as [{ data: { items: RendelesTetel[] } }]
    expect(args.data.items[0]?.priceHufSnapshot).toBe(0)
    expect(args.data.items[1]?.priceHufSnapshot).toBe(5000)
  })

  it('kihagyott rendelésre NEM megy ki update', async () => {
    const { find, update } = keszitsPayloadMockot([
      rendeles({
        id: 13,
        totalHufSnapshot: 100,
        items: [
          tetel({ id: 'g', product: 1, quantity: 1, priceHufSnapshot: null }),
          tetel({ id: 'h', product: 2, quantity: 1, priceHufSnapshot: null }),
        ],
      }),
    ])

    const jelentes = await futtatBackfill(fuggosegek({ find, update }, { dryRun: false }))

    expect(update).toHaveBeenCalledTimes(0)
    expect(jelentes.kihagyottak).toEqual([
      expect.objectContaining({ azonosito: 'KH-2026-000013', indok: 'tobb-hianyzo-ar' }),
    ])
  })

  it('írási hibánál nem növeli a sikeres darabszámot, és jelenti a hibát', async () => {
    const { find } = keszitsPayloadMockot([
      rendeles({
        id: 14,
        totalHufSnapshot: 1000,
        items: [tetel({ id: 'i', product: 1, quantity: 1, priceHufSnapshot: null })],
      }),
    ])
    const update = vi.fn(async () => {
      throw new Error('sorzár')
    })

    const jelentes = await futtatBackfill(fuggosegek({ find, update }, { dryRun: false }))

    expect(jelentes.erintettRendelesek).toBe(0)
    expect(jelentes.arIrasok).toBe(0)
    expect(jelentes.irasHibak).toEqual([{ azonosito: 'KH-2026-000014', hiba: 'sorzár' }])
  })

  it('SOSEM olvas terméket: minden lekérdezés az orders collectionre megy', async () => {
    const { find, update } = keszitsPayloadMockot([
      rendeles({
        id: 15,
        totalHufSnapshot: 1000,
        items: [tetel({ id: 'j', product: 1, quantity: 1, priceHufSnapshot: null })],
      }),
    ])
    await futtatBackfill(fuggosegek({ find, update }, { dryRun: false }))
    const collectionok = find.mock.calls.map(
      ([args]) => (args as { collection: string }).collection,
    )
    expect(new Set(collectionok)).toEqual(new Set(['orders']))
  })
})

describe('futtatBackfill — a beolvasás KIZÁRÓLAG fizetett rendelésekre megy', () => {
  /**
   * Vezetői döntés (2026-08-21): a backfill csak `paid` rendelést ír.
   *
   * Nem kényelmi szűrés. A Payload tömb-írása az adatbázisban törlés +
   * újraszúrás, tehát minden megírt rendelés egy-egy alkalom a hibára az éles
   * tételsorokon. A bevétel-riport kurzus-bontása — vagyis a backfill EGYETLEN
   * célja — kizárólag `paid` rendelést számol, tehát a többi státusz megírása
   * egyetlen megjelenített számot sem javítana.
   */
  it('a find where-feltétele status = paid', async () => {
    const { find, update } = keszitsPayloadMockot([
      rendeles({ id: 1, totalHufSnapshot: 79_500, items: [{ id: 'a', quantity: 1 }] }),
    ])
    await futtatBackfill(fuggosegek({ find, update }, { dryRun: true }))

    expect(find).toHaveBeenCalled()
    for (const [args] of find.mock.calls) {
      const hivas = args as { where?: unknown }
      expect(hivas.where, 'a beolvasás szűrő NÉLKÜL futott — minden státuszt megírna').toEqual({
        status: { equals: 'paid' },
      })
    }
  })
})

describe('futtatBackfill — lapozás felső korláttal', () => {
  it('több lapon olvas, és a korlát alatt NEM jelez csonkolást', async () => {
    const sokRendeles = Array.from({ length: 5 }, (_ertek, index) => rendeles({ id: index + 1 }))
    const { find, update } = keszitsPayloadMockot(sokRendeles)

    const jelentes = await futtatBackfill(
      fuggosegek({ find, update }, { dryRun: true, lapmeret: 2, max: 100 }),
    )

    expect(find).toHaveBeenCalledTimes(3)
    expect(jelentes.megnezettRendelesek).toBe(5)
    expect(jelentes.csonkolt).toBe(false)
  })

  it('a felső korlátnál csonkol, és ezt a jelentés KIMONDJA', async () => {
    const sokRendeles = Array.from({ length: 10 }, (_ertek, index) => rendeles({ id: index + 1 }))
    const { find, update } = keszitsPayloadMockot(sokRendeles)

    const jelentes = await futtatBackfill(
      fuggosegek({ find, update }, { dryRun: true, lapmeret: 2, max: 4 }),
    )

    expect(jelentes.csonkolt).toBe(true)
    expect(jelentes.megnezettRendelesek).toBe(4)
    expect(formazdJelentest(jelentes).join('\n')).toContain('CSONKOLT BEOLVASÁS')
  })
})

describe('formazdJelentest', () => {
  it('a kihagyottakat indokonként, azonosítóval és magyarázattal sorolja fel', () => {
    const sorok = formazdJelentest({
      dryRun: true,
      megnezettRendelesek: 3,
      felsoKorlat: 20000,
      csonkolt: false,
      erintettRendelesek: 1,
      arIrasok: 1,
      mennyisegIrasok: 0,
      nincsTeendo: 1,
      kihagyottak: [
        {
          azonosito: 'KH-2026-000042',
          status: 'paid',
          indok: 'tobb-hianyzo-ar',
          reszlet: '2 tételnél hiányzik az ár',
        },
      ],
      irasHibak: [],
    })
    const szoveg = sorok.join('\n')
    expect(szoveg).toContain('PRÓBAFUTÁS')
    expect(szoveg).toContain('ÍRNA: 1 rendelés')
    expect(szoveg).toContain('KH-2026-000042')
    expect(szoveg).toContain('kitalált adat lenne')
    expect(szoveg).toContain('OWNER_BACKFILL_CONFIRM=igen')
    expect(szoveg).toContain('npm run backup:db')
  })

  it('éles futásnál nem ígér próbafutást', () => {
    const szoveg = formazdJelentest({
      dryRun: false,
      megnezettRendelesek: 1,
      felsoKorlat: 20000,
      csonkolt: false,
      erintettRendelesek: 1,
      arIrasok: 1,
      mennyisegIrasok: 1,
      nincsTeendo: 0,
      kihagyottak: [],
      irasHibak: [],
    }).join('\n')
    expect(szoveg).toContain('ÍRT: 1 rendelés')
    expect(szoveg).not.toContain('SEMMI nem íródott')
  })
})

describe('segédfüggvények', () => {
  it('a rendelés-azonosító a rendelésszám, hiányában a #id', () => {
    expect(rendelesAzonosito(7, 'KH-2026-000007')).toBe('KH-2026-000007')
    expect(rendelesAzonosito(7, null)).toBe('#7')
    expect(rendelesAzonosito(7, '   ')).toBe('#7')
  })

  it('a --max kapcsoló csak pozitív egészt fogad el', () => {
    expect(parseMaxKapcsolo([], 100)).toBe(100)
    expect(parseMaxKapcsolo(['--max=5000'], 100)).toBe(5000)
    expect(parseMaxKapcsolo(['--max=0'], 100)).toBe(100)
    expect(parseMaxKapcsolo(['--max=abc'], 100)).toBe(100)
    expect(parseMaxKapcsolo(['--max=-5'], 100)).toBe(100)
  })
})

describe('forrás-őr: a termék MAI ára TILOS forrás', () => {
  it('a script VÉGREHAJTHATÓ kódja nem hivatkozik a products árára és nem olvas products collectiont', () => {
    const forras = readFileSync(
      fileURLToPath(new URL('../scripts/backfill-price-snapshot.ts', import.meta.url)),
      'utf8',
    )
    // A kommentek KIMARADNAK az ellenőrzésből: a modul fejléce szándékosan
    // NEVESÍTI a tiltott forrást („SOHA a termék mai árából"), és ezt a
    // magyarázatot nem szabad a szabály kedvéért kivenni. A vizsgálat a
    // kommentek nélküli, végrehajtható kódra megy. (A fájlban nincs olyan
    // string vagy reguláris kifejezés, amely `//`-t vagy `/*`-ot tartalmazna,
    // ezért ez az egyszerű szűrés itt pontos.)
    const kod = forras.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
    // A tiltott mintákat összefűzött stringből építjük, hogy maga az őr se
    // bukjon meg a saját szabályán.
    expect(kod).not.toContain('priceIn' + 'HUF')
    expect(kod).not.toContain("collection: '" + "products'")
    // A vezérlés tényleg csak az orders collectiont olvassa.
    expect(kod).toContain("collection: '" + "orders'")
  })
})
