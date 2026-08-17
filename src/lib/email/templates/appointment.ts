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
/**
 * Időpontkérés-VISSZAIGAZOLÓ a BEKÜLDŐNEK.
 *
 * ═══ MIÉRT KELLETT MEGÍRNI (2026-08-17) ═══
 * Az időpontkérő űrlap e-mail-mezője alatt ez a súgószöveg áll: „Ide küldünk
 * visszaigazolást, ha telefonon nem érünk el." Ez eddig NEM volt igaz: a
 * beküldés után kizárólag a stáb kapott levelet, a beküldő semmit. Aki megadta
 * az e-mail-címét, az egy meg nem tartott ígéretet kapott.
 *
 * ═══ NINCS GOMB, ÉS EZ SZÁNDÉKOS ═══
 * Ebben a levélben a következő lépés MINÁLUNK van: mi hívjuk vissza. Egy
 * kiemelt gomb azt sugallná, hogy a címzettnek dolga van, holott nincs.
 * A hivatkozás ezért halk, folyószövegben áll, arra az EGY esetre, ha közben
 * változna valami.
 *
 * ═══ ADATTAKARÉKOSSÁG (GDPR 5. cikk (1) c) ═══
 * A visszaigazolás SZÁNDÉKOSAN nem írja vissza a „Mire kérsz időpontot?"
 * mezőt. Az ott megadott panasz egészségügyi adat lehet (GDPR 9. cikk (1)),
 * és a visszaigazoláshoz semmi szükség rá: a beküldő tudja, mit írt. Egy
 * postaláda-értesítő, egy megosztott képernyő vagy egy továbbküldött levél
 * viszont kiteheti mások szeme elé. Amit nem küldünk el, az nem szivároghat.
 */
export function appointmentCustomerEmail(input: {
  name: string
  phone: string
  availability: string
  /** A /kapcsolat lap abszolút URL-je (elérhetőségek). Üresen a link kimarad. */
  contactUrl?: string
}): EmailTemplate {
  const name = input.name.trim()
  const greeting = name ? `Kedves ${name}!` : 'Szia!'

  const mit =
    'Megkaptuk az időpontkérésed. Ez még nem foglalás: két munkanapon belül ' +
    'telefonon keresünk, és közösen egyeztetjük a pontos időpontot.'
  const elso = 'Az első alkalom minden esetben 50 perces vizsgálattal kezdődik.'
  const contactUrl = input.contactUrl?.trim()
  const haValtozik = contactUrl
    ? 'Ha közben bármi változna, vagy nem érnénk el telefonon, a rendelőink telefonszámait a kapcsolat oldalon találod.'
    : 'Ha közben bármi változna, vagy nem érnénk el telefonon, keress minket a rendelőink telefonszámain.'

  const rows: Array<[string, string]> = [
    ['Név', name],
    ['Telefonszám', input.phone],
    ['Mikor alkalmas', input.availability],
  ].filter((row): row is [string, string] => row[1].trim().length > 0)

  return {
    subject: 'Megkaptuk az időpontkérésed — Kineticare',
    ...renderLayout({
      preheader: 'Két munkanapon belül telefonon keresünk a pontos időpontért.',
      eyebrow: 'Időpontkérés',
      heading: 'Megkaptuk az időpontkérésed',
      paragraphsHtml: [
        escapeHtml(greeting),
        escapeHtml(mit),
        escapeHtml(elso),
        contactUrl
          ? `Ha közben bármi változna, vagy nem érnénk el telefonon, a rendelőink telefonszámait a <a href="${escapeHtml(contactUrl)}" style="color:#2f6e9f;">kapcsolat oldalon</a> találod.`
          : escapeHtml(haValtozik),
      ],
      paragraphsText: [
        greeting,
        mit,
        elso,
        contactUrl ? `${haValtozik} ${contactUrl}` : haValtozik,
      ],
      ...(rows.length > 0
        ? {
            summary: {
              title: 'Amit megadtál',
              rows: rows.map(([label, value]) => ({ label, value })),
            },
          }
        : {}),
      note: 'Ha nem te kérted ezt az időpontot, hagyd figyelmen kívül ezt a levelet, és nem keresünk.',
    }),
  }
}

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
