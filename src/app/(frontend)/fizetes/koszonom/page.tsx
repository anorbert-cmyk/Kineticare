import type { Metadata } from 'next'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { ThankYouView } from '@/components/checkout/ThankYouView'

export const metadata: Metadata = {
  title: 'Köszönjük a vásárlást',
  description: 'A fizetésedet feldolgozzuk — hamarosan eléred a kurzust.',
}

interface KoszonjukPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * /fizetes/koszonom — a Barion redirect célja (a T-021 redirectUrl-ja).
 *
 * A köszönőoldal a rendelés-státuszt 2 mp-enként poll-ozza (a T-022
 * callback aszinkron — a `paid` átmenet késhet). A `order` query-param a
 * rendelésszám (a Barion visszairányításakor a T-021 által beállított
 * redirectUrl-ből, vagy a checkout-válaszból).
 *
 * ═══ MIÉRT NINCS ITT SZERVER-OLDALI `payload.auth` ═══
 * Ez az oldal MINDIG kereszt-oldali navigációval nyílik meg: a Barion a
 * `secure.barion.com`-ról irányít vissza (src/lib/checkout/start-checkout.ts,
 * `redirectUrl`). Egy ilyen top-level GET-navigáció `Origin` fejlécet nem
 * küld, `Sec-Fetch-Site: cross-site` viszont igen — és a nem üres
 * `csrf`-engedélylista mellett a Payload `extractJWT`-je pontosan ilyenkor
 * DOBJA EL a süti-tokent (node_modules/payload/dist/auth/extractJWT.js, a
 * cookie-ág Sec-Fetch-Site tartaléka). Valódi Chromiummal kimérve: a jelölés
 * a szerver-átirányítás után is `cross-site` marad, tehát semmilyen redirect
 * nem menti meg.
 *
 * Ha tehát a bejelentkezettséget ITT, szerveren döntenénk el, a frissen fizető
 * vásárló MINDEN esetben a „jelentkezz be" nézetet kapná a „Köszönjük a
 * vásárlást!" helyett. Ezért a hitelesítést a KLIENS-oldali poll végzi: az egy
 * azonos eredetű `fetch`, ami KÜLD `Origin` fejlécet, tehát átmegy a
 * csrf-szűrőn. A 401-et a `pollOrderStatus` `unauthorized`-ra képezi, és a
 * nézet ugyanazt a belépés-ajánlót rendereli — csak most akkor, amikor a
 * látogató tényleg nincs bejelentkezve.
 */
export default async function KoszonjukPage({ searchParams }: KoszonjukPageProps) {
  const params = await searchParams

  const orderParam = params.order
  const orderNumber = typeof orderParam === 'string' && orderParam.trim().length > 0 ? orderParam.trim() : null

  return (
    <Section>
      <Container size="narrow">
        <ThankYouView orderNumber={orderNumber} />
      </Container>
    </Section>
  )
}
