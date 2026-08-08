import type { Product } from '../../../payload-types'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'
import { MediaImage } from '../MediaImage'
import type { MediaLike } from '../media-url'

import '../../../app/(frontend)/styles/blocks/free-sos.css'

/**
 * FreeSos — az ingyenes SOS Kézrelax lead-magnet VISSZAFOGOTT megjelenése
 * (audit M4/K2: a tölcsér teteje, nem a csúcsa — másodlagos vizuális súllyal,
 * a fizetős kurzusok után).
 *
 * Ha a CMS-ben létezik ingyenes (nem árazott) published termék, a CTA annak
 * kurzus-oldalára mutat; egyébként a kurzuslistára, ahol az ingyenes anyag
 * szintén elérhető. A szekció mindig megjelenik — az audit szerint az ingyenes
 * SOS-tartalom a márka állandó eleme, csak a súlya változik.
 *
 * Megjelenés: a landing `kc-sos` sávja (akcent-színű háttér, fehér serif cím,
 * jobb oldalt kép-art gradiens-átmenettel, 2px fehér keretes CTA) — MÉRSÉKELT
 * magassággal, mert az ingyenes ajánlat nem előzheti a fizetős blokkot. A
 * stílus és a fehér szöveg kontraszt-garanciája: styles/blocks/free-sos.css.
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
   * Kép a sáv jobb oldalán (a blokk Media-mezője). Dekoratív hangulati elem: a
   * sávszínbe olvadó gradiens tartja a fehér szöveg AA-kontrasztját, keskeny
   * kijelzőn pedig a kép meg sem jelenik.
   */
  backgroundImage?: MediaLike | null
  id?: string
  variant?: 'default' | 'tint' | 'dark'
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

  return (
    <Section className="kc-free-sos" id={id} variant={variant}>
      {backgroundImage ? (
        <span aria-hidden="true" className="kc-free-sos__art">
          {/* 900px alatt a kép nem jelenik meg (free-sos.css), ezért ott a
              legkisebb metszet is elég — a sáv szövege mindig a színen ül. */}
          <MediaImage media={backgroundImage} preferredSize="md" sizes="(max-width: 900px) 1px, 44vw" />
        </span>
      ) : null}
      <Container>
        <div className="kc-free-sos__inner">
          <p className="kc-free-sos__badge">
            <Badge tone="success">Ingyenes</Badge>
          </p>
          <h2 className="kc-free-sos__title">{heading}</h2>
          <p className="kc-free-sos__text">{text}</p>
          <Button
            className="kc-free-sos__cta"
            href={button.href}
            openInNewTab={button.newTab === true}
            variant="secondary"
          >
            {button.label} <span aria-hidden="true">→</span>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
