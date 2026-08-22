import type { EmailTemplate } from '../types'

/**
 * KINETICARE LEVÉLVÁZ — a weboldal design-nyelvén.
 *
 * ═══ MIÉRT ÍRÓDOTT ÚJRA (2026-08-17) ═══
 * A korábbi váz zöld (#1a7f5a) márkaszínt használt, miközben az oldal kék.
 * A vevő ugyanazt a márkát látja két helyen, két különböző arccal, és a levél
 * nem hitelesítette magát a weboldallal. A tokenek innentől EGY forrásból
 * származnak: a `src/app/(frontend)/styles/tokens.css` értékei.
 *
 * ═══ MIÉRT TÁBLÁZATOS, INLINE STÍLUSSAL ═══
 * A levélkliensek CSS-támogatása nem a böngészőké. A Campaign Monitor
 * kliens-mátrixa szerint a flexbox és a CSS grid NEM megbízható, a
 * media query támogatása egyenetlen, az Outlook 2007–2016 pedig továbbra is
 * célkörnyezet — ezért a táblázatos elrendezés + inline stílus a biztonságos
 * út. https://www.campaignmonitor.com/css/
 * Következmény: itt NINCS flex, NINCS grid, minden szélesség fix vagy 100%,
 * és minden stílus a elemen ül, nem osztályon.
 *
 * ═══ AKADÁLYMENTESSÉG (Litmus: Ultimate Guide to Accessible Emails) ═══
 * https://www.litmus.com/blog/ultimate-guide-accessible-emails
 *  - `lang="hu"` a gyökérelemen: a felolvasó így ejti helyesen a magyart;
 *  - `role="presentation"` MINDEN elrendezés-táblázaton, hogy a felolvasó ne
 *    cellánként darálja a szöveget (elég a <table>-re, a <td>-kre nem);
 *  - valódi címsor-hierarchia (<h1>), nem felnagyított bekezdés;
 *  - törzsszöveg legalább 16px (a Litmus minimuma asztalon 14, mobilon 16);
 *  - a szín sosem az EGYETLEN jelentéshordozó (a gomb szöveggel is elmondja,
 *    mi történik).
 *
 * ═══ MÉRT KONTRASZTOK (WCAG 2.2 · 1.4.3, AA) ═══
 * Számolt arányok, nem becslés:
 *   fehér szöveg az accent-deep (#2f6e9f) gombon .... 5,45:1  ✓ (AA: 4,5)
 *   ink (#10243e) fehéren ........................... 15,63:1 ✓
 *   ink-soft (#33495f) fehéren ...................... 9,30:1  ✓
 *   ink-soft a tint (#e6f0f8) panelen ............... 8,05:1  ✓
 *   accent-deep (#2f6e9f) hivatkozás fehéren ........ 5,45:1  ✓
 *
 * ═══ SÖTÉT MÓD ═══
 * A `color-scheme: light` deklaráció megkéri a klienst, hogy NE fordítsa át
 * automatikusan a színeket. Az automatikus inverzió a világos márkaarcot
 * kiszámíthatatlanul mangolja (a hajszálvonalak eltűnnek, a gomb elszürkül),
 * ezért itt a világos változat a szándékolt és egyetlen arc.
 *
 * ═══ BETŰK ═══
 * A webfontok a levélkliensek többségében nem töltődnek be. A stack ezért
 * úgy épül, hogy a TARTALÉK is a márka hangját hozza: a címsor szeriffes
 * (Tenor Sans → Georgia), a törzs groteszk (Nunito Sans → rendszerfont).
 * Ugyanaz a két stack, ami a `tokens.css`-ben áll.
 */

const BRAND_NAME = 'Kineticare'

/** A weboldal tokenjei (tokens.css) — egy forrásból, hogy ne csússzanak szét. */
const SZIN = {
  papir: '#f6f9fc',
  feher: '#ffffff',
  tint: '#e6f0f8',
  ink: '#10243e',
  inkHalk: '#33495f',
  akcent: '#2f6e9f',
  hajszal: '#d8e2eb',
} as const

const BETU = {
  cim: "'Tenor Sans', Georgia, 'Times New Roman', serif",
  torzs: "'Nunito Sans', -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
} as const

/** Egy címke–érték sor a kiemelt összefoglaló panelben. */
export interface LayoutSummaryRow {
  label: string
  value: string
}

/** Egy tétel a tételtáblában (pl. megvásárolt kurzus). */
export interface LayoutItemRow {
  title: string
  /** Másodlagos sor a cím alatt (pl. „1 db"). Elhagyható. */
  meta?: string
  /** Jobbra igazított összeg, már formázva (pl. „19 990 Ft"). */
  amount?: string
}

export interface LayoutInput {
  /** A levél címsora a vázon belül (valódi <h1>). */
  heading: string
  /** Bekezdések (HTML, biztonságos statikus tartalom + escape-elt változók). */
  paragraphsHtml: string[]
  /** Ugyanez plain-textben (soronként egy bekezdés). */
  paragraphsText: string[]
  /** Opcionális kiemelt gomb/link. */
  cta?: { label: string; url: string }
  /**
   * Kis, ritkított kísérőfelirat a címsor FÖLÖTT (pl. „VISSZAIGAZOLÁS").
   * A weboldal szekció-eyebrow-jának levélbeli párja. Sima szöveg, escape-elve.
   */
  eyebrow?: string
  /**
   * Előnézeti szöveg: a postaláda listanézetében a tárgy MELLETT látszik.
   * Enélkül a kliens a levél első szavait húzza be, ami itt a wordmark lenne.
   * A levéltörzsben rejtett.
   */
  preheader?: string
  /** Kiemelt összefoglaló panel (tint háttér, címke–érték sorok). */
  summary?: { title?: string; rows: LayoutSummaryRow[] }
  /** Tételtábla (pl. rendelés tételei) opcionális végösszeg-sorral. */
  items?: {
    title?: string
    rows: LayoutItemRow[]
    totalLabel?: string
    totalValue?: string
  }
  /** Halk záró megjegyzés a kártyán belül, a gomb alatt. Sima szöveg. */
  note?: string
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

/** Elrendezés-táblázat nyitása — mindig `role="presentation"` (lásd a fejlécet). */
function tablaNyit(extraStyle = ''): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;${extraStyle}">`
}

function bekezdesekHtml(paragraphs: string[]): string {
  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0;font-family:${BETU.torzs};font-size:16px;line-height:1.7;color:${SZIN.inkHalk};">${paragraph}</p>`,
    )
    .join('\n')
}

function eyebrowHtml(eyebrow: string): string {
  return `<p style="margin:0 0 10px 0;font-family:${BETU.torzs};font-size:12px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${SZIN.akcent};">${escapeHtml(eyebrow)}</p>`
}

function summaryHtml(summary: NonNullable<LayoutInput['summary']>): string {
  const cim = summary.title
    ? `<p style="margin:0 0 12px 0;font-family:${BETU.torzs};font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;color:${SZIN.ink};">${escapeHtml(summary.title)}</p>`
    : ''
  const sorok = summary.rows
    .map(
      (row, index) =>
        `<tr>
            <td style="padding:${index === 0 ? '0' : '8px'} 12px 0 0;font-family:${BETU.torzs};font-size:14px;line-height:1.6;color:${SZIN.inkHalk};white-space:nowrap;vertical-align:top;">${escapeHtml(row.label)}</td>
            <td style="padding:${index === 0 ? '0' : '8px'} 0 0 0;font-family:${BETU.torzs};font-size:14px;line-height:1.6;color:${SZIN.ink};font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
          </tr>`,
    )
    .join('\n')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 24px 0;background-color:${SZIN.tint};border-radius:10px;">
      <tr><td style="padding:20px 24px;">
        ${cim}
        ${tablaNyit()}
          ${sorok}
        </table>
      </td></tr>
    </table>`
}

function itemsHtml(items: NonNullable<LayoutInput['items']>): string {
  const cim = items.title
    ? `<p style="margin:0 0 12px 0;font-family:${BETU.torzs};font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;color:${SZIN.ink};">${escapeHtml(items.title)}</p>`
    : ''
  const sorok = items.rows
    .map(
      (row) =>
        `<tr>
            <td style="padding:12px 12px 12px 0;border-top:1px solid ${SZIN.hajszal};font-family:${BETU.torzs};font-size:15px;line-height:1.5;color:${SZIN.ink};vertical-align:top;">
              ${escapeHtml(row.title)}${row.meta ? `<br /><span style="font-size:13px;color:${SZIN.inkHalk};">${escapeHtml(row.meta)}</span>` : ''}
            </td>
            <td style="padding:12px 0;border-top:1px solid ${SZIN.hajszal};font-family:${BETU.torzs};font-size:15px;line-height:1.5;color:${SZIN.ink};text-align:right;white-space:nowrap;vertical-align:top;">${row.amount ? escapeHtml(row.amount) : ''}</td>
          </tr>`,
    )
    .join('\n')
  const osszeg =
    items.totalLabel && items.totalValue
      ? `<tr>
            <td style="padding:14px 12px 0 0;border-top:2px solid ${SZIN.ink};font-family:${BETU.torzs};font-size:15px;line-height:1.5;color:${SZIN.ink};font-weight:700;">${escapeHtml(items.totalLabel)}</td>
            <td style="padding:14px 0 0 0;border-top:2px solid ${SZIN.ink};font-family:${BETU.torzs};font-size:17px;line-height:1.5;color:${SZIN.ink};font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(items.totalValue)}</td>
          </tr>`
      : ''
  return `<div style="margin:0 0 24px 0;">
      ${cim}
      ${tablaNyit()}
        ${sorok}
        ${osszeg}
      </table>
    </div>`
}

/**
 * „Bulletproof" gomb: a háttérszín a CELLÁN ül, nem a linken.
 * Ha a kliens elhagyja a border-radiust (Outlook), szögletes, de teljes
 * értékű, kattintható, kontrasztos gomb marad — nem esik szét linkké.
 */
function ctaHtml(cta: NonNullable<LayoutInput['cta']>): string {
  const url = escapeHtml(cta.url)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:8px 0 20px 0;">
      <tr>
        <td align="center" bgcolor="${SZIN.akcent}" style="border-radius:8px;">
          <a href="${url}" style="display:inline-block;padding:15px 32px;font-family:${BETU.torzs};font-size:16px;line-height:1;font-weight:700;color:${SZIN.feher};text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-family:${BETU.torzs};font-size:13px;line-height:1.6;color:${SZIN.inkHalk};">Ha a gomb nem működik, másold be ezt a címet a böngésződbe:<br /><a href="${url}" style="color:${SZIN.akcent};word-break:break-all;">${url}</a></p>`
}

export function renderLayout(input: LayoutInput): Pick<EmailTemplate, 'html' | 'text'> {
  const preheader = input.preheader?.trim()
  // A rejtett előnézeti szöveg után szóköz-kitöltés, különben a kliens a
  // levél további tartalmát is behúzza a listanézetbe.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${SZIN.papir};">${escapeHtml(preheader)}${'&#8199;&#65279;&#847; '.repeat(30)}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="hu">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${SZIN.papir};-webkit-font-smoothing:antialiased;">
    ${preheaderHtml}
    ${tablaNyit(`background-color:${SZIN.papir};`)}
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="border-collapse:collapse;width:100%;max-width:600px;">

            <tr>
              <td style="padding:0 4px 16px 4px;font-family:${BETU.cim};font-size:15px;line-height:1;letter-spacing:0.22em;text-transform:uppercase;color:${SZIN.ink};">Kineti<span style="color:${SZIN.akcent};">care</span></td>
            </tr>

            <tr>
              <td style="background-color:${SZIN.feher};border:1px solid ${SZIN.hajszal};border-radius:14px;padding:32px;">
                ${input.eyebrow ? eyebrowHtml(input.eyebrow) : ''}
                <h1 style="margin:0 0 20px 0;font-family:${BETU.cim};font-size:26px;line-height:1.25;font-weight:400;color:${SZIN.ink};">${escapeHtml(input.heading)}</h1>
                ${bekezdesekHtml(input.paragraphsHtml)}
                ${input.summary ? summaryHtml(input.summary) : ''}
                ${input.items ? itemsHtml(input.items) : ''}
                ${input.cta ? ctaHtml(input.cta) : ''}
                ${
                  input.note
                    ? `<p style="margin:16px 0 0 0;padding:16px 0 0 0;border-top:1px solid ${SZIN.hajszal};font-family:${BETU.torzs};font-size:13px;line-height:1.6;color:${SZIN.inkHalk};">${escapeHtml(input.note)}</p>`
                    : ''
                }
              </td>
            </tr>

            <tr>
              <td style="padding:20px 4px 0 4px;font-family:${BETU.torzs};font-size:12px;line-height:1.7;color:${SZIN.inkHalk};">
                ${BRAND_NAME} · Kézrehabilitációs online kurzusplatform<br />
                Ez egy automatikus üzenet a(z) ${BRAND_NAME} rendszerétől, erre a címre ne válaszolj.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  // §3.1.1: címke + érték = kettőspont, nem kvirtmínusz. Ez a fejsor MINDEN
  // tranzakciós levél plain-text változatának első sora.
  const textLines = [`${BRAND_NAME}: ${input.heading}`, '', ...input.paragraphsText]

  if (input.summary) {
    textLines.push('')
    if (input.summary.title) {
      textLines.push(input.summary.title)
    }
    for (const row of input.summary.rows) {
      textLines.push(`${row.label}: ${row.value}`)
    }
  }

  if (input.items) {
    textLines.push('')
    if (input.items.title) {
      textLines.push(input.items.title)
    }
    for (const row of input.items.rows) {
      const reszek = [row.title, row.meta, row.amount].filter(
        (resz): resz is string => typeof resz === 'string' && resz.length > 0,
      )
      // §3.1.1: felsorolás-elemeket vessző köt össze („cím, 2 db, 29 980 Ft").
      textLines.push(`- ${reszek.join(', ')}`)
    }
    if (input.items.totalLabel && input.items.totalValue) {
      textLines.push(`${input.items.totalLabel}: ${input.items.totalValue}`)
    }
  }

  if (input.cta) {
    textLines.push('', `${input.cta.label}: ${input.cta.url}`)
  }

  if (input.note) {
    textLines.push('', input.note)
  }

  textLines.push(
    '',
    `Ez egy automatikus üzenet a(z) ${BRAND_NAME} rendszerétől, erre a címre ne válaszolj.`,
  )

  return { html, text: textLines.join('\n') }
}
