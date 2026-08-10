/**
 * A számla-PDF (vevői fiók) URL megbízhatósági vizsgálata — FÜGGŐSÉG NÉLKÜLI
 * levél-modul.
 *
 * Miért külön fájl: a vizsgálatot két, egymástól távoli helyen kell futtatni —
 * ÍRÁSKOR a szerveren (src/lib/szamlazz/invoice.ts, a Számlázz.hu válaszából
 * érkező `vevoifiokurl` mentése előtt) és RENDERELÉSKOR a vásárló fiók-oldalán
 * (src/components/account/AccountView.tsx, ami `'use client'`). Az `invoice.ts`
 * a Payload local API-t, a Számlázz-klienst és a naplózót is behúzza, tehát
 * kliens-komponensből NEM importálható. Ez a modul semmit nem importál, így
 * mindkét oldal UGYANAZT az egy implementációt használja — nincs másolat, ami
 * szétcsúszhatna.
 *
 * Miért kell a renderelés-oldali vizsgálat is, ha íráskor már volt egy: az
 * `orders.invoicePdfUrl` az adminban KÖZÖNSÉGES, szerkeszthető szövegmező
 * (src/plugins/ecommerce.ts) — nincs rajta `readOnly` és nincs field-szintű
 * access. Egy staff/owner tehát kézzel bármit beírhat, és az az érték a VÁSÁRLÓ
 * fiókjában kerülne `href`-be. A védelem ezért ott is kell, ahol a link
 * ténylegesen keletkezik.
 */

/** A számlalink egyetlen elfogadott hoszt-gyökere (aldomain megengedett). */
const TRUSTED_INVOICE_URL_HOST = 'szamlazz.hu'

/**
 * Megbízható-e a számlához kapott URL: KIZÁRÓLAG `https` séma, és a hoszt a
 * `szamlazz.hu` vagy annak aldomainje.
 *
 * A hoszt-egyezés nem puszta végződés-vizsgálat, hanem pontos illeszkedés vagy
 * `.`-tal elválasztott aldomain — különben a `szamlazz.hu.tamado.example` is
 * átmenne.
 *
 * Szigorúbb, mint a `sanitizeCmsUrl` (src/lib/safe-url.ts): ott a szerkesztő
 * SZÁNDÉKOSAN vihet be tetszőleges külső címet, itt viszont az érték egyetlen
 * jogos forrása a Számlázz.hu — bármi más hiba vagy visszaélés.
 */
export function isTrustedInvoicePdfUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') {
    return false
  }
  const host = parsed.hostname.toLowerCase()
  return host === TRUSTED_INVOICE_URL_HOST || host.endsWith(`.${TRUSTED_INVOICE_URL_HOST}`)
}
