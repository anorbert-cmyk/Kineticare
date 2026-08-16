import type { EmailTemplate } from '../types'

import { escapeHtml, renderLayout } from './layout'

/**
 * Időpontkérés-értesítő a stábnak.
 *
 * MIÉRT KÜLÖN SABLON a `contactStaffEmail` helyett: annak a tárgya („Új
 * kapcsolatfelvétel") és fejléce („Új üzenet érkezett a kapcsolat űrlapról") a
 * general kapcsolat-üzenetre szól. Az időpontkérés más MUNKAFOLYAMAT: vissza
 * kell hívni valakit, tehát a levélben a TELEFONSZÁM az első adat, és a tárgyból
 * a postaláda-listán is látszania kell, hogy hívni kell.
 *
 * A panasz leírása egészségügyi adat lehet (GDPR 9. cikk (1)), ezért az
 * e-mailbe csak akkor kerül bele, ha a beküldő tényleg megadta; üresen a sor
 * kimarad, nem megy ki üres „Panasz:" fejléc.
 */
export function appointmentStaffEmail(input: {
  name: string
  phone: string
  email: string
  availability: string
  reason: string
  submittedAt: string
}): EmailTemplate {
  const rows: Array<[string, string]> = [
    ['Név', input.name],
    ['Telefon', input.phone],
    ['E-mail', input.email],
    ['Mikor alkalmas', input.availability],
    ['Beküldve', input.submittedAt],
  ].filter((row): row is [string, string] => row[1].trim().length > 0)

  const reason = input.reason.trim()

  return {
    subject: `Új időpontkérés: ${input.name} (${input.phone})`,
    ...renderLayout({
      heading: 'Új időpontkérés érkezett',
      paragraphsHtml: [
        ...rows.map(([label, value]) => `<strong>${label}:</strong> ${escapeHtml(value)}`),
        ...(reason.length > 0
          ? [`<strong>Mire kér időpontot:</strong><br />${escapeHtml(reason).replace(/\n/g, '<br />')}`]
          : []),
      ],
      paragraphsText: [
        ...rows.map(([label, value]) => `${label}: ${value}`),
        ...(reason.length > 0 ? ['', 'Mire kér időpontot:', reason] : []),
      ],
    }),
  }
}
