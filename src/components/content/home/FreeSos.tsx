import type { CSSProperties } from 'react'

import type { Product } from '../../../payload-types'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'
import { pickMediaUrl, type MediaLike } from '../media-url'

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

export interface FreeSosCta {
  label: string
  href: string
  newTab?: boolean
}

export interface FreeSosProps {
  /** Az első ingyenes (priceInHUFEnabled: false) published termék, ha van. */
  freeProduct: Product | null
  /** Cím-felülírás a `freeSos` blokkból — üresen a termék/beépített cím marad. */
  title?: string
  /** Szöveg-felülírás a blokkból. */
  body?: string
  /** Gomb-felülírás; hiányában a gomb az ingyenes termékre (vagy a listára) visz. */
  cta?: FreeSosCta
  /**
   * Halvány háttérkép a kártya mögé (a blokk Media-mezője). A fehér fedőréteg
   * tartja az AA-kontrasztot — a kép csak hangulati elem marad.
   */
  backgroundImage?: MediaLike | null
  id?: string
  variant?: 'default' | 'tint' | 'dark'
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

export function FreeSos({
  freeProduct,
  title,
  body,
  cta,
  backgroundImage,
  id = 'ingyenes',
  variant = 'tint',
}: FreeSosProps) {
  const heading = title?.trim() || freeProduct?.sku?.trim() || 'SOS Kézrelax — ingyenes villámkurzus'
  const text =
    body?.trim() ||
    freeProduct?.shortDescription?.trim() ||
    'Ha előbb kipróbálnád a módszert: rövid, azonnal használható gyakorlatok hirtelen jelentkező kézfájdalomra.'
  const button: FreeSosCta = cta ?? {
    label: 'Elindítom az ingyenes kurzust',
    href: freeProduct ? `/kurzusok/${freeProduct.id}` : '/kurzusok',
  }

  const backgroundUrl = backgroundImage ? pickMediaUrl(backgroundImage, 'md') : null
  const cardBackground: CSSProperties = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'var(--kc-color-surface, #fff)',
      }
    : {}

  return (
    <Section id={id} variant={variant}>
      <Container>
        <div style={{ ...cardStyle, ...cardBackground }}>
          <div style={textBlockStyle}>
            <p style={{ margin: '0 0 var(--kc-space-2, 0.5rem)' }}>
              <Badge tone="success">Ingyenes</Badge>
            </p>
            <h2 style={titleStyle}>{heading}</h2>
            <p style={leadStyle}>{text}</p>
          </div>
          <Button href={button.href} openInNewTab={button.newTab === true} variant="secondary">
            {button.label}
          </Button>
        </div>
      </Container>
    </Section>
  )
}
