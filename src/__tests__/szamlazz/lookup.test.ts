import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSzamlazzConfig } from '../../lib/szamlazz/client'
import {
  buildInvoiceLookupXml,
  queryInvoiceByKulsoAzon,
  SZAMLAZZ_NOT_FOUND_CODE,
} from '../../lib/szamlazz/pdf'
import { SzamlazzApiError } from '../../lib/szamlazz/types'

/**
 * Bizonylat-lekérdezés (xmlszamlapdf / action-szamla_agent_pdf) egységtesztek —
 * az IDEMPOTENCIA-FELOLDÁS magja: a „kérés elment, válasz elveszett" esetben és
 * a 71/152-es duplikátum-jelzésnél ez adja vissza a már kiállt bizonylat számát.
 *
 * A hálózat MINDENHOL mockolt (vi.stubGlobal('fetch')) — ebből a suite-ból
 * egyetlen kérés sem mehet ki a valódi Számlázz.hu-ra.
 *
 * DUMMY érték, egyértelműen jelölve — NEM valódi Számla Agent kulcs.
 */
const DUMMY_AGENT_KEY = 'DUMMY-AGENT-KULCS-NEM-VALODI-TITOK'

const ORDER_NUMBER = 'KH-2026-000123'
const FOUND_INVOICE_NUMBER = 'KIN-2026-7'

/** A lekérdező XML multipart-mezőneve (a kiállítóé az action-xmlagentxmlfile). */
const LOOKUP_FIELD = 'action-szamla_agent_pdf'

const ENABLED_CONFIG = getSzamlazzConfig({ SZAMLAZZ_AGENT_KEY: DUMMY_AGENT_KEY })

interface RecordedFetch {
  url: string
  method: string
  form: FormData | null
}

const calls: RecordedFetch[] = []

/** A globális fetch lecserélése rögzítő mockra — hálózati hívás nélkül. */
function stubFetch(respond: () => Response): void {
  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push({
        url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        method: init?.method ?? 'GET',
        form: init?.body instanceof FormData ? init.body : null,
      })
      return respond()
    },
  )
}

function agentResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { status: 200, ...init })
}

const SUCCESS_BODY =
  '<?xml version="1.0" encoding="UTF-8"?><xmlszamlavalasz>' +
  `<sikeres>true</sikeres><szamlaszam>${FOUND_INVOICE_NUMBER}</szamlaszam>` +
  '<pdf>RFVNTVktUERGLUJBU0U2NA==</pdf></xmlszamlavalasz>'

function errorBody(code: string, message: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><xmlszamlavalasz><sikeres>false</sikeres>' +
    `<hibak><hiba><hibakod>${code}</hibakod><hibauzenet>${message}</hibauzenet></hiba></hibak>` +
    '</xmlszamlavalasz>'
  )
}

/** A ténylegesen kiküldött lekérdező XML a multipart mezőből. */
async function sentLookupXml(index = 0): Promise<string> {
  const entry = calls[index]?.form?.get(LOOKUP_FIELD) ?? null
  expect(entry, `a lekérdező XML a ${LOOKUP_FIELD} mezőben utazik`).toBeInstanceOf(Blob)
  return entry instanceof Blob ? await entry.text() : ''
}

/** A dobott hiba kinyerése típusbiztosan (nem SzamlazzApiError esetén bukik). */
async function apiErrorOf(promise: Promise<unknown>): Promise<SzamlazzApiError> {
  let captured: unknown
  try {
    await promise
  } catch (error) {
    captured = error
  }
  expect(captured, 'SzamlazzApiError-t vártunk').toBeInstanceOf(SzamlazzApiError)
  if (!(captured instanceof SzamlazzApiError)) {
    throw new Error('TESZT-HIBA: a hívás nem SzamlazzApiError hibával állt le')
  }
  return captured
}

afterEach(() => {
  calls.length = 0
  vi.unstubAllGlobals()
})

describe('buildInvoiceLookupXml — xmlszamlapdf lekérdező séma', () => {
  const xml = buildInvoiceLookupXml({ agentKey: DUMMY_AGENT_KEY, kulsoAzon: ORDER_NUMBER })

  it('a gyökér xmlszamlapdf, az agentpdf névtérrel és az élő XSD-vel', () => {
    expect(xml).toContain('<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf"')
    expect(xml).toContain('https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd')
  })

  it('élő-XSD-kompatibilis tag-sorrend: szamlaagentkulcs → valaszVerzio(2) → szamlaKulsoAzon', () => {
    // A sorrend kötött: az XSD sequence-e szerinti sorrendtől eltérve a
    // Számlázz.hu séma-hibával utasítaná el a lekérdezést.
    const order = ['<szamlaagentkulcs>', '<valaszVerzio>', '<szamlaKulsoAzon>']
    let previousIndex = -1
    for (const tag of order) {
      const index = xml.indexOf(tag)
      expect(index, tag).toBeGreaterThan(previousIndex)
      previousIndex = index
    }
    // valaszVerzio=2: a válasz ugyanaz az xmlszamlavalasz, mint kiállításnál.
    expect(xml).toContain('<valaszVerzio>2</valaszVerzio>')
    expect(xml).toContain(`<szamlaKulsoAzon>${ORDER_NUMBER}</szamlaKulsoAzon>`)
  })

  it('a bizonylatot KIZÁRÓLAG a külső azonosító jelöli ki (szamlaszam/rendelesSzam nélkül)', () => {
    // A rendelesSzam több bizonylatot is takarhat (számla + stornó + helyesbítő),
    // arra a rendszer a LEGUTOLSÓT adná vissza — a kulsoAzon a pontos kulcs.
    expect(xml).not.toContain('<rendelesSzam>')
    expect(xml).not.toContain('<szamlaszam>')
  })

  it('XML-escape a kulsoAzon-ban (a & és a < entitásként megy ki)', () => {
    const escaped = buildInvoiceLookupXml({
      agentKey: DUMMY_AGENT_KEY,
      kulsoAzon: 'KH-2026-000123&<HELYESBITO>',
    })
    expect(escaped).toContain(
      '<szamlaKulsoAzon>KH-2026-000123&amp;&lt;HELYESBITO&gt;</szamlaKulsoAzon>',
    )
    expect(escaped).not.toContain('&<HELYESBITO>')
  })
})

describe('queryInvoiceByKulsoAzon — bizonylat-lekérdezés (mockolt fetch)', () => {
  it('siker: a válasz számlaszáma jön vissza; a POST a config apiUrl-jére megy', async () => {
    stubFetch(() => agentResponse(SUCCESS_BODY))

    const result = await queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG)

    expect(result).toEqual({ szamlaszam: FOUND_INVOICE_NUMBER })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('POST')
    // ZÁRÓ PERJELLEL: a perjel nélküli alak redirectje a POST-ot GET-té
    // silányítaná, és a multipart törzs (benne az XML) elveszne.
    expect(calls[0]?.url).toBe(ENABLED_CONFIG.apiUrl)
    expect(calls[0]?.url).toBe('https://www.szamlazz.hu/szamla/')
  })

  it('a lekérdező XML az action-szamla_agent_pdf mezőben utazik, az agent-kulcs a bodyban', async () => {
    stubFetch(() => agentResponse(SUCCESS_BODY))

    await queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG)

    const form = calls[0]?.form
    expect(form, 'multipart/form-data törzs').toBeInstanceOf(FormData)
    expect(form?.has(LOOKUP_FIELD)).toBe(true)
    // A kiállító mezőnevét (action-xmlagentxmlfile) itt NEM használjuk: azzal a
    // Számlázz.hu új bizonylatot próbálna kiállítani a lekérdezés helyett.
    expect(form?.has('action-xmlagentxmlfile')).toBe(false)

    const xml = await sentLookupXml()
    expect(xml).toContain(`<szamlaagentkulcs>${DUMMY_AGENT_KEY}</szamlaagentkulcs>`)
    expect(xml).toContain(`<szamlaKulsoAzon>${ORDER_NUMBER}</szamlaKulsoAzon>`)
    // Az agent-kulcs SOSEM kerülhet az URL-be (naplókban, proxykon átmenne).
    expect(calls[0]?.url).not.toContain(DUMMY_AGENT_KEY)
  })

  it('7-es hibakód: nincs ilyen bizonylat → null (NEM hiba)', async () => {
    stubFetch(() =>
      agentResponse(
        errorBody(SZAMLAZZ_NOT_FOUND_CODE, 'Nincs a megadott azonosítóhoz tartozó bizonylat.'),
      ),
    )

    // Ez a normál eset az ELSŐ kiállítási kísérlet retry-ja előtt: a bizonylat
    // tényleg nem jött létre, a hívó nyugodtan beküldheti a számlát.
    await expect(queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG)).resolves.toBeNull()
  })

  it('más agent-hiba (3 — hibás bejelentkezés): SzamlazzApiError, végleges', async () => {
    stubFetch(() => agentResponse(errorBody('3', 'Sikertelen bejelentkezés.')))

    const error = await apiErrorOf(queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG))
    expect(error.kind).toBe('agent')
    expect(error.retryable).toBe(false)
    expect(error.agentErrors[0]?.code).toBe('3')
  })

  it('szlahu_down fejléc: karbantartás → retryable hiba (a body sikere sem számít)', async () => {
    stubFetch(() => agentResponse(SUCCESS_BODY, { headers: { szlahu_down: '1' } }))

    const error = await apiErrorOf(queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG))
    expect(error.retryable).toBe(true)
    expect(error.kind).toBe('http')
  })

  it('HTTP 500: retryable http-hiba a státuszkóddal (4xx viszont végleges)', async () => {
    stubFetch(() => agentResponse('<html>Szerverhiba</html>', { status: 500 }))
    const serverError = await apiErrorOf(queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG))
    expect(serverError.kind).toBe('http')
    expect(serverError.httpStatus).toBe(500)
    expect(serverError.retryable).toBe(true)

    vi.unstubAllGlobals()
    calls.length = 0
    stubFetch(() => agentResponse('<html>Hibás kérés</html>', { status: 400 }))
    const clientError = await apiErrorOf(queryInvoiceByKulsoAzon(ORDER_NUMBER, ENABLED_CONFIG))
    expect(clientError.httpStatus).toBe(400)
    expect(clientError.retryable).toBe(false)
  })

  it('kikapcsolt integrációnál invalid_data hiba, hálózati hívás NÉLKÜL', async () => {
    stubFetch(() => {
      throw new Error('TESZT-HIBA: kikapcsolt integrációnál nem mehet ki kérés')
    })

    const error = await apiErrorOf(queryInvoiceByKulsoAzon(ORDER_NUMBER, getSzamlazzConfig({})))
    expect(error.kind).toBe('invalid_data')
    expect(error.retryable).toBe(false)
    expect(calls).toHaveLength(0)
  })
})
