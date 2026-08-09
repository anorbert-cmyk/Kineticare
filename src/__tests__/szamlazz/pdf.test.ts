import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSzamlazzConfig } from '../../lib/szamlazz/client'
import { issueInvoiceForOrder } from '../../lib/szamlazz/invoice'
import {
  archiveInvoicePdf,
  buildInvoicePdfQueryXml,
  fetchInvoicePdf,
} from '../../lib/szamlazz/pdf'
import { SzamlazzApiError } from '../../lib/szamlazz/types'
import type { Order } from '../../payload-types'

/**
 * Számla-PDF letöltés (action-szamla_agent_pdf) és media-archiválás
 * egységtesztek — XML-építés az agentpdf XSD szerint, bináris/XML
 * válaszfelismerés, hibaágak, és a best-effort archiválás viselkedése az
 * issueInvoiceForOrder issued ágában.
 *
 * Séma-forrás: https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd
 *
 * DUMMY érték, egyértelműen jelölve — NEM valódi Számla Agent kulcs.
 */
const DUMMY_AGENT_KEY = 'DUMMY-AGENT-KULCS-NEM-VALODI-TITOK'

const ORDER_NUMBER = 'KH-2026-000123'
const SZAMLASZAM = 'KIN-2026-7'
const VEVOIFIOK_URL = 'https://www.szamlazz.hu/vevoifiok/abc'

const ENABLED_CONFIG = getSzamlazzConfig({ SZAMLAZZ_AGENT_KEY: DUMMY_AGENT_KEY })

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
})

/** A legutóbbi fetch-hívás multipart-mezőinek kinyerése (mezőnév → XML-szöveg). */
async function lastMultipartFields(): Promise<Record<string, string>> {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit]
  const form = call[1].body as FormData
  const fields: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    fields[key] = value instanceof Blob ? await value.text() : String(value)
  }
  return fields
}

function pdfResponse(): Response {
  const bytes = new TextEncoder().encode('%PDF-1.4 demo tartalom %%EOF')
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } })
}

describe('buildInvoicePdfQueryXml — agentpdf séma (lapos gyökér)', () => {
  const xml = buildInvoicePdfQueryXml({ agentKey: DUMMY_AGENT_KEY, szamlaszam: SZAMLASZAM })

  it('a gyökér xmlszamlapdf, az agentpdf XSD-vel; NINCS beallitasok/fejlec blokk', () => {
    expect(xml).toContain('<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf"')
    expect(xml).toContain('https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd')
    expect(xml).not.toContain('<beallitasok>')
    expect(xml).not.toContain('<fejlec>')
  })

  it('agent-kulcs, számlaszám és valaszVerzio=2 a lapos sorrendben', () => {
    expect(xml).toContain(`<szamlaagentkulcs>${DUMMY_AGENT_KEY}</szamlaagentkulcs>`)
    expect(xml).toContain(`<szamlaszam>${SZAMLASZAM}</szamlaszam>`)
    expect(xml).toContain('<valaszVerzio>2</valaszVerzio>')
    const kulcsIndex = xml.indexOf('<szamlaagentkulcs>')
    const szamlaszamIndex = xml.indexOf('<szamlaszam>')
    const verzioIndex = xml.indexOf('<valaszVerzio>')
    expect(kulcsIndex).toBeLessThan(szamlaszamIndex)
    expect(szamlaszamIndex).toBeLessThan(verzioIndex)
  })

  it('XML-escape: a számlaszámban a speciális jel entitás', () => {
    const escaped = buildInvoicePdfQueryXml({ agentKey: DUMMY_AGENT_KEY, szamlaszam: 'KIN<1>' })
    expect(escaped).toContain('<szamlaszam>KIN&lt;1&gt;</szamlaszam>')
  })
})

describe('fetchInvoicePdf', () => {
  it('boldog út: %PDF bináris válasz → a bájtok visszaadva; a kérés action-szamla_agent_pdf mezőben megy', async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse())
    const bytes = await fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(new TextDecoder().decode(bytes)).toContain('%PDF-')

    const fields = await lastMultipartFields()
    expect(Object.keys(fields)).toEqual(['action-szamla_agent_pdf'])
    expect(fields['action-szamla_agent_pdf']).toContain(`<szamlaszam>${SZAMLASZAM}</szamlaszam>`)
    expect(fields['action-szamla_agent_pdf']).toContain(`<szamlaagentkulcs>${DUMMY_AGENT_KEY}</szamlaagentkulcs>`)
  })

  it('XML-hibaválasz (sikeres=false + hibakod) → agent-kind hiba, nem retryable', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        '<?xml version="1.0"?><xmlszamlavalasz><sikeres>false</sikeres><hibakod>151</hibakod><hibauzenet>Nincs ilyen számla</hibauzenet></xmlszamlavalasz>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } },
      ),
    )
    try {
      await fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)
      expect.unreachable()
    } catch (error) {
      const apiError = error as SzamlazzApiError
      expect(apiError).toBeInstanceOf(SzamlazzApiError)
      expect(apiError.kind).toBe('agent')
      expect(apiError.retryable).toBe(false)
      expect(apiError.agentErrors).toEqual([{ code: '151', message: 'Nincs ilyen számla' }])
    }
  })

  it('szlahu_error fejléc → agent hiba akkor is, ha a body PDF lenne', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new TextEncoder().encode('%PDF-1.4 x %%EOF'), {
        status: 200,
        headers: { szlahu_error: 'Hibás agent kulcs', szlahu_error_code: '51' },
      }),
    )
    await expect(fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      kind: 'agent',
      retryable: false,
    })
  })

  it('szlahu_down fejléc → retryable hiba', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new TextEncoder().encode('%PDF-1.4 x %%EOF'), {
        status: 200,
        headers: { szlahu_down: '1' },
      }),
    )
    await expect(fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      retryable: true,
    })
  })

  it('nem-PDF, nem-XML body → invalid_response, nem retryable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>502 bad gateway</html>', { status: 200 }))
    await expect(fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      kind: 'invalid_response',
      retryable: false,
    })
  })

  it('timeout (AbortError) → timeout-kind, retryable', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))
    await expect(fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    })
  })

  it('HTTP 5xx → http-kind, retryable', async () => {
    fetchMock.mockResolvedValueOnce(new Response('szerverhiba', { status: 500 }))
    await expect(fetchInvoicePdf(SZAMLASZAM, ENABLED_CONFIG)).rejects.toMatchObject({
      kind: 'http',
      httpStatus: 500,
      retryable: true,
    })
  })

  it('kikapcsolt integrációnál invalid_data (fetch nélkül)', async () => {
    await expect(fetchInvoicePdf(SZAMLASZAM, getSzamlazzConfig({}))).rejects.toMatchObject({
      kind: 'invalid_data',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// archiveInvoicePdf — media collection mentés mockolt payloaddal
// ---------------------------------------------------------------------------

const DUMMY_PDF_BYTES = new TextEncoder().encode('%PDF-1.4 demo %%EOF')

describe('archiveInvoicePdf', () => {
  it('payload.create a media collectionbe, application/pdf mimetypetel; a visszaadott URL a media url', async () => {
    const createCalls: Array<{ data: unknown; file: { mimetype: string; name: string; size: number } }> = []
    const payload = {
      create: async (args: { data: unknown; file: { mimetype: string; name: string; size: number } }) => {
        createCalls.push(args)
        return { id: 555, url: `/api/media/file/${args.file.name}`, filename: args.file.name }
      },
    }

    const url = await archiveInvoicePdf(payload as never, { szamlaszam: SZAMLASZAM, pdfBytes: DUMMY_PDF_BYTES })

    expect(url).toBe('/api/media/file/szamla-KIN-2026-7.pdf')
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0]?.file.mimetype).toBe('application/pdf')
    expect(createCalls[0]?.file.name).toBe('szamla-KIN-2026-7.pdf')
    expect(createCalls[0]?.file.size).toBe(DUMMY_PDF_BYTES.byteLength)
  })

  it('a fájlnév fájlrendszer-biztos (a számlaszám speciális jelei kötőjelre cserélve)', async () => {
    let seenName = ''
    const payload = {
      create: async (args: { file: { name: string } }) => {
        seenName = args.file.name
        return { id: 1, url: null, filename: args.file.name }
      },
    }
    await archiveInvoicePdf(payload as never, { szamlaszam: 'KIN 2026/7', pdfBytes: DUMMY_PDF_BYTES })
    expect(seenName).toBe('szamla-KIN-2026-7.pdf')
  })

  it('url hiányában a filename-ből épít /api/media/file/ URL-t; filename nélkül null', async () => {
    const withFilename = {
      create: async () => ({ id: 1, url: null, filename: 'szamla-KIN-2026-7.pdf' }),
    }
    await expect(
      archiveInvoicePdf(withFilename as never, { szamlaszam: SZAMLASZAM, pdfBytes: DUMMY_PDF_BYTES }),
    ).resolves.toBe('/api/media/file/szamla-KIN-2026-7.pdf')

    const withoutAnything = { create: async () => ({ id: 1, url: null, filename: null }) }
    await expect(
      archiveInvoicePdf(withoutAnything as never, { szamlaszam: SZAMLASZAM, pdfBytes: DUMMY_PDF_BYTES }),
    ).resolves.toBeNull()
  })

  it('a payload.create hibája propagálódik (a hívó best-effort ága kezeli)', async () => {
    const payload = {
      create: async () => {
        throw new Error('DB nem elérhető')
      },
    }
    await expect(
      archiveInvoicePdf(payload as never, { szamlaszam: SZAMLASZAM, pdfBytes: DUMMY_PDF_BYTES }),
    ).rejects.toThrow('DB nem elérhető')
  })
})

// ---------------------------------------------------------------------------
// issueInvoiceForOrder — a PDF-archiválás best-effort bekötése az issued ágban
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
    create: async (args: { file: { name: string } }) => ({
      id: 900,
      url: `/api/media/file/${args.file.name}`,
      filename: args.file.name,
    }),
  }
  return { payload: payload as never, updates, order }
}

describe('issueInvoiceForOrder — számla-PDF archiválás (best-effort)', () => {
  it('sikeres PDF-letöltés + media-mentés: az invoicePdfUrl a SAJÁT media URL lesz', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const fetchedFor: string[] = []
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      issueDate: '2026-08-04',
      postXml: async () => ({ szamlaszam: SZAMLASZAM, vevoifiokUrl: VEVOIFIOK_URL }),
      fetchPdf: async (szamlaszam) => {
        fetchedFor.push(szamlaszam)
        return DUMMY_PDF_BYTES
      },
    })

    expect(result).toEqual({ outcome: 'issued', invoiceNumber: SZAMLASZAM })
    expect(fetchedFor).toEqual([SZAMLASZAM])
    expect(order?.invoicePdfUrl).toBe('/api/media/file/szamla-KIN-2026-7.pdf')
    expect(order?.invoiceStatus).toBe('issued')
  })

  it('PDF-letöltési hiba: a számla issued marad, az invoicePdfUrl a vevői fiók URL-re esik vissza', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      postXml: async () => ({ szamlaszam: SZAMLASZAM, vevoifiokUrl: VEVOIFIOK_URL }),
      fetchPdf: async () => {
        throw new SzamlazzApiError({ message: 'timeout', kind: 'timeout', retryable: true })
      },
    })

    expect(result.outcome).toBe('issued')
    expect(order?.invoiceStatus).toBe('issued')
    expect(order?.invoiceNumber).toBe(SZAMLASZAM)
    expect(order?.invoicePdfUrl).toBe(VEVOIFIOK_URL)
  })

  it('media-mentési hiba (create dob): ugyanúgy vevői fiók URL-fallback, issued marad', async () => {
    const { payload, order, updates } = createMockPayload(createOrder())
    const brokenPayload = {
      ...(payload as unknown as Record<string, unknown>),
      create: async () => {
        throw new Error('tárhely hiba')
      },
    }
    const result = await issueInvoiceForOrder({
      payload: brokenPayload as never,
      orderId: 101,
      config: ENABLED_CONFIG,
      postXml: async () => ({ szamlaszam: SZAMLASZAM, vevoifiokUrl: VEVOIFIOK_URL }),
      fetchPdf: async () => DUMMY_PDF_BYTES,
    })

    expect(result.outcome).toBe('issued')
    expect(order?.invoicePdfUrl).toBe(VEVOIFIOK_URL)
    const issuedUpdate = updates.find((entry) => entry.invoiceStatus === 'issued')
    expect(issuedUpdate?.invoicePdfUrl).toBe(VEVOIFIOK_URL)
  })

  it('sem vevői fiók URL, sem PDF: az invoicePdfUrl kulcs nem kerül mentésre', async () => {
    const { payload, order, updates } = createMockPayload(createOrder())
    const result = await issueInvoiceForOrder({
      payload,
      orderId: 101,
      config: ENABLED_CONFIG,
      postXml: async () => ({ szamlaszam: SZAMLASZAM }),
      fetchPdf: async () => {
        throw new Error('nincs PDF')
      },
    })

    expect(result.outcome).toBe('issued')
    expect(order?.invoiceNumber).toBe(SZAMLASZAM)
    const issuedUpdate = updates.find((entry) => entry.invoiceStatus === 'issued')
    expect(issuedUpdate).toBeDefined()
    expect(issuedUpdate).not.toHaveProperty('invoicePdfUrl')
  })
})
