/**
 * Számlázz.hu Számla Agent modul (T-024/W4-01) — nyilvános belépési pont.
 */
export {
  getSzamlazzConfig,
  parseAgentResponse,
  postInvoiceXml,
  SZAMLAZZ_DEFAULT_API_URL,
  SZAMLAZZ_DEFAULT_INVOICE_PREFIX,
  SZAMLAZZ_DEFAULT_TIMEOUT_MS,
  type SzamlazzEnv,
  type SzamlazzParsedSuccess,
} from './client'
export {
  buildInvoiceXml,
  buyerFromOrder,
  computeLineAmounts,
  escapeXml,
  issueInvoiceForOrder,
  itemsFromOrder,
  VAT_RATE_PERCENT,
  type BuildInvoiceXmlInput,
  type InvoiceBuyerInput,
  type InvoiceItemInput,
  type InvoiceLineAmounts,
  type IssueInvoiceForOrderDeps,
} from './invoice'
export {
  buildStornoXml,
  issueStornoForOrder,
  postStornoXml,
  STORNO_KULSO_AZON_SUFFIX,
  type BuildStornoXmlInput,
  type IssueStornoForOrderDeps,
} from './storno'
export {
  SzamlazzApiError,
  type IssueInvoiceOutcome,
  type IssueInvoiceResult,
  type IssueStornoOutcome,
  type IssueStornoResult,
  type SzamlazzAgentError,
  type SzamlazzClientConfig,
  type SzamlazzErrorKind,
} from './types'
