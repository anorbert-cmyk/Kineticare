import Link from 'next/link'

import type { Product } from '../../../payload-types'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'
import { ProductCard } from '../ProductCard'

import '../../../app/(frontend)/styles/blocks/course-cards.css'

/**
 * CourseCards — a kurzusok kiemelése közvetlenül a hero után
 * (audit M3/K1: az értékesítés motorja, kártyánként cím/rövid leírás/ÁR/CTA).
 *
 * SORREND ÉS SÚLY. Elöl a FIZETŐS kártyák, utánuk — másodlagos stílussal — az
 * ingyenes lead-magnet. Az UX-skill M4 pontja ezt kifejezetten megengedi („a
 * fizetős blokk után VAGY azzal egy blokkban, de vizuálisan másodlagos
 * súllyal"), a K2-tilalom pedig arra vonatkozik, hogy az ingyenes ne uralja el
 * az oldalt — ezért kap halványabb keretet és sosem előzi meg a fizetőst.
 * Korábban az ingyenes kizárólag a lejjebb lévő FreeSos szekcióban szerepelt;
 * a tulajdonos 2026-08-15-én kérte, hogy a „Kurzusok" rácsban is látszódjon,
 * mert a szekció mind a kettőről szól. Üres listánál a szekció elmarad
 * (nincs törött üres blokk).
 *
 * Megjelenés: a landing szekció- és kártya-nyelve (kis felső felirat + serif
 * cím, hajszálvonalas kártyák). A közös osztályok (`kc-eyebrow`,
 * `kc-section-title`, `kc-section-lead`, `kc-text-link`) a content.css-ből
 * jönnek, a blokk-specifikus réteg a styles/blocks/course-cards.css-ben él.
 */

/**
 * A szekció kis felső felirata (landing `kc-eyebrow`). Állandó felület-felirat,
 * nem szerkeszthető marketingszöveg: a blokk `heading`/`lead` mezői adják a
 * CMS-ből felülírható tartalmat.
 */
const EYEBROW = 'Kurzusok'

/** Fizetős-e a termék (az ár-megjelenítés szabályával azonos feltétel). */
export function isPaidProduct(product: {
  priceInHUFEnabled?: boolean | null
  priceInHUF?: number | null
}): boolean {
  return product.priceInHUFEnabled === true && typeof product.priceInHUF === 'number'
}

export interface CourseCardsProps {
  /** A fizetős kurzusok — mindig elöl, elsődleges súllyal. */
  products: Product[]
  /**
   * Az ingyenes (lead-magnet) kurzusok — a fizetősek UTÁN, visszafogott
   * kártyával. Üresen hagyva a blokk a korábbi, csak-fizetős viselkedést adja.
   */
  secondaryProducts?: Product[]
  /** Cím-felülírás a `courseCards` blokkból — üresen a beépített cím marad. */
  heading?: string
  /** Bevezető-felülírás a blokkból — üresen a beépített szöveg marad. */
  lead?: string
  /**
   * Horgony. Alapból „kurzusok" — a sticky nav /#kurzusok linkje erre épül,
   * ezért az alapérték felülírásakor a navigáció célját is ellenőrizni kell.
   */
  id?: string
  variant?: 'default' | 'tint' | 'dark'
}

export function CourseCards({
  products,
  secondaryProducts = [],
  heading,
  lead,
  id = 'kurzusok',
  variant = 'default',
}: CourseCardsProps) {
  // A szekció akkor is elmarad, ha CSAK ingyenes termék volna: a blokk az
  // értékesítés motorja, egy magányos lead-magnet nem indokolja a „Kurzusok"
  // címet (a lead-magnetnek ott a saját FreeSos szekciója).
  if (products.length === 0) {
    return null
  }

  const title = heading?.trim() || 'Így tudunk neked segíteni'
  const leadText =
    lead?.trim() ||
    'Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni felépülésen.'

  return (
    <Section className="kc-course-cards" id={id} variant={variant}>
      <Container>
        <div className="kc-course-cards__head">
          <p className="kc-eyebrow">{EYEBROW}</p>
          <h2 className="kc-section-title">{title}</h2>
          <p className="kc-section-lead">{leadText}</p>
        </div>
        <div className="kc-card-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {secondaryProducts.map((product) => (
            <ProductCard key={product.id} product={product} tone="secondary" />
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
