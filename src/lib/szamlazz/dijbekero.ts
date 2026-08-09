import { createLogger } from '../logger'
import { getSzamlazzConfig, postAgentForm, throwIfSzlahuErrorHeaders } from './client'
import { SzamlazzApiError, type SzamlazzClientConfig } from './types'
import { escapeXml } from './xml'

/**
 * Díjbekérő (proforma számla) törlése a Számla Agent
 * `action-szamla_agent_dijbekero_torlese` műveletével.
 *
 * Séma-tények (hivatalos XSD: https://www.szamlazz.hu/szamla/docs/xsds/dijbekerodel/xmlszamladbkdel.xsd
 * és https://docs.szamlazz.hu/hu/agent/deleting_pro_forma_invoice/request):
 * - A kérés gyökere <xmlszamladbkdel>, benne <beallitasok> (szamlaagentkulcs)
 *   és <fejlec> (szamlaszam) — a díjbekérőt a saját sorszáma azonosítja.
 * - Díjbekérő LÉTREHOZÁSÁHOZ nincs külön művelet: a sima számla-XML
 *   <fejlec><dijbekero>true</dijbekero> taggel állítja elő (lásd buildInvoiceXml
 *   dijbekero paramétere).
 * - A VÁLASZ FEJLÉC-ALAPÚ: a sikert a szlahu_error / szlahu_error_code
 *   fejlécek HIÁNYA jelzi (a hivatalos kliens is így értelmezi) — a body nem
 *   xmlszamlavalasz, ezért itt a parseAgentResponse NEM használható.
 * - A díjbekérő NEM számla: törlése NAV-adata szolgáltatást nem érint.
 */

const logger = createLogger({ module: 'szamlazz-dijbekero' })

export interface BuildDijbekeroDeleteXmlInput {
  agentKey: string
  /** A törlendő díjbekérő sorszáma. */
  szamlaszam: string
}

/** A díjbekérő-törlés XML-je (xmlszamladbkdel) a hivatalos XSD tag-sorrendjében. */
export function buildDijbekeroDeleteXml(input: BuildDijbekeroDeleteXmlInput): string {
  const esc = escapeXml
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamladbkdel xmlns="http://www.szamlazz.hu/xmlszamladbkdel" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamladbkdel https://www.szamlazz.hu/szamla/docs/xsds/dijbekerodel/xmlszamladbkdel.xsd">
  <beallitasok>
    <szamlaagentkulcs>${esc(input.agentKey)}</szamlaagentkulcs>
  </beallitasok>
  <fejlec>
    <szamlaszam>${esc(input.szamlaszam)}</szamlaszam>
  </fejlec>
</xmlszamladbkdel>`
}

/**
 * Díjbekérő törlése sorszám alapján. Siker esetén visszatér (void); a
 * szlahu_* fejlécekben jelzett hiba, a timeout, a hálózati és a HTTP-hiba a
 * megszokott SzamlazzApiError-taxonomiával dob (retryable jelzéssel).
 */
export async function deleteDijbekero(
  szamlaszam: string,
  config?: SzamlazzClientConfig,
): Promise<void> {
  const resolved = config ?? getSzamlazzConfig()
  if (!resolved.enabled || !resolved.agentKey) {
    throw new SzamlazzApiError({
      message: 'A Számlázz.hu-integráció nincs beállítva (SZAMLAZZ_AGENT_KEY hiányzik).',
      kind: 'invalid_data',
      retryable: false,
    })
  }

  const endpoint = 'POST /szamla (action-szamla_agent_dijbekero_torlese)'
  const xml = buildDijbekeroDeleteXml({ agentKey: resolved.agentKey, szamlaszam })
  const response = await postAgentForm({
    config: resolved,
    formField: 'action-szamla_agent_dijbekero_torlese',
    fileName: 'szamladbkdel.xml',
    xml,
    endpoint,
  })

  // Fejléc-alapú válasz: a szlahu_error/szlahu_error_code (és szlahu_down)
  // jelzi a hibát — ezek hiányában a törlés sikeres.
  throwIfSzlahuErrorHeaders(response.headers)

  logger.info('Számlázz.hu díjbekérő törölve', { endpoint, szamlaszam })
}
