import Link from 'next/link'

import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import {
  NOT_FOUND_CHECKS,
  NOT_FOUND_CONTACT_EMAIL,
  NOT_FOUND_DESTINATIONS,
  NOT_FOUND_DESTINATIONS_LABEL,
  NOT_FOUND_LEAD,
  NOT_FOUND_PRIMARY_ACTION,
  NOT_FOUND_SECONDARY_ACTION,
  NOT_FOUND_TITLE,
} from './not-found-content'

/**
 * A „nem található" oldal TÖRZSE. Egy komponens, két beépítési hely:
 *
 *  1. `src/app/(frontend)/not-found.tsx` — ide fut minden SAJÁT route-unk
 *     `notFound()` hívása (`/[slug]`, `/kurzusok/[slug]`, `/blog/[slug]`,
 *     `/blog/kategoria/[slug]`). Itt a `(frontend)` layout adja a fejlécet és
 *     a láblécet, ezért a törzs csak a tartalmat hozza.
 *  2. `src/app/global-not-found.tsx` — ide fut minden NEM ILLESZKEDŐ URL
 *     (pl. `/egy/ket/harom`). Az a fájl a Next konvenciója szerint layout
 *     nélkül, saját `<html>`/`<body>`-val renderel, ezért ott egy egyszerűsített
 *     keretbe ágyazva jelenik meg ugyanez a törzs.
 *
 * Miért kell a kettő: a Next.js 16 App Routerében a gyökérszintű, nem
 * illeszkedő URL-eket a `not-found.js` csak akkor kapja el, ha az az `app/`
 * GYÖKERÉBEN áll, egyetlen gyökér-layout alatt. Ennek a projektnek KÉT
 * gyökér-layoutja van (`(frontend)` és `(payload)`), és a hivatalos
 * dokumentáció pontosan erre az esetre írja elő a `global-not-found`-ot:
 * „Your app has multiple root layouts …, so there's no single layout to compose
 * a global 404 from."
 * https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 *
 * TARTALMI DÖNTÉSEK (forrásokkal, a szövegek a `not-found-content.ts`-ben):
 *
 * - Nincs zsákutca: a törzsben öt kattintható cél van (két gomb, két lista-elem,
 *   plusz az e-mail), és MIND KÜLÖNBÖZŐ helyre visz. Az NN/g szerint a hibaoldal legfontosabb
 *   dolga, hogy a látogató újratájékozódhasson, és „avoid making navigational
 *   dead ends":
 *   https://www.nngroup.com/articles/improving-dreaded-404-error-message/
 * - Egy elsődleges cselekvés, mellette másodlagos: a GOV.UK
 *   „one thing per page" logikája szerint a lap ne kínáljon több egyenrangú
 *   akciót; a többi cél nem gomb, hanem lista-link.
 *   https://design-system.service.gov.uk/patterns/page-not-found-pages/
 * - Ami navigál, az LINK, nem gomb (a `Button` `href`-fel `next/link`-et
 *   renderel), így a jobbklikk, az új lapon nyitás és a billentyűzet a
 *   megszokott módon működik.
 *
 * AKADÁLYMENTESSÉG
 * - A `nav` elem `aria-label`-t kap, mert a lapon a fejléc-navigáció mellett ez
 *   a második navigációs landmark (WCAG 2.2 · 1.3.1, 2.4.1).
 * - A célok szövege önmagában is érthető, nem „ide kattints"
 *   (WCAG 2.2 · 2.4.4 Link Purpose (In Context)):
 *   https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
 * - Az érintőcélokat a `.kc-error-page__dest-link` 44px-es minimum magassága
 *   tartja (WCAG 2.2 · 2.5.8 Target Size (Minimum) 24×24 CSS px a küszöb, a
 *   projekt célja 44×44):
 *   https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 */
export function NotFoundView() {
  return (
    <Section>
      {/* Felvezető sor (eyebrow) SZÁNDÉKOSAN nincs: a régi lapon a nagy „404"
          állt itt, de a GOV.UK minta tiltja a hibakódot, egy „Nem található"
          felvezető pedig szó szerint megismételné a h1-et. A GOV.UK
          „Page not found" lapja is egyetlen címsorral indul. */}
      <Container className="kc-error-page" size="narrow">
        <h1 className="kc-error-page__title">{NOT_FOUND_TITLE}</h1>
        <p className="kc-error-page__text">{NOT_FOUND_LEAD}</p>

        <ul className="kc-error-page__checks">
          {NOT_FOUND_CHECKS.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>

        <div className="kc-error-page__actions">
          <Button href={NOT_FOUND_PRIMARY_ACTION.href}>{NOT_FOUND_PRIMARY_ACTION.label}</Button>
          <Button href={NOT_FOUND_SECONDARY_ACTION.href} variant="secondary">
            {NOT_FOUND_SECONDARY_ACTION.label}
          </Button>
        </div>

        <nav aria-labelledby="kc-404-celok" className="kc-error-page__destinations">
          <p className="kc-error-page__destinations-title" id="kc-404-celok">
            {NOT_FOUND_DESTINATIONS_LABEL}
          </p>
          <ul className="kc-error-page__dest-list">
            {NOT_FOUND_DESTINATIONS.map((destination) => (
              <li key={destination.href}>
                <Link className="kc-error-page__dest-link" href={destination.href}>
                  <span className="kc-error-page__dest-label">{destination.label}</span>
                  <span className="kc-error-page__dest-hint">{destination.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="kc-error-page__contact">
          Nem találod, amit kerestél? Írj a{' '}
          <a href={`mailto:${NOT_FOUND_CONTACT_EMAIL}`}>{NOT_FOUND_CONTACT_EMAIL}</a> címre.
        </p>
      </Container>
    </Section>
  )
}
