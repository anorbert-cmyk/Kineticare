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
}

export function CourseCards({ products }: CourseCardsProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <Section id="kurzusok" variant="default">
      <Container>
        <h2 className="kc-section-title">Így tudunk neked segíteni</h2>
        <p className="kc-section-lead">
          Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni
          felépülésen.
        </p>
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
