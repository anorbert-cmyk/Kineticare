import type { EmailTemplate } from '../types'

/**
 * Egységes, magyar e-mail váz (T-018): egyszerű, e-mail-kliens-biztos inline
 * stílusú HTML + mindig generált plain-text változat. A konkrét sablonok
 * (welcome/reset/verify/contact-staff) ezt a keretet töltik ki.
 */

const BRAND_NAME = 'Kineticare'

export interface LayoutInput {
  /** A levél címsora a vázon belül. */
  heading: string
  /** Bekezdések (HTML, biztonságos statikus tartalom + escape-elt változók). */
  paragraphsHtml: string[]
  /** Ugyanez plain-textben (soronként egy bekezdés). */
  paragraphsText: string[]
  /** Opcionális kiemelt gomb/link. */
  cta?: { label: string; url: string }
}

/** HTML-escape a sablonváltozókhoz (az e-mail-törzsben is XSS-forrás lehet). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderLayout(input: LayoutInput): Pick<EmailTemplate, 'html' | 'text'> {
  const paragraphsHtml = input.paragraphsHtml
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333333;">${paragraph}</p>`,
    )
    .join('\n')
  const ctaHtml = input.cta
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background-color:#1a7f5a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:15px;">${escapeHtml(input.cta.label)}</a></p>
<p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#666666;">Ha a gomb nem működik, másold be ezt a linket a böngésződbe:<br /><a href="${escapeHtml(input.cta.url)}" style="color:#1a7f5a;word-break:break-all;">${escapeHtml(input.cta.url)}</a></p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="hu">
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background-color:#ffffff;border-radius:8px;padding:32px;">
        <h1 style="margin:0 0 8px 0;font-size:22px;color:#1a7f5a;">${BRAND_NAME}</h1>
        <h2 style="margin:0 0 24px 0;font-size:18px;color:#111111;">${escapeHtml(input.heading)}</h2>
        ${paragraphsHtml}
        ${ctaHtml}
      </div>
      <p style="margin:16px 0 0 0;font-size:12px;color:#888888;text-align:center;">
        Ez egy automatikus üzenet a(z) ${BRAND_NAME} rendszerétől, kérjük, ne válaszolj rá.
      </p>
    </div>
  </body>
</html>`

  const textLines = [`${BRAND_NAME} — ${input.heading}`, '', ...input.paragraphsText]
  if (input.cta) {
    textLines.push('', `${input.cta.label}: ${input.cta.url}`)
  }
  textLines.push(
    '',
    `Ez egy automatikus üzenet a(z) ${BRAND_NAME} rendszerétől, kérjük, ne válaszolj rá.`,
  )

  return { html, text: textLines.join('\n') }
}
