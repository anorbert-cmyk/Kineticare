import Link from 'next/link'

import type { Product } from '../../../payload-types'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'
import { ProductCard } from '../ProductCard'

import '../../../app/(frontend)/styles/blocks/course-cards.css'

/**
 * CourseCards — a FIZETŐS kurzusok kiemelése a hitel-csík után
 * (audit M3/K1: az értékesítés motorja, kártyánként cím/előnyök/ÁR/CTA).
 *
 * CSAK FIZETŐS KÁRTYA KERÜL A RÁCSBA. 2026-08-15-ig az ingyenes lead-magnet is
 * itt állt egy „másodlagos" kártyán — a tulajdonossal közösen végzett
 * kezdőlap-audit viszont kimutatta, hogy ez DUPLIKÁCIÓ: ugyanaz az SOS-termék
 * jelent meg a rácsban ÉS közvetlenül alatta a saját, akcentes FreeSos sávban,
 * ráadásul a hero másodlagos CTA-ja (#ingyenes) is oda mutat. Az ingyenes
 * ajánlat így háromszor szerepelt az első négy szekcióban, ami pontosan a
 * K2-hiba (az UX-skill M4 pontja: „a lead-magnet nem uralhatja el az oldalt").
 * A lead-magnet helye a FreeSos szekció — a rács a fizetős ajánlaté.
 * Üres (fizetős) listánál a szekció elmarad, nincs törött üres blokk.
 *
 * Megjelenés: a landing szekció-nyelve (kis felső felirat + serif cím) és a
 * „mini-buybox" kurzuskártya (ProductCard). A közös osztályok (`kc-eyebrow`,
 * `kc-section-title`, `kc-section-lead`, `kc-text-link`) a content.css-ből
 * jönnek, a blokk-specifikus réteg a styles/blocks/course-cards.css-ben él.
 *
 * SZÖVEGEK: mind CMS-ből felülírható (`courseCards` blokk: eyebrow, heading,
 * lead, ctaLabel). Az alábbi konstansok kizárólag fallbackek — a szekció
 * akkor sem marad felirat nélkül, ha a szerkesztő üresen hagyja a mezőket.
 */

/** Felvezető sor — a `courseCards` blokk `eyebrow` mezője írja felül. */
export const DEFAULT_EYEBROW = 'Kurzusok'

/**
 * Szekciócím-fallback.
 *
 * SZÁNDÉKOSAN NEM „Így tudunk neked segíteni": az élő kezdőlapon az a cím
 * ütközött a Szolgáltatások szekció „Így tudunk segíteni" címével — két,
 * majdnem betűre azonos H2 ugyanazon a lapon (kezdőlap-audit, 2026-08-15).
 * A csere emellett a szekció DOLGÁT mondja ki: ez a blokk nem segítséget
 * ígér, hanem a megvásárolható kínálatot sorolja fel (UX-skill 1. pont: ami
 * pénzt hoz, az világos névvel, árral és CTA-val áll ki).
 */
export const DEFAULT_HEADING = 'Kurzusaink'

/** Bevezető-fallback — a blokk `lead` mezője írja felül. */
export const DEFAULT_LEAD =
  'Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni felépülésen.'

/** Fizetős-e a termék (az ár-megjelenítés szabályával azonos feltétel). */
export function isPaidProduct(product: {
  priceInHUFEnabled?: boolean | null
  priceInHUF?: number | null
}): boolean {
  return product.priceInHUFEnabled === true && typeof product.priceInHUF === 'number'
}

export interface CourseCardsProps {
  /** A fizetős kurzusok — a rács kizárólag ezeket jeleníti meg. */
  products: Product[]
  /** Felvezető-felülírás a `courseCards` blokkból — üresen a beépített marad. */
  eyebrow?: string
  /** Cím-felülírás a `courseCards` blokkból — üresen a beépített cím marad. */
  heading?: string
  /** Bevezető-felülírás a blokkból — üresen a beépített szöveg marad. */
  lead?: string
  /** A kártyák dekoratív CTA-gombjának felirata a blokkból. */
  ctaLabel?: string
  /**
   * Horgony. Alapból „kurzusok" — a sticky nav /#kurzusok linkje erre épül,
   * ezért az alapérték felülírásakor a navigáció célját is ellenőrizni kell.
   */
  id?: string
  variant?: 'default' | 'tint' | 'dark'
}

export function CourseCards({
  products,
  eyebrow,
  heading,
  lead,
  ctaLabel,
  id = 'kurzusok',
  variant = 'default',
}: CourseCardsProps) {
  if (products.length === 0) {
    return null
  }

  const eyebrowText = eyebrow?.trim() || DEFAULT_EYEBROW
  const title = heading?.trim() || DEFAULT_HEADING
  const leadText = lead?.trim() || DEFAULT_LEAD

  return (
    <Section className="kc-course-cards" id={id} variant={variant}>
      <Container>
        <div className="kc-course-cards__head">
          <p className="kc-eyebrow">{eyebrowText}</p>
          <h2 className="kc-section-title">{title}</h2>
          <p className="kc-section-lead">{leadText}</p>
        </div>
        <div className="kc-card-grid kc-card-grid--courses">
          {products.map((product) => (
            <ProductCard ctaLabel={ctaLabel} key={product.id} product={product} />
          ))}
        </div>
        <p className="kc-section-more">
          <Link className="kc-text-link kc-course-cards__link" href="/kurzusok">
            Összes kurzus megtekintése <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Container>
    </Section>
  )
}
