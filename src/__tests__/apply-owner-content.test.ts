import { describe, expect, it } from 'vitest'

import {
  KURZUS_ELONYOK,
  REGI_KURZUS_SZEKCIO_CIM,
  REGI_PACIENS_ERTEK,
  SZAKMAI_HATTER_HORGONY,
  UJ_KURZUS_SZEKCIO_CIM,
  UJ_PACIENS_ERTEK,
  alkalmazKezdolapJavitasok,
  alkalmazKurzusElonyok,
  alkalmazRolunkHeroKep,
  alkalmazSzakmaiHarmonika,
  heroKepAzonosito,
  rolunkSzakmaiUjBlokkok,
  stabilJson,
} from '../scripts/apply-owner-content'
import { rolunkSzakmaiOrokoltTartalom } from '../scripts/restore-legacy-content'
import type { Media, Page, Product } from '../payload-types'

/**
 * A tulajdonos által jóváhagyott, egyszeri tartalom-javítások TISZTA
 * átalakításai (src/scripts/apply-owner-content.ts).
 *
 * A teszt kizárólag memóriabeli fixtúrákon dolgozik: sem adatbázis-, sem
 * hálózati hívás nincs benne (CLAUDE.md 15. üzemeltetési tanulság) — a script
 * futtató része szándékosan csak közvetlen indításkor fut le, az importálás
 * mellékhatásmentes.
 *
 * A négy mért tulajdonság:
 *  (a) a szekció-cím CSAK pontos egyezésnél cserélődik,
 *  (b) az „5000+” CSAK pontos egyezésnél és CSAK a statisztika-értékben,
 *  (c) az előny-sorok CSAK üres mezőbe kerülnek be,
 *  (d) a /rolunk fejléc-képe CSAK a szóló portréról cserélődik, és a páros
 *      csapatfotó hiányában hangosan kimarad,
 *  (e) idempotencia: kétszer futtatva ugyanaz a tartalom jön ki.
 */

type Szekciosor = NonNullable<Page['layout']>
type Szekcio = Szekciosor[number]

/** Kurzuskártya-szekció a megadott címmel (a `heading` szándékosan felülírható `null`-ra). */
const kurzusSzekcio = (heading: string | null): Szekcio => ({
  blockType: 'courseCards',
  id: 'cc-1',
  heading,
  lead: 'Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig.',
  sectionSettings: { visible: true, anchorId: 'kurzusok', hatter: 'feher' },
})

/** Rólunk-szekció a megadott statisztika-sorokkal. */
const rolunkSzekcio = (stats: { value: string; label: string }[]): Szekcio => ({
  blockType: 'about',
  id: 'ab-1',
  eyebrow: 'Rólunk',
  title: 'Kiss Kata és Kocsis Kata vagyunk',
  stats,
  sectionSettings: { visible: true, hatter: 'feher' },
})

/** Érintetlenül hagyandó szekció — a fixtúrákban a „többi blokk” képviselője. */
const heroSzekcio = (): Szekcio => ({
  blockType: 'filmHero',
  id: 'fh-1',
  // Az „5000+” itt SZÁNDÉKOSAN benne van: más mezőben állva sem cserélhető.
  title: `Hatékony módszerek ${REGI_PACIENS_ERTEK} elégedett páciens tapasztalatából`,
  lead: 'Professzionális, mégis emberközeli terápiás megoldások.',
  sectionSettings: { visible: true },
})

// ---------------------------------------------------------------------------
// (a) Kurzus-szekció címe — csak pontos egyezésnél
// ---------------------------------------------------------------------------

describe('alkalmazKezdolapJavitasok — kurzus-szekció címe', () => {
  it('pontos egyezésnél átírja a címet, és csak azt az egy blokkot cseréli le', () => {
    const hero = heroSzekcio()
    const layout: Szekciosor = [hero, kurzusSzekcio(REGI_KURZUS_SZEKCIO_CIM)]

    const eredmeny = alkalmazKezdolapJavitasok(layout)

    expect(eredmeny.modositasok).toHaveLength(1)
    expect(eredmeny.modositasok[0].szabaly).toBe('kurzus-szekcio-cim')
    expect(eredmeny.modositasok[0].indok).toBeNull()
    const ujSzekcio = eredmeny.layout[1]
    expect(ujSzekcio.blockType === 'courseCards' ? ujSzekcio.heading : null).toBe(
      UJ_KURZUS_SZEKCIO_CIM,
    )
    // A többi szekció BITRE változatlan: ugyanaz az objektum-referencia.
    expect(eredmeny.layout[0]).toBe(hero)
    // A cserélt blokk minden más mezője is megmarad.
    expect(ujSzekcio.blockType === 'courseCards' ? ujSzekcio.sectionSettings : null).toEqual({
      visible: true,
      anchorId: 'kurzusok',
      hatter: 'feher',
    })
  })

  it.each([
    ['más cím', 'Kurzusaink'],
    ['üres szöveg', ''],
    ['körbeírt whitespace', ` ${REGI_KURZUS_SZEKCIO_CIM} `],
    ['kisbetűs változat', REGI_KURZUS_SZEKCIO_CIM.toLowerCase()],
    ['részlet', 'Így tudunk segíteni'],
  ])('nem nyúl hozzá (%s), és indokkal naplózza a kihagyást', (_eset, heading) => {
    const layout: Szekciosor = [kurzusSzekcio(heading)]

    const eredmeny = alkalmazKezdolapJavitasok(layout)

    expect(eredmeny.modositasok).toHaveLength(0)
    // A layout referenciája is változatlan, ha semmi nem módosult.
    expect(eredmeny.layout).toBe(layout)
    const kihagyas = eredmeny.kihagyasok.find((lepes) => lepes.szabaly === 'kurzus-szekcio-cim')
    expect(kihagyas?.indok).toContain('pontos egyezésnél')
  })

  it('hiányzó (null) címet sem tölt ki — az a beépített cím fallbackje', () => {
    const eredmeny = alkalmazKezdolapJavitasok([kurzusSzekcio(null)])

    expect(eredmeny.modositasok).toHaveLength(0)
    expect(
      eredmeny.kihagyasok.find((lepes) => lepes.szabaly === 'kurzus-szekcio-cim')?.indok,
    ).toContain('nincs megadva')
  })

  it('kurzus-szekció nélküli szekciósornál indokolt kihagyást ad', () => {
    const eredmeny = alkalmazKezdolapJavitasok([heroSzekcio()])

    expect(eredmeny.modositasok).toHaveLength(0)
    expect(
      eredmeny.kihagyasok.find((lepes) => lepes.szabaly === 'kurzus-szekcio-cim')?.indok,
    ).toContain('nincs Kurzuskártyák')
  })

  it('üres vagy hiányzó szekciósornál mindkét kezdőlapi javítást indokkal hagyja ki', () => {
    for (const layout of [undefined, null, [] as Szekciosor]) {
      const eredmeny = alkalmazKezdolapJavitasok(layout)

      expect(eredmeny.modositasok).toHaveLength(0)
      expect(eredmeny.layout).toEqual([])
      expect(eredmeny.kihagyasok.map((lepes) => lepes.szabaly)).toEqual([
        'kurzus-szekcio-cim',
        'paciens-szam',
      ])
      for (const kihagyas of eredmeny.kihagyasok) {
        expect(kihagyas.indok).toContain('nincs szekciósora')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// (b) Páciensszám — csak pontos egyezésnél és csak a megfelelő mezőben
// ---------------------------------------------------------------------------

describe('alkalmazKezdolapJavitasok — páciensszám', () => {
  it('a statisztika ÉRTÉKÉT cseréli, a többi statisztika-sort érintetlenül hagyja', () => {
    const layout: Szekciosor = [
      rolunkSzekcio([
        { value: '10+', label: 'év szakmai tapasztalat' },
        { value: REGI_PACIENS_ERTEK, label: 'elégedett páciens' },
        { value: '1', label: 'közös cél: az Ön mozgásszabadsága' },
      ]),
    ]

    const eredmeny = alkalmazKezdolapJavitasok(layout)

    expect(eredmeny.modositasok).toHaveLength(1)
    expect(eredmeny.modositasok[0].szabaly).toBe('paciens-szam')
    const blokk = eredmeny.layout[0]
    expect(blokk.blockType === 'about' ? blokk.stats : null).toEqual([
      { value: '10+', label: 'év szakmai tapasztalat' },
      { value: UJ_PACIENS_ERTEK, label: 'elégedett páciens' },
      { value: '1', label: 'közös cél: az Ön mozgásszabadsága' },
    ])
  })

  it('mind a két előfordulást javítja, ha a szekciósorban két Rólunk-blokk áll', () => {
    const layout: Szekciosor = [
      rolunkSzekcio([{ value: REGI_PACIENS_ERTEK, label: 'elégedett páciens' }]),
      heroSzekcio(),
      rolunkSzekcio([{ value: REGI_PACIENS_ERTEK, label: 'elégedett páciens' }]),
    ]

    const eredmeny = alkalmazKezdolapJavitasok(layout)

    expect(eredmeny.modositasok).toHaveLength(2)
    const ertekek = eredmeny.layout.flatMap((blokk) =>
      blokk.blockType === 'about' ? (blokk.stats ?? []).map((sor) => sor.value) : [],
    )
    expect(ertekek).toEqual([UJ_PACIENS_ERTEK, UJ_PACIENS_ERTEK])
  })

  it('NEM cseréli a „Mit jelent” (label) mezőben álló azonos szöveget', () => {
    const layout: Szekciosor = [rolunkSzekcio([{ value: '1000+', label: REGI_PACIENS_ERTEK }])]

    const eredmeny = alkalmazKezdolapJavitasok(layout)

    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.layout).toBe(layout)
    expect(eredmeny.kihagyasok.find((lepes) => lepes.szabaly === 'paciens-szam')?.indok).toContain(
      'egyetlen statisztika-értéke sem',
    )
  })

  it('NEM cseréli más blokk szövegmezőjében álló „5000+”-t', () => {
    const hero = heroSzekcio()

    const eredmeny = alkalmazKezdolapJavitasok([hero])

    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.layout[0]).toBe(hero)
  })

  it.each([
    ['szám a plusz nélkül', '5000'],
    ['szóközzel', '5000 +'],
    ['körbeírt whitespace', ` ${REGI_PACIENS_ERTEK} `],
    ['ezres tagolás', '5 000+'],
    ['már javított érték', UJ_PACIENS_ERTEK],
  ])('nem cseréli a nem pontos egyezést (%s)', (_eset, value) => {
    const layout: Szekciosor = [rolunkSzekcio([{ value, label: 'elégedett páciens' }])]

    const eredmeny = alkalmazKezdolapJavitasok(layout)

    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.layout).toBe(layout)
  })

  it('statisztika nélküli Rólunk-blokkot érintetlenül továbbad', () => {
    const blokk = rolunkSzekcio([])

    const eredmeny = alkalmazKezdolapJavitasok([blokk])

    expect(eredmeny.layout[0]).toBe(blokk)
    expect(eredmeny.modositasok).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// (c) Kurzus előny-sorai — csak üres mezőbe
// ---------------------------------------------------------------------------

describe('alkalmazKurzusElonyok', () => {
  it.each([
    ['hiányzó mező', undefined],
    ['null érték', null],
    ['üres tömb', []],
    ['csak whitespace-sorok', [{ text: '   ' }, { text: '' }]],
  ])(
    'üres mezőt (%s) tölti fel a három jóváhagyott sorral, sorrendhelyesen',
    (_eset, jelenlegi) => {
      const eredmeny = alkalmazKurzusElonyok(jelenlegi as Product['cardHighlights'])

      expect(eredmeny.cardHighlights).toEqual([
        { text: '4 modulnyi videóanyag' },
        { text: '50+ videós gyakorlat' },
        { text: '5 perces miniblokkok' },
      ])
      expect(eredmeny.cardHighlights?.map((sor) => sor.text)).toEqual([...KURZUS_ELONYOK])
      expect(eredmeny.modositasok).toHaveLength(1)
      expect(eredmeny.kihagyasok).toHaveLength(0)
    },
  )

  it('a mező maxRows plafonját (3) nem lépi túl', () => {
    expect(KURZUS_ELONYOK).toHaveLength(3)
  })

  it('meglévő tartalomhoz nem nyúl, és indokkal naplózza a kihagyást', () => {
    const eredmeny = alkalmazKurzusElonyok([{ text: 'Saját szerkesztői sor', id: 'x1' }])

    expect(eredmeny.cardHighlights).toBeNull()
    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.kihagyasok).toHaveLength(1)
    expect(eredmeny.kihagyasok[0].szabaly).toBe('kurzus-elonyok')
    expect(eredmeny.kihagyasok[0].indok).toContain('Saját szerkesztői sor')
    expect(eredmeny.kihagyasok[0].indok).toContain('sosem ír felül')
  })

  it('egyetlen kitöltött sor is elég a kihagyáshoz (részleges tartalom sem egészül ki)', () => {
    const eredmeny = alkalmazKurzusElonyok([{ text: '  ' }, { text: '50+ videós gyakorlat' }])

    expect(eredmeny.cardHighlights).toBeNull()
    expect(eredmeny.kihagyasok).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// (d) A /rolunk fejléc-képe — csak a szóló portréról
// ---------------------------------------------------------------------------

/** A `heroImage` populált alakja (mélyebb lekérdezésnél a teljes Media dokumentum). */
const mediaDokumentum = (id: number, filename: string): Media => ({
  id,
  alt: 'Kiss Kata és Kocsis Kata, a KinetiCare gyógytornászai',
  filename,
  updatedAt: '2026-08-16T00:00:00.000Z',
  createdAt: '2026-08-16T00:00:00.000Z',
})

describe('heroKepAzonosito', () => {
  it('mindkét alakból (azonosító és populált dokumentum) az azonosítót adja', () => {
    expect(heroKepAzonosito(41)).toBe(41)
    expect(heroKepAzonosito(mediaDokumentum(41, 'katak-team.webp'))).toBe(41)
  })

  it('üres mezőre null-t ad', () => {
    expect(heroKepAzonosito(null)).toBeNull()
    expect(heroKepAzonosito(undefined)).toBeNull()
  })
})

describe('alkalmazRolunkHeroKep', () => {
  it('a szóló portréról a páros csapatfotóra cserél', () => {
    const eredmeny = alkalmazRolunkHeroKep({
      jelenlegi: 41,
      regiMediaId: 41,
      ujMediaId: 77,
    })

    expect(eredmeny.heroImage).toBe(77)
    expect(eredmeny.modositasok).toHaveLength(1)
    expect(eredmeny.modositasok[0].szabaly).toBe('rolunk-hero-kep')
    expect(eredmeny.modositasok[0].indok).toBeNull()
    expect(eredmeny.kihagyasok).toHaveLength(0)
  })

  it('populált (depth > 0) heroImage esetén is felismeri a szóló portrét', () => {
    const eredmeny = alkalmazRolunkHeroKep({
      jelenlegi: mediaDokumentum(41, '682a121babe80_IMG_7573.webp'),
      regiMediaId: 41,
      ujMediaId: 77,
    })

    expect(eredmeny.heroImage).toBe(77)
  })

  it('MÁS képre mutató fejléc-képhez nem nyúl, és indokkal naplózza', () => {
    const eredmeny = alkalmazRolunkHeroKep({
      jelenlegi: 99,
      regiMediaId: 41,
      ujMediaId: 77,
    })

    expect(eredmeny.heroImage).toBeNull()
    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.kihagyasok[0].indok).toContain('csak pontos egyezésnél')
    expect(eredmeny.kihagyasok[0].hangos).toBe(false)
  })

  it('ÜRES fejléc-kép mezőt nem tölt ki', () => {
    for (const jelenlegi of [null, undefined]) {
      const eredmeny = alkalmazRolunkHeroKep({ jelenlegi, regiMediaId: 41, ujMediaId: 77 })

      expect(eredmeny.heroImage).toBeNull()
      expect(eredmeny.kihagyasok[0].indok).toContain('nincs fejléc-képe')
    }
  })

  it('a páros csapatfotó hiányában HANGOSAN hagyja ki a lépést', () => {
    const eredmeny = alkalmazRolunkHeroKep({
      jelenlegi: 41,
      regiMediaId: 41,
      ujMediaId: null,
    })

    expect(eredmeny.heroImage).toBeNull()
    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.kihagyasok).toHaveLength(1)
    expect(eredmeny.kihagyasok[0].hangos).toBe(true)
    expect(eredmeny.kihagyasok[0].indok).toContain('katak-team')
  })

  it('a szóló portré média-rekordjának hiányában is hangosan kimarad', () => {
    const eredmeny = alkalmazRolunkHeroKep({
      jelenlegi: 99,
      regiMediaId: null,
      ujMediaId: 77,
    })

    expect(eredmeny.heroImage).toBeNull()
    expect(eredmeny.kihagyasok[0].hangos).toBe(true)
    expect(eredmeny.kihagyasok[0].indok).toContain('682a121babe80_IMG_7573')
  })
})

// ---------------------------------------------------------------------------
// (e) Idempotencia
// ---------------------------------------------------------------------------

describe('idempotencia — kétszer futtatva ugyanaz jön ki', () => {
  it('a szekciósor a második futásra már nem változik', () => {
    const layout: Szekciosor = [
      heroSzekcio(),
      kurzusSzekcio(REGI_KURZUS_SZEKCIO_CIM),
      rolunkSzekcio([
        { value: '10+', label: 'év szakmai tapasztalat' },
        { value: REGI_PACIENS_ERTEK, label: 'elégedett páciens' },
      ]),
    ]

    const elso = alkalmazKezdolapJavitasok(layout)
    expect(elso.modositasok).toHaveLength(2)

    const masodik = alkalmazKezdolapJavitasok(elso.layout)

    expect(masodik.modositasok).toHaveLength(0)
    expect(masodik.layout).toBe(elso.layout)
    expect(masodik.layout).toEqual(elso.layout)
    // A második futás minden kihagyást megindokol.
    expect(masodik.kihagyasok.length).toBeGreaterThan(0)
    for (const kihagyas of masodik.kihagyasok) {
      expect(kihagyas.indok).not.toBeNull()
    }
  })

  it('a bemeneti szekciósort nem módosítja helyben (a hívó adata érintetlen)', () => {
    const layout: Szekciosor = [
      kurzusSzekcio(REGI_KURZUS_SZEKCIO_CIM),
      rolunkSzekcio([{ value: REGI_PACIENS_ERTEK, label: 'elégedett páciens' }]),
    ]
    const masolat = structuredClone(layout)

    alkalmazKezdolapJavitasok(layout)

    expect(layout).toEqual(masolat)
  })

  it('az előny-sorok a második futásra már nem íródnak be újra', () => {
    const elso = alkalmazKurzusElonyok(undefined)
    expect(elso.cardHighlights).not.toBeNull()

    const masodik = alkalmazKurzusElonyok(elso.cardHighlights)

    expect(masodik.cardHighlights).toBeNull()
    expect(masodik.modositasok).toHaveLength(0)
    expect(masodik.kihagyasok).toHaveLength(1)
  })

  it('a /rolunk fejléc-képe a második futásra már nem cserélődik', () => {
    const elso = alkalmazRolunkHeroKep({ jelenlegi: 41, regiMediaId: 41, ujMediaId: 77 })
    expect(elso.heroImage).toBe(77)

    const masodik = alkalmazRolunkHeroKep({
      jelenlegi: elso.heroImage,
      regiMediaId: 41,
      ujMediaId: 77,
    })

    expect(masodik.heroImage).toBeNull()
    expect(masodik.modositasok).toHaveLength(0)
    expect(masodik.kihagyasok).toHaveLength(1)
    expect(masodik.kihagyasok[0].hangos).toBe(false)
    expect(masodik.kihagyasok[0].indok).toContain('MÁR a páros csapatfotó')
  })
})

// ---------------------------------------------------------------------------
// 5. javítás — a szakmai háttér harmonikába szervezése
// ---------------------------------------------------------------------------

/** Kulcs-sorrend megfordítása rekurzívan — a jsonb-átrendezés szimulálása. */
const forditottKulcsrend = (ertek: unknown): unknown => {
  if (Array.isArray(ertek)) {
    return ertek.map(forditottKulcsrend)
  }
  if (ertek !== null && typeof ertek === 'object') {
    const forras = ertek as Record<string, unknown>
    const eredmeny: Record<string, unknown> = {}
    for (const kulcs of Object.keys(forras).reverse()) {
      eredmeny[kulcs] = forditottKulcsrend(forras[kulcs])
    }
    return eredmeny
  }
  return ertek
}

/** Az örökölt (harmonika előtti) szakmai-háttér blokk, ahogy a seed tárolta. */
const orokoltSzakmaiBlokk = (): Szekcio =>
  ({
    blockType: 'richText',
    id: 'szakmai-regi',
    content: rolunkSzakmaiOrokoltTartalom(),
    sectionSettings: { visible: true, anchorId: SZAKMAI_HATTER_HORGONY, hatter: 'feher' },
  }) as Szekcio

describe('stabilJson — kulcs-sorrendtől független összevetés', () => {
  it('a kulcssorrend átrendezése nem változtat az alakon', () => {
    const tartalom = rolunkSzakmaiOrokoltTartalom()
    expect(stabilJson(forditottKulcsrend(tartalom))).toBe(stabilJson(tartalom))
  })

  it('a tényleges tartalom (tömbsorrend, szöveg) különbsége kimutatható', () => {
    expect(stabilJson([1, 2])).not.toBe(stabilJson([2, 1]))
    expect(stabilJson({ a: 'x' })).not.toBe(stabilJson({ a: 'y' }))
  })
})

describe('rolunkSzakmaiUjBlokkok — az új blokkpár a seed-builderből', () => {
  it('visszaadja a rövid richText + harmonika párt', () => {
    const { rovid, harmonika } = rolunkSzakmaiUjBlokkok()
    expect(rovid?.blockType).toBe('richText')
    expect(harmonika?.blockType).toBe('accordion')
    expect(harmonika?.sectionSettings?.anchorId).toBe(SZAKMAI_HATTER_HORGONY)
  })
})

describe('alkalmazSzakmaiHarmonika — az örökölt óriás-blokk cseréje', () => {
  const ujak = rolunkSzakmaiUjBlokkok()

  const csere = (layout: Page['layout']) =>
    alkalmazSzakmaiHarmonika({
      layout,
      orokoltTartalom: rolunkSzakmaiOrokoltTartalom(),
      ujRovidBlokk: ujak.rovid,
      ujHarmonikaBlokk: ujak.harmonika,
    })

  it('a seedelt örökölt blokkot a rövid + harmonika párra cseréli, a többi blokk referencia-azonos marad', () => {
    const elotte: Szekcio = kurzusSzekcio('Valami más cím')
    const utana: Szekcio = { blockType: 'ctaBanner', id: 'cta-1', title: 'Zárás' } as Szekcio
    const eredmeny = csere([elotte, orokoltSzakmaiBlokk(), utana])

    expect(eredmeny.modositasok).toHaveLength(1)
    expect(eredmeny.kihagyasok).toHaveLength(0)
    expect(eredmeny.layout).not.toBeNull()
    expect(eredmeny.layout).toHaveLength(4)
    expect(eredmeny.layout?.[0]).toBe(elotte)
    expect(eredmeny.layout?.[1].blockType).toBe('richText')
    expect(eredmeny.layout?.[2].blockType).toBe('accordion')
    expect(eredmeny.layout?.[2].sectionSettings?.anchorId).toBe(SZAKMAI_HATTER_HORGONY)
    expect(eredmeny.layout?.[3]).toBe(utana)
  })

  it('a jsonb-féle kulcs-átrendezés NEM akadályozza a cserét', () => {
    const atrendezett = {
      ...orokoltSzakmaiBlokk(),
      content: forditottKulcsrend(rolunkSzakmaiOrokoltTartalom()),
    } as Szekcio
    const eredmeny = csere([atrendezett])
    expect(eredmeny.modositasok).toHaveLength(1)
    expect(eredmeny.layout).toHaveLength(2)
  })

  it('szerkesztő által átírt tartalomnál csendes, indokolt kihagyás', () => {
    const tartalom = structuredClone(rolunkSzakmaiOrokoltTartalom()) as { root: { children: unknown[] } }
    tartalom.root.children.pop()
    const modositott = { ...orokoltSzakmaiBlokk(), content: tartalom } as Szekcio
    const eredmeny = csere([modositott])

    expect(eredmeny.layout).toBeNull()
    expect(eredmeny.modositasok).toHaveLength(0)
    expect(eredmeny.kihagyasok).toHaveLength(1)
    expect(eredmeny.kihagyasok[0].hangos).not.toBe(true)
    expect(eredmeny.kihagyasok[0].indok).toContain('a szerkesztő időközben átírta')
  })

  it('idempotencia: ha a horgonyon már accordion áll, csendes kihagyás', () => {
    const elsoKor = csere([orokoltSzakmaiBlokk()])
    expect(elsoKor.layout).not.toBeNull()
    const masodikKor = csere(elsoKor.layout)

    expect(masodikKor.layout).toBeNull()
    expect(masodikKor.modositasok).toHaveLength(0)
    expect(masodikKor.kihagyasok).toHaveLength(1)
    expect(masodikKor.kihagyasok[0].hangos).not.toBe(true)
    expect(masodikKor.kihagyasok[0].indok).toContain('MÁR harmonika')
  })

  it('hiányzó horgony és nem-richText blokk: hangos kihagyás', () => {
    const horgonyNelkul = csere([kurzusSzekcio('Cím')])
    expect(horgonyNelkul.layout).toBeNull()
    expect(horgonyNelkul.kihagyasok[0].hangos).toBe(true)

    const masTipus = {
      blockType: 'ctaBanner',
      id: 'cta-x',
      title: 'X',
      sectionSettings: { visible: true, anchorId: SZAKMAI_HATTER_HORGONY },
    } as Szekcio
    const rosszTipus = csere([masTipus])
    expect(rosszTipus.layout).toBeNull()
    expect(rosszTipus.kihagyasok[0].hangos).toBe(true)
  })

  it('hiányzó új blokkpár (builder-alak változás): hangos kihagyás', () => {
    const eredmeny = alkalmazSzakmaiHarmonika({
      layout: [orokoltSzakmaiBlokk()],
      orokoltTartalom: rolunkSzakmaiOrokoltTartalom(),
      ujRovidBlokk: null,
      ujHarmonikaBlokk: ujak.harmonika,
    })
    expect(eredmeny.layout).toBeNull()
    expect(eredmeny.kihagyasok[0].hangos).toBe(true)
    expect(eredmeny.kihagyasok[0].indok).toContain('buildRolunkLayout')
  })

  it('a bemeneti szekciósort nem módosítja helyben', () => {
    const bemenet = [orokoltSzakmaiBlokk()]
    const lenyomat = stabilJson(bemenet)
    csere(bemenet)
    expect(stabilJson(bemenet)).toBe(lenyomat)
  })
})
