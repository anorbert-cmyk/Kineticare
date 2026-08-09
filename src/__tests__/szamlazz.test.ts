import { describe, expect, it, vi } from 'vitest'

import { getSzamlazzConfig, isDuplicateOrderError, parseAgentResponse } from '../lib/szamlazz/client'
import {
  buildInvoiceXml,
  buyerFromOrder,
  computeLineAmounts,
  escapeXml,
  isTrustedInvoicePdfUrl,
  issueInvoiceForOrder,
  itemsFromOrder,
  MAX_INVOICE_ATTEMPTS,
} from '../lib/szamlazz/invoice'
import type { InvoiceLookupResult } from '../lib/szamlazz/pdf'
import { SzamlazzApiError } from '../lib/szamlazz/types'
import type { Order } from '../payload-types'

/**
 * Számlázz.hu (T-024/W4-01) egységtesztek — config-feloldás, XML-építés a
 * hivatalos Számla Agent séma szerint, válasz-értelmezés (XML + szlahu_*
 * fejlécek), és a számlakiállítás idempotens folyamata mockolt payloaddal.
 *
 * DUMMY érték, egyértelműen jelölve — NEM valódi Számla Agent kulcs.
 */
const DUMMY_AGENT_KEY = 'DUMMY-AGENT-KULCS-NEM-VALODI-TITOK'

const ORDER_NUMBER = 'KH-2026-000123'

describe('getSzamlazzConfig', () => {
  it('SZAMLAZZ_AGENT_KEY nélkül kikapcsolt (enabled=false), nem hiba', () => {
    const config = getSzamlazzConfig({})
    expect(config.enabled).toBe(false)
    expect(config.agentKey).toBeUndefined()
    // ZÁRÓ PERJELLEL: a perjel nélküli alak redirectet kaphat, ami a POST-ot
    // GET-té alakítaná (a multipart törzs elveszne).
    expect(config.apiUrl).toBe('https://www.szamlazz.hu/szamla/')
    expect(config.invoicePrefix).toBe('KIN')
    expect(config.vatMode).toBe('27')
    expect(config.timeoutMs).toBe(15_000)
  })

  it('SZAMLAZZ_API_URL perjel nélkül megadva is záró perjelet kap', () => {
    const config = getSzamlazzConfig({ SZAMLAZZ_API_URL: 'https://www.szamlazz.hu/szamla' })
    expect(config.apiUrl).toBe('https://www.szamlazz.hu/szamla/')
  })

  it('SZAMLAZZ_AFAKULCS: AAM elfogadott, ismeretlen érték hangosan dob', () => {
    expect(getSzamlazzConfig({ SZAMLAZZ_AFAKULCS: 'AAM' }).vatMode).toBe('AAM')
    expect(() => getSzamlazzConfig({ SZAMLAZZ_AFAKULCS: '0' })).toThrowError(/SZAMLAZZ_AFAKULCS/)
    expect(() => getSzamlazzConfig({ SZAMLAZZ_AFAKULCS: 'TAM' })).toThrowError(/AAM/)
  })

  it('kulccsal enabled; prefix és timeout felülírható', () => {
    const config = getSzamlazzConfig({
      SZAMLAZZ_AGENT_KEY: DUMMY_AGENT_KEY,
      SZAMLAZZ_INVOICE_PREFIX: 'TESZT',
      SZAMLAZZ_TIMEOUT_MS: '5000',
    })
    expect(config.enabled).toBe(true)
    expect(config.agentKey).toBe(DUMMY_AGENT_KEY)
    expect(config.invoicePrefix).toBe('TESZT')
    expect(config.timeoutMs).toBe(5000)
  })

  it('nem https SZAMLAZZ_API_URL esetén dob (elgépelés ne csendben működjön)', () => {
    expect(() =>
      getSzamlazzConfig({ SZAMLAZZ_AGENT_KEY: DUMMY_AGENT_KEY, SZAMLAZZ_API_URL: 'http://x.hu' }),
    ).toThrow('SZAMLAZZ_API_URL')
  })
})

describe('computeLineAmounts — 27% ÁFA, bruttóból', () => {
  it('mennyiség=1: netto+afa=brutto pontosan, nettoEgysegar=nettoErtek', () => {
    const amounts = computeLineAmounts({ megnevezes: 'Kurzus', mennyiseg: 1, bruttoEgysegar: 19990 })
    expect(amounts.bruttoErtek).toBe(19990)
    expect(amounts.nettoErtek).toBe(Math.round(19990 / 1.27)) // 15740
    expect(amounts.afaErtek).toBe(19990 - amounts.nettoErtek)
    expect(amounts.nettoEgysegar).toBe(String(amounts.nettoErtek))
  })

  it('mennyiseg>1: a tételösszegek konzisztensek (netto+afa=brutto)', () => {
    const amounts = computeLineAmounts({ megnevezes: 'Kurzus', mennyiseg: 3, bruttoEgysegar: 9999 })
    expect(amounts.bruttoErtek).toBe(29997)
    expect(amounts.nettoErtek + amounts.afaErtek).toBe(amounts.bruttoErtek)
  })

  it('érvénytelen mennyiség/ár esetén invalid_data hibát dob (nem retryable)', () => {
    expect(() => computeLineAmounts({ megnevezes: 'x', mennyiseg: 0, bruttoEgysegar: 100 })).toThrow(
      SzamlazzApiError,
    )
    expect(() =>
      computeLineAmounts({ megnevezes: 'x', mennyiseg: 1, bruttoEgysegar: -5 }),
    ).toThrow(SzamlazzApiError)
  })
})

/**
 * A Számlázz.hu NEM számol, hanem tételenként VALIDÁLJA az egyenleteket
 * (259–264 hibakódok):
 *   nettoEgysegar × mennyiseg = nettoErtek   és   nettoErtek + afaErtek = bruttoErtek
 * Ezért a számítás EGYSÉGÁR-alapú (előbb az egy darabra eső összeg kerekedik),
 * és a tételösszegek ennek pontos többszörösei.
 */
describe('computeLineAmounts — tétel-egyenletek mennyiség > 1 esetén', () => {
  it('nettoEgysegar × mennyiseg = nettoErtek PONTOSAN (a tétel-szintű kerekítés elcsúszna)', () => {
    for (const [bruttoEgysegar, mennyiseg] of [
      [9999, 3],
      [19990, 7],
    ] as const) {
      const amounts = computeLineAmounts({ megnevezes: 'Kurzus', mennyiseg, bruttoEgysegar })
      const label = `${bruttoEgysegar} × ${mennyiseg}`
      // Az EGYENLET, amit a Számla Agent ellenőriz — fillérre teljesülnie kell.
      expect(Number(amounts.nettoEgysegar) * mennyiseg, label).toBe(amounts.nettoErtek)
      expect(amounts.nettoErtek + amounts.afaErtek, label).toBe(amounts.bruttoErtek)
      expect(amounts.bruttoErtek, label).toBe(bruttoEgysegar * mennyiseg)
    }
  })

  it('AAM (alanyi adómentes): nettoErtek = bruttoErtek, afaErtek = 0', () => {
    const amounts = computeLineAmounts(
      { megnevezes: 'Kurzus', mennyiseg: 4, bruttoEgysegar: 19990 },
      { vatMode: 'AAM' },
    )
    expect(amounts.bruttoErtek).toBe(79960)
    expect(amounts.nettoErtek).toBe(amounts.bruttoErtek)
    expect(amounts.afaErtek).toBe(0)
    expect(Number(amounts.nettoEgysegar) * 4).toBe(amounts.nettoErtek)
  })

  it('negatív (korrekciós) tétel: mind a négy érték előjelet vált, az egyenletek állnak', () => {
    const positive = computeLineAmounts({ megnevezes: 'x', mennyiseg: 3, bruttoEgysegar: 9999 })
    const negative = computeLineAmounts(
      { megnevezes: 'x', mennyiseg: 3, bruttoEgysegar: -9999 },
      { allowNegative: true },
    )
    expect(negative.nettoEgysegar).toBe(`-${positive.nettoEgysegar}`)
    expect(negative.nettoErtek).toBe(-positive.nettoErtek)
    expect(negative.afaErtek).toBe(-positive.afaErtek)
    expect(negative.bruttoErtek).toBe(-positive.bruttoErtek)
    // Az egyenletek negatív tételen is teljesülnek (a helyesbítő így nullázza az eredetit).
    expect(Number(negative.nettoEgysegar) * 3).toBe(negative.nettoErtek)
    expect(negative.nettoErtek + negative.afaErtek).toBe(negative.bruttoErtek)
  })
})

describe('buildInvoiceXml — hivatalos Számla Agent séma', () => {
  const xml = buildInvoiceXml({
    agentKey: DUMMY_AGENT_KEY,
    orderNumber: ORDER_NUMBER,
    invoicePrefix: 'KIN',
    issueDate: '2026-08-04',
    buyer: {
      nev: 'Teszt Anna',
      irsz: '1111',
      telepules: 'Budapest',
      cim: 'Példa utca 1.',
      email: 'anna@example.test',
      adoszam: '12345678-1-42',
    },
    items: [{ megnevezes: 'DEMO Kurzus <b>', mennyiseg: 1, bruttoEgysegar: 19990 }],
  })

  it('a kötelező váz-tagok megvannak, a sorrend kötött (beallitasok→fejlec→elado→vevo→fuvarlevel→tetelek)', () => {
    expect(xml).toContain('<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla"')
    const order = ['<beallitasok>', '<fejlec>', '<elado>', '<vevo>', '<fuvarlevel>', '<tetelek>']
    let previousIndex = -1
    for (const tag of order) {
      const index = xml.indexOf(tag)
      expect(index, tag).toBeGreaterThan(previousIndex)
      previousIndex = index
    }
    // Üresen is jelen lévő kötelező tagok.
    for (const tag of ['<arfolyamBank></arfolyamBank>', '<bankszamlaszam></bankszamlaszam>', '<postazasiNev></postazasiNev>', '<azonosito></azonosito>']) {
      expect(xml).toContain(tag)
    }
  })

  it('beallitasok: agent-kulcs, eszamla, valaszVerzio 2, szamlaKulsoAzon = orderNumber', () => {
    expect(xml).toContain(`<szamlaagentkulcs>${DUMMY_AGENT_KEY}</szamlaagentkulcs>`)
    expect(xml).toContain('<eszamla>true</eszamla>')
    expect(xml).toContain('<valaszVerzio>2</valaszVerzio>')
    expect(xml).toContain(`<szamlaKulsoAzon>${ORDER_NUMBER}</szamlaKulsoAzon>`)
  })

  it('fejlec: dátumok, fizmod=Barion, HUF, hu, rendelesSzam, előtag', () => {
    expect(xml).toContain('<keltDatum>2026-08-04</keltDatum>')
    // A10: a fizmod normalizált értékkészletében a 'Barion' dedikált érték —
    // ez adja a legjobb fizmodunified-besorolást a kimenő-adatkapcsolatban.
    expect(xml).toContain('<fizmod>Barion</fizmod>')
    expect(xml).toContain('<penznem>HUF</penznem>')
    expect(xml).toContain('<szamlaNyelve>hu</szamlaNyelve>')
    expect(xml).toContain(`<rendelesSzam>${ORDER_NUMBER}</rendelesSzam>`)
    expect(xml).toContain('<szamlaszamElotag>KIN</szamlaszamElotag>')
  })

  it('vevő: adatok + sendEmail + adoszam; az azonosító ÜRES (sosem küldjük)', () => {
    expect(xml).toContain('<nev>Teszt Anna</nev>')
    expect(xml).toContain('<irsz>1111</irsz>')
    expect(xml).toContain('<email>anna@example.test</email>')
    expect(xml).toContain('<sendEmail>true</sendEmail>')
    expect(xml).toContain('<adoszam>12345678-1-42</adoszam>')
    expect(xml).toContain('<azonosito></azonosito>')
  })

  it('tétel: 27%-os ÁFA-kulcs és a visszaszámolt összegek', () => {
    expect(xml).toContain('<afakulcs>27</afakulcs>')
    expect(xml).toContain('<bruttoErtek>19990</bruttoErtek>')
    expect(xml).toContain('<nettoErtek>15740</nettoErtek>')
    expect(xml).toContain('<afaErtek>4250</afaErtek>')
    expect(xml).toContain('<mennyisegiEgyseg>db</mennyisegiEgyseg>')
  })

  it('XML-escape: a tétel megnevezésében a < jel entitás', () => {
    expect(xml).toContain('DEMO Kurzus &lt;b&gt;')
    expect(xml).not.toContain('DEMO Kurzus <b>')
  })
})

describe('buildInvoiceXml — áfakulcs és teljesítési dátum', () => {
  const BASE = {
    agentKey: DUMMY_AGENT_KEY,
    orderNumber: ORDER_NUMBER,
    invoicePrefix: 'KIN',
    issueDate: '2026-08-04',
    buyer: {
      nev: 'Teszt Anna',
      irsz: '1111',
      telepules: 'Budapest',
      cim: 'Példa utca 1.',
      email: 'anna@example.test',
    },
    items: [{ megnevezes: 'Kurzus', mennyiseg: 1, bruttoEgysegar: 19990 }],
  }

  it('vatMode=AAM: az afakulcs AAM, a tételen afaErtek=0 és netto=brutto', () => {
    const xml = buildInvoiceXml({ ...BASE, vatMode: 'AAM' })
    expect(xml).toContain('<afakulcs>AAM</afakulcs>')
    expect(xml).not.toContain('<afakulcs>27</afakulcs>')
    expect(xml).toContain('<afaErtek>0</afaErtek>')
    expect(xml).toContain('<nettoErtek>19990</nettoErtek>')
    expect(xml).toContain('<bruttoErtek>19990</bruttoErtek>')
  })

  it('teljesitesDatum megadva: eltér a kelt-dátumtól (a kelt marad az issueDate)', () => {
    // B4 (NAV-szabály): a helyesbítő az EREDETI teljesítési dátumot ismétli —
    // ezt a builder külön bemenetként kapja, a kelt-dátumot nem befolyásolja.
    const xml = buildInvoiceXml({ ...BASE, teljesitesDatum: '2026-07-15' })
    expect(xml).toContain('<keltDatum>2026-08-04</keltDatum>')
    expect(xml).toContain('<teljesitesDatum>2026-07-15</teljesitesDatum>')
    expect(xml).toContain('<fizetesiHataridoDatum>2026-08-04</fizetesiHataridoDatum>')
  })

  it('teljesitesDatum nélkül a teljesítés a kiállítás napja', () => {
    const xml = buildInvoiceXml(BASE)
    expect(xml).toContain('<teljesitesDatum>2026-08-04</teljesitesDatum>')
  })
})

describe('escapeXml', () => {
  it('mind az 5 XML-entitást cseréli', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;')
  })
})

describe('parseAgentResponse', () => {
  it('sikeres válasz: szamlaszam + vevoifiokurl', () => {
    const result = parseAgentResponse(
      '<?xml version="1.0"?><xmlszamlavalasz><sikeres>true</sikeres><szamlaszam>KIN-2026-7</szamlaszam><vevoifiokurl>https://www.szamlazz.hu/vevoifiok/abc</vevoifiokurl></xmlszamlavalasz>',
      new Headers(),
    )
    expect(result.szamlaszam).toBe('KIN-2026-7')
    expect(result.vevoifiokUrl).toBe('https://www.szamlazz.hu/vevoifiok/abc')
  })

  it('sikertelen válasz: hibakod/hibauzenet, agent-kind, nem retryable', () => {
    try {
      parseAgentResponse(
        '<?xml version="1.0"?><xmlszamlavalasz><sikeres>false</sikeres><hibak><hiba><hibakod>57</hibakod><hibauzenet>Hibás tételösszeg</hibauzenet></hiba></hibak></xmlszamlavalasz>',
        new Headers(),
      )
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(SzamlazzApiError)
      const apiError = error as SzamlazzApiError
      expect(apiError.kind).toBe('agent')
      expect(apiError.retryable).toBe(false)
      expect(apiError.agentErrors).toEqual([{ code: '57', message: 'Hibás tételösszeg' }])
    }
  })

  it('lapos hibakod-forma is értelmezhető', () => {
    try {
      parseAgentResponse(
        '<?xml version="1.0"?><xmlszamlavalasz><sikeres>false</sikeres><hibakod>201</hibakod><hibauzenet>Hiányzó vevő név</hibauzenet></xmlszamlavalasz>',
        new Headers(),
      )
      expect.unreachable()
    } catch (error) {
      const apiError = error as SzamlazzApiError
      expect(apiError.kind).toBe('agent')
      expect(apiError.agentErrors).toEqual([{ code: '201', message: 'Hiányzó vevő név' }])
    }
  })

  it('szlahu_down fejléc: retryable hiba akkor is, ha a body sikeres lenne', () => {
    try {
      parseAgentResponse(
        '<xmlszamlavalasz><sikeres>true</sikeres><szamlaszam>X</szamlaszam></xmlszamlavalasz>',
        new Headers({ szlahu_down: '1' }),
      )
      expect.unreachable()
    } catch (error) {
      const apiError = error as SzamlazzApiError
      expect(apiError.retryable).toBe(true)
    }
  })

  it('szlahu_error fejléc: agent-hiba a kóddal', () => {
    try {
      parseAgentResponse('bármi', new Headers({ szlahu_error: 'Lépjen be', szlahu_error_code: '51' }))
      expect.unreachable()
    } catch (error) {
      const apiError = error as SzamlazzApiError
      expect(apiError.kind).toBe('agent')
      expect(apiError.agentErrors[0]?.code).toBe('51')
    }
  })

  it('értelmezhetetlen válasz: invalid_response, nem retryable', () => {
    try {
      parseAgentResponse('<html>500 oldal</html>', new Headers())
      expect.unreachable()
    } catch (error) {
      const apiError = error as SzamlazzApiError
      expect(apiError.kind).toBe('invalid_response')
      expect(apiError.retryable).toBe(false)
    }
  })
})

/**
 * Hivatalos hibakód-osztályozás (docs.szamlazz.hu/agent/basics/error-handling).
 * A besorolás dönti el, hogy a job újrapróbál-e: egy tévesen retryable-nek vett
 * végleges hiba feleslegesen égetné a max. 5 beküldés keretét, egy tévesen
 * véglegesnek vett karbantartás pedig elveszítené a számlát.
 */
describe('parseAgentResponse — hibakód-osztályozás (retry / duplikátum / végleges)', () => {
  /** A megadott hibakódra kapott SzamlazzApiError, típusbiztosan. */
  function agentErrorOf(code: string): SzamlazzApiError {
    let captured: unknown
    try {
      parseAgentResponse(
        `<?xml version="1.0"?><xmlszamlavalasz><sikeres>false</sikeres><hibak><hiba>` +
          `<hibakod>${code}</hibakod><hibauzenet>DUMMY hibaüzenet</hibauzenet>` +
          `</hiba></hibak></xmlszamlavalasz>`,
        new Headers(),
      )
    } catch (error) {
      captured = error
    }
    expect(captured, `a(z) ${code} hibakódnak hibát kell dobnia`).toBeInstanceOf(SzamlazzApiError)
    if (!(captured instanceof SzamlazzApiError)) {
      throw new Error(`TESZT-HIBA: a(z) ${code} hibakódra nem SzamlazzApiError érkezett`)
    }
    return captured
  }

  it('1 (rendszerkarbantartás): agent-hiba, de RETRYABLE — az egyetlen ilyen kód', () => {
    const error = agentErrorOf('1')
    expect(error.kind).toBe('agent')
    expect(error.retryable).toBe(true)
    expect(isDuplicateOrderError(error)).toBe(false)
  })

  it('71 és 152 (Már létező rendelésszám): duplicate-kind, nem retryable — idempotencia-találat', () => {
    for (const code of ['71', '152']) {
      const error = agentErrorOf(code)
      // NEM hiba, hanem jelzés: a hívó a szamlaKulsoAzon-lekérdezéssel veszi át
      // a meglévő bizonylatot — az újraküldés csak ugyanezt adná vissza.
      expect(error.kind, code).toBe('duplicate')
      expect(error.retryable, code).toBe(false)
      expect(isDuplicateOrderError(error), code).toBe(true)
    }
  })

  it('259 (tétel-matematika): agent-hiba, VÉGLEGES (az újraküldés ugyanezt adná)', () => {
    const error = agentErrorOf('259')
    expect(error.kind).toBe('agent')
    expect(error.retryable).toBe(false)
    expect(isDuplicateOrderError(error)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// issueInvoiceForOrder — a folyamat mockolt payloaddal + injektált postXml-lel
// ---------------------------------------------------------------------------

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 101,
    orderNumber: ORDER_NUMBER,
    status: 'paid',
    invoiceStatus: 'none',
    customerEmail: 'anna@example.test',
    totalHufSnapshot: 19990,
    items: [{ product: 42, quantity: 1, titleSnapshot: 'DEMO-KEZREHAB-001', priceHufSnapshot: 19990 }],
    customerSnapshot: {
      name: 'Teszt Anna',
      email: 'anna@example.test',
      billingName: 'Teszt Anna',
      billingZip: '1111',
      billingCity: 'Budapest',
      billingStreet: 'Példa utca 1.',
    },
    ...overrides,
  } as unknown as Order
}

function createMockPayload(order: Order | null) {
  const updates: Array<Record<string, unknown>> = []
  const payload = {
    findByID: async () => order,
    update: async ({ data }: { data: Record<string, unknown> }) => {
      updates.push(data)
      if (order) {
        Object.assign(order, data)
      }
      return order
    },
  }
  return { payload: payload as never, updates, order }
}

const ENABLED_CONFIG = getSzamlazzConfig({ SZAMLAZZ_AGENT_KEY: DUMMY_AGENT_KEY })

/**
 * A bizonylat-lekérdezés MINDEN folyamat-tesztben injektált: injektálás nélkül a
 * retry- és duplikátum-ág a VALÓDI Számlázz.hu-t hívná meg. Ez a mock azokra az
 * ágakra való, ahol lekérdezésnek egyáltalán nem szabad futnia — ha mégis fut,
 * hangosan bukik.
 */
const noLookup = async (): Promise<InvoiceLookupResult | null> => {
  throw new Error('TESZT-HIBA: ezen az ágon nem futhat bizonylat-lekérdezés')
}

describe('buyerFromOrder / itemsFromOrder', () => {
  it('a customerSnapshot-ból építkezik (billingName elsőbbség, email-fallback)', () => {
    const buyer = buyerFromOrder(createOrder())
    expect(buyer).toMatchObject({ nev: 'Teszt Anna', irsz: '1111', telepules: 'Budapest' })
    const items = itemsFromOrder(createOrder())
    expect(items).toEqual([
      { megnevezes: 'DEMO-KEZREHAB-001', mennyiseg: 1, bruttoEgysegar: 19990 },
    ])
  })

  it('hiányos számlázási adatnál null (a számla nem állítható ki)', () => {
    const order = createOrder()
    order.customerSnapshot = { name: 'Teszt Anna', email: 'a@b.hu' }
    expect(buyerFromOrder(order)).toBeNull()
  })
})

/**
 * A `<vevoifiokurl>` a Számlázz.hu válaszából jön (szabad szöveg), és a
 * rendelés `invoicePdfUrl` mezőjébe kerül, amit a fiók-oldal KATTINTHATÓ
 * linkként jelenít meg. Ellenőrzés nélkül egy hibás vagy manipulált válasz a
 * vásárlót a saját rendelés-oldaláról tetszőleges címre vinné.
 */
describe('isTrustedInvoicePdfUrl — a számlalink allowlistje', () => {
  it('elfogadja a szamlazz.hu-t és aldomainjeit, https-sel', () => {
    for (const url of [
      'https://szamlazz.hu/vevoifiok/abc',
      'https://www.szamlazz.hu/vevoifiok/abc',
      'https://SZAMLAZZ.HU/vevoifiok/abc',
      'https://barmi.aldomain.szamlazz.hu/x?y=1',
    ]) {
      expect(isTrustedInvoicePdfUrl(url), url).toBe(true)
    }
  })

  it('elutasít mindent, ami nem https + szamlazz.hu', () => {
    for (const url of [
      // Nem https — a link a vásárlónak megy, sima http nem elég.
      'http://www.szamlazz.hu/vevoifiok/abc',
      // Végződés-trükk: a hoszt NEM a szamlazz.hu aldomainje.
      'https://szamlazz.hu.tamado.example/vevoifiok/abc',
      'https://nemszamlazz.hu/vevoifiok/abc',
      // Idegen hoszt, illetve nem-URL alakok.
      'https://tamado.example/szamlazz.hu/abc',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '//www.szamlazz.hu/vevoifiok/abc',
      'vevoifiok/abc',
      '',
    ]) {
      expect(isTrustedInvoicePdfUrl(url), url).toBe(false)
    }
  })
})

describe('issueInvoiceForOrder', () => {
  it('boldog út: pending → issued + invoiceNumber + invoicePdfUrl, a küldött XML szamlaKulsoAzon-ja az orderNumber', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const sentXml: string[] = []
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      issueDate: '2026-08-04',
      queryByKulsoAzon: noLookup,
      postXml: async (xml) => {
        sentXml.push(xml)
        return { szamlaszam: 'KIN-2026-7', vevoifiokUrl: 'https://www.szamlazz.hu/vevoifiok/abc' }
      },
    })

    expect(result).toEqual({ outcome: 'issued', invoiceNumber: 'KIN-2026-7' })
    expect(order?.invoiceStatus).toBe('issued')
    expect(order?.invoiceNumber).toBe('KIN-2026-7')
    expect(order?.invoicePdfUrl).toBe('https://www.szamlazz.hu/vevoifiok/abc')
    // B4: a kiállításkor küldött teljesítési dátum RÖGZÜL — ezt ismétli később a helyesbítő.
    expect(order?.invoiceCompletionDate).toBe('2026-08-04')
    expect(order?.invoiceLastError).toBeNull()
    expect(sentXml).toHaveLength(1)
    expect(sentXml[0]).toContain(`<szamlaKulsoAzon>${ORDER_NUMBER}</szamlaKulsoAzon>`)
  })

  it('nem megbízható vevői fiók URL: a számla kiáll, de a LINK nem mentődik + figyelmeztetés', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const result = await issueInvoiceForOrder({
        payload,
        orderId: 101,
        config: ENABLED_CONFIG,
        issueDate: '2026-08-04',
        queryByKulsoAzon: noLookup,
        postXml: async () => ({
          szamlaszam: 'KIN-2026-8',
          vevoifiokUrl: 'https://szamlazz.hu.tamado.example/vevoifiok/abc',
        }),
      })

      expect(result).toEqual({ outcome: 'issued', invoiceNumber: 'KIN-2026-8' })
      expect(order?.invoiceStatus).toBe('issued')
      expect(order?.invoiceNumber).toBe('KIN-2026-8')
      // A hamis link SEHOL nem kerül a rendelésre.
      expect(order?.invoicePdfUrl).toBeUndefined()

      const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
      expect(output).toContain('nem megbízható vevői fiók URL')
      // A teljes URL nem kerül naplóba (query-string tokent hordozhat) — csak a hoszt.
      expect(output).toContain('szamlazz.hu.tamado.example')
      expect(output).not.toContain('/vevoifiok/abc')
    } finally {
      logSpy.mockRestore()
    }
  })

  it('idempotens: már issued rendelésnél no-op (nincs új hívás)', async () => {
    const order = createOrder({ invoiceStatus: 'issued', invoiceNumber: 'KIN-2026-7' })
    const { payload } = createMockPayload(order)
    let calls = 0
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      queryByKulsoAzon: noLookup,
      postXml: async () => {
        calls += 1
        return { szamlaszam: 'X' }
      },
    })
    expect(result).toEqual({ outcome: 'already-issued', invoiceNumber: 'KIN-2026-7' })
    expect(calls).toBe(0)
  })

  it('kikapcsolt integrációnál disabled (a payloadhoz sem nyúl)', async () => {
    const { payload, updates } = createMockPayload(createOrder())
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: getSzamlazzConfig({}),
      queryByKulsoAzon: noLookup,
      postXml: async () => expect.unreachable('nem hívható'),
    })
    expect(result.outcome).toBe('disabled')
    expect(updates).toHaveLength(0)
  })

  it('hiányos vevő-adatnál invoiceStatus=failed, NEM dob (a job nem próbálja újra)', async () => {
    const order = createOrder()
    order.customerSnapshot = { name: 'Teszt Anna' }
    const { payload } = createMockPayload(order)
    let calls = 0
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      queryByKulsoAzon: noLookup,
      postXml: async () => {
        calls += 1
        return { szamlaszam: 'X' }
      },
    })
    expect(result.outcome).toBe('failed')
    expect(order.invoiceStatus).toBe('failed')
    expect(calls).toBe(0)
  })

  it('agent-elutasításnál invoiceStatus=failed, nem dob (üzleti hiba, nem retryable)', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      queryByKulsoAzon: noLookup,
      postXml: async () => {
        throw new SzamlazzApiError({
          message: 'Számla Agent hiba: 57',
          kind: 'agent',
          retryable: false,
        })
      },
    })
    expect(result.outcome).toBe('failed')
    expect(order?.invoiceStatus).toBe('failed')
  })

  it('retryable provider-hibánál invoiceStatus=failed + THROW (a job újrapróbálja)', async () => {
    const { payload, order } = createMockPayload(createOrder())
    await expect(
      issueInvoiceForOrder({
        payload,
        orderId: 101,
        config: ENABLED_CONFIG,
        queryByKulsoAzon: noLookup,
        postXml: async () => {
          throw new SzamlazzApiError({ message: 'timeout', kind: 'timeout', retryable: true })
        },
      }),
    ).rejects.toThrow('timeout')
    expect(order?.invoiceStatus).toBe('failed')
  })
})

/**
 * A12/A14 — a „kérés elment, válasz elveszett" eset feloldása és a beküldések
 * plafonja. A lekérdezés MINDEN ágon injektált: e nélkül a teszt a valódi
 * Számlázz.hu-ra menne ki.
 */
describe('issueInvoiceForOrder — idempotencia-feloldás és kísérlet-plafon', () => {
  /** A 71/152-es duplikátum-jelzés (a Számlázz.hu „Már létező rendelésszám"-a). */
  function duplicateError(code: string): SzamlazzApiError {
    return new SzamlazzApiError({
      message: `Számla Agent hiba: ${code} — Már létező rendelésszám.`,
      kind: 'duplicate',
      agentErrors: [{ code, message: 'Már létező rendelésszám.' }],
      retryable: false,
    })
  }

  it('duplikátum-jelzés (71) + lekérdezés-találat: a meglévő számla átvéve, nem hiba', async () => {
    const { payload, order, updates } = createMockPayload(createOrder())
    const lookups: string[] = []
    let posts = 0
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      issueDate: '2026-08-04',
      queryByKulsoAzon: async (kulsoAzon) => {
        lookups.push(kulsoAzon)
        return { szamlaszam: 'KIN-2026-7' }
      },
      postXml: async () => {
        posts += 1
        throw duplicateError('71')
      },
    })

    expect(result).toEqual({ outcome: 'issued', invoiceNumber: 'KIN-2026-7' })
    expect(posts).toBe(1)
    // A lekérdezés horgonya a rendelésszám (a számla szamlaKulsoAzon-ja).
    expect(lookups).toEqual([ORDER_NUMBER])
    expect(order?.invoiceStatus).toBe('issued')
    expect(order?.invoiceNumber).toBe('KIN-2026-7')
    expect(updates[1]).toEqual({
      invoiceStatus: 'issued',
      invoiceNumber: 'KIN-2026-7',
      invoiceLastError: null,
    })
  })

  it('duplikátum-jelzés TALÁLAT NÉLKÜL: failed + kézi egyeztetést kérő indoklás', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      issueDate: '2026-08-04',
      queryByKulsoAzon: async () => null,
      postXml: async () => {
        throw duplicateError('152')
      },
    })

    expect(result.outcome).toBe('failed')
    expect(result.reason).toContain('kézi egyeztetés')
    expect(order?.invoiceStatus).toBe('failed')
    expect(order?.invoiceLastError).toContain('kézi egyeztetés')
    expect(order?.invoiceNumber).toBeUndefined()
  })

  it('retry ELŐTTI lekérdezés: találatnál a beküldés elmarad (a bizonylat már létezik)', async () => {
    // invoiceAttempts=1: az előző kísérlet válasza elveszhetett — a beküldés
    // megismétlése előtt kötelező a szamlaKulsoAzon-lekérdezés.
    const { payload, order } = createMockPayload(createOrder({ invoiceAttempts: 1 }))
    const lookups: string[] = []
    let posts = 0
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      issueDate: '2026-08-04',
      queryByKulsoAzon: async (kulsoAzon) => {
        lookups.push(kulsoAzon)
        return { szamlaszam: 'KIN-2026-7' }
      },
      postXml: async () => {
        posts += 1
        return { szamlaszam: 'MASIK-SZAMLA' }
      },
    })

    expect(result).toEqual({ outcome: 'issued', invoiceNumber: 'KIN-2026-7' })
    expect(lookups).toEqual([ORDER_NUMBER])
    expect(posts).toBe(0)
    expect(order?.invoiceNumber).toBe('KIN-2026-7')
    expect(order?.invoiceAttempts).toBe(2)
  })

  it('kísérlet-plafon (5): failed, SE lekérdezés SE beküldés nem fut', async () => {
    const { payload, order } = createMockPayload(
      createOrder({ invoiceStatus: 'failed', invoiceAttempts: MAX_INVOICE_ATTEMPTS }),
    )
    let lookups = 0
    let posts = 0
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      queryByKulsoAzon: async () => {
        lookups += 1
        return null
      },
      postXml: async () => {
        posts += 1
        return { szamlaszam: 'X' }
      },
    })

    expect(result.outcome).toBe('failed')
    expect(result.reason).toContain('kimerült')
    expect(lookups).toBe(0)
    expect(posts).toBe(0)
    expect(order?.invoiceStatus).toBe('failed')
    expect(order?.invoiceLastError).toContain('kimerült')
  })

  it('sikeres kiállítás: a megadott issueDate teljesítési dátumként a rendelésre íródik', async () => {
    const { payload, order, updates } = createMockPayload(createOrder())
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      issueDate: '2026-07-15',
      queryByKulsoAzon: noLookup,
      postXml: async () => ({ szamlaszam: 'KIN-2026-7' }),
    })

    expect(result).toEqual({ outcome: 'issued', invoiceNumber: 'KIN-2026-7' })
    expect(order?.invoiceCompletionDate).toBe('2026-07-15')
    expect(updates[1]).toEqual({
      invoiceStatus: 'issued',
      invoiceNumber: 'KIN-2026-7',
      invoiceCompletionDate: '2026-07-15',
      invoiceLastError: null,
    })
  })
})
