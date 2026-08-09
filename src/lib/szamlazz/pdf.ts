import type { Payload } from 'payload'

import { createLogger } from '../logger'
import {
  getSzamlazzConfig,
  parseAgentResponse,
  postAgentForm,
  throwIfSzlahuErrorHeaders,
} from './client'
import { SzamlazzApiError, type SzamlazzClientConfig } from './types'
import { escapeXml } from './xml'

/**
 * Számla-PDF letöltés a Számla Agent `action-szamla_agent_pdf` műveletével és
 * archiválás a Payload media collectionbe.
 *
 * Séma-tények (hivatalos XSD: https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd
 * és https://docs.szamlazz.hu/hu/agent/querying_pdf/request):
 * - A kérés XML-gyökere LAPOS (nincs beallitasok/fejlec blokk):
 *   <xmlszamlapdf><szamlaagentkulcs/><szamlaszam/><valaszVerzio>2</valaszVerzio></xmlszamlapdf>
 *   (a bizonylat szamlaszam, rendelesSzam vagy szamlaKulsoAzon alapján
 *   azonosítható — mi a kiállításkor kapott számlaszámot használjuk).
 * - A VÁLASZ SIKER ESETÉN BINÁRIS PDF (application/pdf), hiba esetén XML
 *   (xmlszamlavalasz <sikeres>false</sikeres>) és/vagy szlahu_* fejlécek.
 *   Ezért a siker-felismerés: szlahu_* fejléc-ellenőrzés, majd %PDF-
 *   magic bytes; minden más body XML-hibaként értelmezett.
 * - A PDF bináris SOSEM kerül a naplóba (csak méret/metaadat).
 */

const logger = createLogger({ module: 'szamlazz-pdf' })

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] // '%PDF-'

function startsWithPdfMagic(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte)
}

export interface BuildInvoicePdfQueryXmlInput {
  agentKey: string
  /** A lekérendő bizonylat számlaszáma (a kiállításkor kapott érték). */
  szamlaszam: string
}

/** A PDF-lekérés XML-je (xmlszamlapdf) a hivatalos XSD tag-sorrendjében. */
export function buildInvoicePdfQueryXml(input: BuildInvoicePdfQueryXmlInput): string {
  const esc = escapeXml
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlapdf https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd">
  <szamlaagentkulcs>${esc(input.agentKey)}</szamlaagentkulcs>
  <szamlaszam>${esc(input.szamlaszam)}</szamlaszam>
  <valaszVerzio>2</valaszVerzio>
</xmlszamlapdf>`
}

/**
 * A kiállított számla PDF-jének letöltése. Siker esetén a PDF bájtokkal tér
 * vissza; XML-hibaválasz / szlahu_* fejléc / timeout / hálózati / HTTP-hiba
 * esetén a megszokott SzamlazzApiError-taxonomiával dob (a retryable jelzés
 * változatlan). A PDF bináris nem naplózott.
 */
export async function fetchInvoicePdf(
  szamlaszam: string,
  config?: SzamlazzClientConfig,
): Promise<Uint8Array> {
  const resolved = config ?? getSzamlazzConfig()
  if (!resolved.enabled || !resolved.agentKey) {
    throw new SzamlazzApiError({
      message: 'A Számlázz.hu-integráció nincs beállítva (SZAMLAZZ_AGENT_KEY hiányzik).',
      kind: 'invalid_data',
      retryable: false,
    })
  }

  const endpoint = 'POST /szamla (action-szamla_agent_pdf)'
  const xml = buildInvoicePdfQueryXml({ agentKey: resolved.agentKey, szamlaszam })
  const response = await postAgentForm({
    config: resolved,
    formField: 'action-szamla_agent_pdf',
    fileName: 'szamlapdf.xml',
    xml,
    endpoint,
  })

  // A szlahu_* hibafejlécek a bináris válasz mellett is elsődlegesek.
  throwIfSzlahuErrorHeaders(response.headers)

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (startsWithPdfMagic(bytes)) {
    logger.info('Számlázz.hu számla-PDF letöltve', {
      endpoint,
      szamlaszam,
      pdfBytes: bytes.byteLength,
    })
    return bytes
  }

  // Nem PDF a válasz — a dokumentált hibaág XML-ben érkezik.
  const bodyText = new TextDecoder().decode(bytes)
  parseAgentResponse(bodyText, response.headers)
  // Elméleti ág: <sikeres>true</sikeres> PDF nélkül — nem értelmezhető.
  throw new SzamlazzApiError({
    message: 'A Számlázz.hu PDF-lekérésre nem PDF-fájlt adott vissza.',
    kind: 'invalid_response',
    retryable: false,
  })
}

// ---------------------------------------------------------------------------
// Archiválás a media collectionbe
// ---------------------------------------------------------------------------

export interface ArchiveInvoicePdfInput {
  szamlaszam: string
  pdfBytes: Uint8Array
}

/** Fájlnév-biztos számlaszám (a Számlázz.hu számlaszám kötőjeles, de legyen védett). */
function pdfFileName(szamlaszam: string): string {
  const safe = szamlaszam.trim().replace(/[^a-zA-Z0-9._-]+/g, '-') || 'ismeretlen'
  return `szamla-${safe}.pdf`
}

/**
 * A letöltött számla-PDF mentése a media collectionbe (a collection
 * application/pdf-et is elfogad — raszterkép-feldolgozás PDF-re nem fut,
 * a bináris érintetlenül tárolódik). Visszatérés: a média URL
 * (/api/media/file/<fájlnév>), amely az orders.invoicePdfUrl-be kerül;
 * null, ha a létrejött dokumentumból nem állítható elő URL.
 *
 * A hívó feladata a best-effort kezelés (hiba esetén a vevői fiók URL marad).
 */
export async function archiveInvoicePdf(
  payload: Payload,
  input: ArchiveInvoicePdfInput,
): Promise<string | null> {
  const fileName = pdfFileName(input.szamlaszam)
  const media = await payload.create({
    collection: 'media',
    data: {
      alt: `Kineticare számla (${input.szamlaszam})`,
    },
    file: {
      data: Buffer.from(input.pdfBytes),
      mimetype: 'application/pdf',
      name: fileName,
      size: input.pdfBytes.byteLength,
    },
    overrideAccess: true,
  })

  const url =
    typeof media.url === 'string' && media.url.length > 0
      ? media.url
      : typeof media.filename === 'string' && media.filename.length > 0
        ? `/api/media/file/${encodeURIComponent(media.filename)}`
        : null

  logger.info('számla-PDF archiválva a media collectionbe', {
    mediaId: media.id,
    szamlaszam: input.szamlaszam,
    pdfBytes: input.pdfBytes.byteLength,
    url,
  })
  return url
}
