import type { CSSProperties } from 'react'

import type { Product } from '../../../payload-types'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

/**
 * FreeSos — az ingyenes SOS Kézrelax lead-magnet VISSZAFOGOTT megjelenése
 * (audit M4/K2: a tölcsér teteje, nem a csúcsa — másodlagos vizuális súllyal,
 * a fizetős kurzusok után).
 *
 * Ha a CMS-ben létezik ingyenes (nem árazott) published termék, a CTA annak
 * kurzus-oldalára mutat; egyébként a kurzuslistára, ahol az ingyenes anyag
 * szintén elérhető. A szekció mindig megjelenik — az audit szerint az ingyenes
 * SOS-tartalom a márka állandó eleme, csak a súlya változik.
 */

export interface FreeSosProps {
  /** Az első ingyenes (priceInHUFEnabled: false) published termék, ha van. */
  freeProduct: Product | null
}

const cardStyle: CSSProperties = {
  border: '1px solid var(--kc-color-border)',
  borderRadius: 'var(--kc-radius-lg, 0.75rem)',
  padding: 'var(--kc-space-5, 1.5rem)',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--kc-space-4, 1rem) var(--kc-space-6, 2rem)',
}

const textBlockStyle: CSSProperties = {
  flex: '1 1 20rem',
  maxWidth: '100%',
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--kc-font-heading)',
  fontSize: 'var(--kc-text-lg)',
  lineHeight: 'var(--kc-leading-heading)',
  margin: '0 0 var(--kc-space-2, 0.5rem)',
}

const leadStyle: CSSProperties = {
  margin: 0,
  color: 'var(--kc-color-text-muted)',
}

export function FreeSos({ freeProduct }: FreeSosProps) {
  const title = freeProduct?.sku?.trim() || 'SOS Kézrelax — ingyenes villámkurzus'
  const href = freeProduct ? `/kurzusok/${freeProduct.id}` : '/kurzusok'

  return (
    <Section id="ingyenes" variant="default">
      <Container>
        <div style={cardStyle}>
          <div style={textBlockStyle}>
            <p style={{ margin: '0 0 var(--kc-space-2, 0.5rem)' }}>
              <Badge tone="success">Ingyenes</Badge>
            </p>
            <h2 style={titleStyle}>{title}</h2>
            <p style={leadStyle}>
              {freeProduct?.shortDescription?.trim() ||
                'Ha előbb kipróbálnád a módszert: rövid, azonnal használható gyakorlatok hirtelen jelentkező kézfájdalomra.'}
            </p>
          </div>
          <Button href={href} variant="secondary">
            Elindítom az ingyenes kurzust
          </Button>
        </div>
      </Container>
    </Section>
  )
}
