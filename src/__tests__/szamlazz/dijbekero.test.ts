import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSzamlazzConfig } from '../../lib/szamlazz/client'
import { buildDijbekeroDeleteXml, deleteDijbekero } from '../../lib/szamlazz/dijbekero'
import { buildInvoiceXml } from '../../lib/szamlazz/invoice'
import { SzamlazzApiError } from '../../lib/szamlazz/types'

/**
 * Díjbekérő (proforma) egységtesztek — a számla-XML <dijbekero> tagje és a
 * díjbekérő-törlés (action-szamla_agent_dijbekero_torlese) kliensművelete.
 *
 * Séma-források:
 * - létrehozás: a sima xmlszamla <fejlec><dijbekero>true</dijbekero> taggel
 *   (nincs külön művelet — a buildInvoiceXml dijbekero paramétere);
 * - törlés: https://www.szamlazz.hu/szamla/docs/xsds/dijbekerodel/xmlszamladbkdel.xsd
 *   (a válasz FEJLÉC-alapú: a szlahu_error hiánya = siker).
 *
 * DUMMY érték, egyértelműen jelölve — NEM valódi Számla Agent kulcs.
 */
const DUMMY_AGENT_KEY = 'DUMMY-AGENT-KULCS-NEM-VALODI-TITOK'

const ORDER_NUMBER = 'KH-2026-000123'
const DIJBEKERO_SZAM = 'DB-2026-44'

const ENABLED_CONFIG = getSzamlazzConfig({ SZAMLAZZ_AGENT_KEY: DUMMY_AGENT_KEY })

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
})

function buildBaseInvoiceInput(dijbekero?: boolean) {
  return {
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
    items: [{ megnevezes: 'DEMO Kurzus', mennyiseg: 1, bruttoEgysegar: 19990 }],
    ...(dijbekero === undefined ? {} : { dijbekero }),
  }
}

describe('buildInvoiceXml — dijbekero paraméter', () => {
  it('dijbekero: true → <dijbekero>true</dijbekero> a kötött tag-sorrendben (helyesbitettSzamlaszam után, szamlaszamElotag előtt)', () => {
    const xml = buildInvoiceXml(buildBaseInvoiceInput(true))
    expect(xml).toContain('<dijbekero>true</dijbekero>')
    const helyesbitettIndex = xml.indexOf('<helyesbitettSzamlaszam>')
    const dijbekeroIndex = xml.indexOf('<dijbekero>')
    const elotagIndex = xml.indexOf('<szamlaszamElotag>')
    expect(helyesbitettIndex).toBeLessThan(dijbekeroIndex)
    expect(dijbekeroIndex).toBeLessThan(elotagIndex)
  })

  it('dijbekero: false vagy elhagyva → <dijbekero>false</dijbekero> (változatlan alap-viselkedés)', () => {
    expect(buildInvoiceXml(buildBaseInvoiceInput(false))).toContain('<dijbekero>false</dijbekero>')
    expect(buildInvoiceXml(buildBaseInvoiceInput())).toContain('<dijbekero>false</dijbekero>')
  })

  it('dijbekero módban is megmarad a váz és a szamlaKulsoAzon-horgony', () => {
    const xml = buildInvoiceXml(buildBaseInvoiceInput(true))
    expect(xml).toContain(`<szamlaKulsoAzon>${ORDER_NUMBER}</szamlaKulsoAzon>`)
    expect(xml).toContain('<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla"')
  })
})

describe('buildDijbekeroDeleteXml — dijbekerodel séma', () => {
  const xml = buildDijbekeroDeleteXml({ agentKey: DUMMY_AGENT_KEY, szamlaszam: DIJBEKERO_SZAM })

  it('a gyökér xmlszamladbkdel, a dijbekerodel XSD-vel; a sorrend beallitasok→fejlec', () => {
    expect(xml).toContain('<xmlszamladbkdel xmlns="http://www.szamlazz.hu/xmlszamladbkdel"')
    expect(xml).toContain('https://www.szamlazz.hu/szamla/docs/xsds/dijbekerodel/xmlszamladbkdel.xsd')
    const beallitasokIndex = xml.indexOf('<beallitasok>')
    const fejlecIndex = xml.indexOf('<fejlec>')
    expect(beallitasokIndex).toBeGreaterThan(-1)
    expect(beallitasokIndex).toBeLessThan(fejlecIndex)
  })

  it('a beallitasok az agent-kulcsot, a fejlec a törlendő díjbekérő sorszámát hordozza', () => {
    expect(xml).toContain(`<szamlaagentkulcs>${DUMMY_AGENT_KEY}</szamlaagentkulcs>`)
    expect(xml).toContain(`<szamlaszam>${DIJBEKERO_SZAM}</szamlaszam>`)
  })

  it('XML-escape: a sorszámban a speciális jel entitás', () => {
    const escaped = buildDijbekeroDeleteXml({ agentKey: DUMMY_AGENT_KEY, szamlaszam: 'DB<2>' })
    expect(escaped).toContain('<szamlaszam>DB&lt;2&gt;</szamlaszam>')
  })
})

describe('deleteDijbekero', () => {
  it('boldog út: 2xx hiba-fejlécek nélkül → sikeres (void); a kérés action-szamla_agent_dijbekero_torlese mezőben megy', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    await expect(deleteDijbekero(DIJBEKERO_SZAM, ENABLED_CONFIG)).resolves.toBeUndefined()

    const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit]
    const form = call[1].body as FormData
    const entries = [...form.entries()]
    expect(entries.map(([key]) => key)).toEqual(['action-szamla_agent_dijbekero_torlese'])
    const xmlValue = entries[0]?.[1]
    const xml = xmlValue instanceof Blob ? await xmlValue.text() : ''
    expect(xml).toContain(`<szamlaszam>${DIJBEKERO_SZAM}</szamlaszam>`)
    expect(xml).toContain(`<szamlaagentkulcs>${DUMMY_AGENT_KEY}</szamlaagentkulcs>`)
  })

  it('szlahu_error fejléc → agent-kind hiba a kóddal, nem retryable', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('', {
        status: 200,
        headers: { szlahu_error: 'A dibekero nem torolheto', szlahu_error_code: '77' },
      }),
    )
    try {
      await deleteDijbekero(DIJBEKERO_SZAM, ENABLED_CONFIG)
      expect.unreachable()
    } catch (error) {
      const apiError = error as SzamlazzApiError
      expect(apiError).toBeInstanceOf(SzamlazzApiError)
      expect(apiError.kind).toBe('agent')
      expect(apiError.retryable).toBe(false)
      expect(apiError.agentErrors[0]?.code).toBe('77')
    }
  })

  it('szlahu_down fejléc → retryable hiba', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200, headers: { szlahu_down: '1' } }))
    await expect(deleteDijbekero(DIJBEKERO_SZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      retryable: true,
    })
  })

  it('timeout (AbortError) → timeout-kind, retryable', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))
    await expect(deleteDijbekero(DIJBEKERO_SZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    })
  })

  it('HTTP 5xx → http-kind, retryable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('szerverhiba', { status: 503 }))
    await expect(deleteDijbekero(DIJBEKERO_SZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      kind: 'http',
      httpStatus: 503,
      retryable: true,
    })
  })

  it('kikapcsolt integrációnál invalid_data (fetch nélkül)', async () => {
    await expect(deleteDijbekero(DIJBEKERO_SZAM, getSzamlazzConfig({}))).rejects.toMatchObject({
      kind: 'invalid_data',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
