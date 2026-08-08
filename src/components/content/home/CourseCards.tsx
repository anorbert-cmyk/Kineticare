import Link from 'next/link'

import type { Product } from '../../../payload-types'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'
import { ProductCard } from '../ProductCard'

/**
 * CourseCards — a FIZETŐS kurzusok kiemelése közvetlenül a hero után
 * (audit M3/K1: az értékesítés motorja, kártyánként cím/rövid leírás/ÁR/CTA).
 *
 * Az ingyenes (lead-magnet) termékek NEM itt jelennek meg — azok a visszafogott
 * FreeSos szekcióban kapnak helyet (audit K2). Üres listánál a szekció elmarad
 * (nincs törött üres blokk).
 */

/** Fizetős-e a termék (az ár-megjelenítés szabályával azonos feltétel). */
export function isPaidProduct(product: {
  priceInHUFEnabled?: boolean | null
  priceInHUF?: number | null
}): boolean {
  return product.priceInHUFEnabled === true && typeof product.priceInHUF === 'number'
}

export interface CourseCardsProps {
  products: Product[]
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
  heading,
  lead,
  id = 'kurzusok',
  variant = 'default',
}: CourseCardsProps) {
  if (products.length === 0) {
    return null
  }

  const title = heading?.trim() || 'Így tudunk neked segíteni'
  const leadText =
    lead?.trim() ||
    'Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni felépülésen.'

  return (
    <Section id={id} variant={variant}>
      <Container>
        <h2 className="kc-section-title">{title}</h2>
        <p className="kc-section-lead">{leadText}</p>
        <div className="kc-card-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <p className="kc-section-more">
          <Link className="kc-text-link" href="/kurzusok">
            Összes kurzus megtekintése
          </Link>
        </p>
      </Container>
    </Section>
  )
}
