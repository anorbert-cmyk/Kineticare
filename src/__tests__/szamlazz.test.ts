import { describe, expect, it, vi } from 'vitest'

import { getSzamlazzConfig, parseAgentResponse } from '../lib/szamlazz/client'
import {
  buildInvoiceXml,
  buyerFromOrder,
  computeLineAmounts,
  escapeXml,
  isTrustedInvoicePdfUrl,
  issueInvoiceForOrder,
  itemsFromOrder,
} from '../lib/szamlazz/invoice'
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
      postXml: async (xml) => {
        sentXml.push(xml)
        return { szamlaszam: 'KIN-2026-7', vevoifiokUrl: 'https://www.szamlazz.hu/vevoifiok/abc' }
      },
    })

    expect(result).toEqual({ outcome: 'issued', invoiceNumber: 'KIN-2026-7' })
    expect(order?.invoiceStatus).toBe('issued')
    expect(order?.invoiceNumber).toBe('KIN-2026-7')
    expect(order?.invoicePdfUrl).toBe('https://www.szamlazz.hu/vevoifiok/abc')
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
        postXml: async () => {
          throw new SzamlazzApiError({ message: 'timeout', kind: 'timeout', retryable: true })
        },
      }),
    ).rejects.toThrow('timeout')
    expect(order?.invoiceStatus).toBe('failed')
  })
})
