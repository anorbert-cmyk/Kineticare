import type { EmailTemplate } from '../types'
import { formatPriceHuf } from '../../format-price'
import { escapeHtml, renderLayout } from './layout'

/**
 * Vásárlás-visszaigazoló e-mail sablon (W4-03) — a paid átmenet után megy ki.
 *
 * Tartalma: rendelésszám, tétellista (bruttó), végösszeg, a kurzuselérés
 * linkje, és (ha a számlázás be van kapcsolva) a számla érkezéséről tájékoztatás.
 * Minden dinamikus érték escape-elve; az összegek a közös formatPriceHuf-fal.
 */
export interface OrderConfirmationItem {
  title: string
  quantity: number
  /** Tétel bruttó végösszege (egységár × mennyiség). */
  totalHuf: number
}

export function orderConfirmationEmail(input: {
  orderNumber: string
  buyerName?: string | null
  items: OrderConfirmationItem[]
  totalHuf: number
  coursesUrl: string
  /** true, ha a Számlázz.hu-integráció aktív (a számla-hivatkozás bekerül). */
  invoiceNote: boolean
}): EmailTemplate {
  const greeting = input.buyerName?.trim() ? `Kedves ${input.buyerName.trim()}!` : 'Szia!'
  const itemLinesHtml = input.items.map(
    (item) =>
      `<strong>${escapeHtml(item.title)}</strong> — ${item.quantity} db — ${escapeHtml(
        formatPriceHuf(item.totalHuf),
      )}`,
  )
  const itemLinesText = input.items.map(
    (item) => `${item.title} — ${item.quantity} db — ${formatPriceHuf(item.totalHuf)}`,
  )

  const paragraphsHtml = [
    escapeHtml(greeting),
    `Köszönjük a vásárlásod! A fizetésed sikeres, a kurzushozzáférésed aktív.`,
    `<strong>Rendelésszám:</strong> ${escapeHtml(input.orderNumber)}`,
    `<strong>Tételek:</strong><br />${itemLinesHtml.join('<br />')}`,
    `<strong>Végösszeg:</strong> ${escapeHtml(formatPriceHuf(input.totalHuf))}`,
  ]
  const paragraphsText = [
    greeting,
    'Köszönjük a vásárlásod! A fizetésed sikeres, a kurzushozzáférésed aktív.',
    `Rendelésszám: ${input.orderNumber}`,
    'Tételek:',
    ...itemLinesText,
    `Végösszeg: ${formatPriceHuf(input.totalHuf)}`,
  ]
  if (input.invoiceNote) {
    paragraphsHtml.push('A számlát a Számlázz.hu rendszeréből külön e-mailben küldjük el.')
    paragraphsText.push('A számlát a Számlázz.hu rendszeréből külön e-mailben küldjük el.')
  }

  return {
    subject: `Sikeres vásárlás — ${input.orderNumber}`,
    ...renderLayout({
      heading: 'Sikeres vásárlás',
      paragraphsHtml,
      paragraphsText,
      cta: { label: 'Kurzusaim megnyitása', url: input.coursesUrl },
    }),
  }
}
