import type { EmailTemplate } from '../types'
import { formatPriceHuf } from '../../format-price'
import { escapeHtml, renderLayout } from './layout'

/**
 * Vásárlás-visszaigazoló e-mail sablon (W4-03) — a paid átmenet után megy ki.
 *
 * Tartalma: rendelésszám, tétellista (bruttó), végösszeg, a kurzuselérés
 * linkje, és (ha a számlázás be van kapcsolva) a számla érkezéséről tájékoztatás.
 * Minden dinamikus érték escape-elve; az összegek a közös formatPriceHuf-fal.
 *
 * FIÓK-VÁLTOZATOK (vendég-vásárlás, 2026-08-15). A levélnek három alakja van,
 * az `account` mező szerint:
 *
 *  - `undefined` — bejelentkezett vásárlás: a vevő ismeri a fiókját, a levél
 *    változatlan (CTA: „Kurzusaim megnyitása");
 *  - `{ kind: 'password-setup' }` — a fiók MOST jött létre (vagy még nincs
 *    hozzá jelszó): a levél AKTIVÁLÓ levél is, a CTA a jelszó-beállító link.
 *    A link TITOK — aki megkapja, jelszót állíthat a fiókhoz —, ezért sem a
 *    token, sem a teljes link nem kerülhet naplóba (a hívó felel érte);
 *  - `{ kind: 'login' }` — vendégként vásárolt, de MÁR VAN működő fiókja: nem
 *    küldünk jelszó-beállítót, hanem a belépésre irányítunk.
 *
 * GENERÁLT JELSZÓ SOHA NEM SZEREPELHET a levélben — a vevő maga állít be
 * jelszót a linkkel.
 */
export interface OrderConfirmationItem {
  title: string
  quantity: number
  /** Tétel bruttó végösszege (egységár × mennyiség). */
  totalHuf: number
}

export type OrderConfirmationAccount =
  | {
      kind: 'password-setup'
      /** A személyre szóló jelszó-beállító (aktiváló) link — abszolút URL. */
      activationUrl: string
      /** A link élettartama napokban (a levélszöveghez). */
      expiresInDays: number
      /** A fiókhoz tartozó e-mail-cím („erre a címre készült a fiók"). */
      email: string
    }
  | {
      kind: 'login'
      /** A belépés oldalának abszolút URL-je. */
      loginUrl: string
      email: string
    }

export function orderConfirmationEmail(input: {
  orderNumber: string
  buyerName?: string | null
  items: OrderConfirmationItem[]
  totalHuf: number
  coursesUrl: string
  /** true, ha a Számlázz.hu-integráció aktív (a számla-hivatkozás bekerül). */
  invoiceNote: boolean
  /** A fiók állapotából adódó változat (lásd a fájl fejlécét). */
  account?: OrderConfirmationAccount
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

  let cta = { label: 'Kurzusaim megnyitása', url: input.coursesUrl }

  if (input.account?.kind === 'password-setup') {
    const account = input.account
    const created =
      `A vásárláshoz fiókot készítettünk a(z) ${account.email} címmel. ` +
      'Már csak egy jelszót kell beállítanod — utána a Kurzusaim oldalon éred el az anyagot.'
    const validity =
      `A jelszó-beállító link ${account.expiresInDays} napig érvényes, és személyre szól — kérjük, ne add tovább.`
    const notWorking =
      'Ha a link lejárt vagy nem működik, a belépési oldal „Elfelejtett jelszó" gombjával bármikor ' +
      'kérhetsz újat — ugyanezzel az e-mail-címmel.'
    paragraphsHtml.push(escapeHtml(created), `<strong>${escapeHtml(validity)}</strong>`, escapeHtml(notWorking))
    paragraphsText.push(created, validity, notWorking)
    cta = { label: 'Jelszó beállítása', url: account.activationUrl }
  } else if (input.account?.kind === 'login') {
    const account = input.account
    const existing =
      `A kurzus már elérhető a meglévő fiókodban — jelentkezz be a(z) ${account.email} címmel, ` +
      'és a Kurzusaim oldalon megtalálod.'
    const noPassword =
      'Ha nem emlékszel a jelszavadra, a belépési oldal „Elfelejtett jelszó" gombjával állíthatsz be újat.'
    paragraphsHtml.push(escapeHtml(existing), escapeHtml(noPassword))
    paragraphsText.push(existing, noPassword)
    cta = { label: 'Belépés', url: account.loginUrl }
  }

  return {
    subject: `Sikeres vásárlás — ${input.orderNumber}`,
    ...renderLayout({
      heading: 'Sikeres vásárlás',
      paragraphsHtml,
      paragraphsText,
      cta,
    }),
  }
}
