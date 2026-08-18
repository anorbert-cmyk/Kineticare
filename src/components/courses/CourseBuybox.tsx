import type { CSSProperties, ReactNode } from 'react'

import type { Product } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { PriceTag } from '../ui/PriceTag'
import { CourseCta } from './CourseCta'

/**
 * CourseBuybox — a kurzusoldal vásárlódoboza (a lap egyetlen elsődleges célja).
 *
 * A tartalma és a SORRENDJE a kutatás szerint áll össze
 * (docs/ux-belso-oldalak-kutatas.md 5.1): meta-jelölők → H1 → egymondatos
 * lead → ÁR (B6.2) → elsődleges CTA → 3 pipás előny → másodlagos, nem
 * versengő szöveglink (B6.5) → garancia-sor (B6.3).
 *
 * ═══ MIÉRT ELÖL AZ ÁR ÉS A GOMB (2026-08-16-i sorrend-változás) ═══
 * Korábban a három pipás előnysor az ár és a gomb ELŐTT állt, így a doboz
 * döntési eleme ~200 pixellel lejjebb került. A doboz ragadós, és a
 * mérésünk szerint (produkciós build, Chromium 141) 905 pixel magas volt,
 * vagyis 1366×768-as nézetablakban a gomb a lap görgetésének csak 10%-án
 * látszott. A sorrend megfordítása a döntési pillanat elemét a doboz első
 * képernyőjébe hozza, tehát belső görgetés nélkül is látszik.
 *
 * A hivatkozott kutatás:
 *  - NN/g, Scrolling and Attention — a nézési idő 42%-a a lap felső 20%-ára,
 *    65%-a a felső 40%-ára esik, és „Keep major CTAs above the fold"
 *    (https://www.nngroup.com/articles/scrolling-and-attention/).
 *  - Baymard, ecommerce UX best practices #791 — az elsődleges „kosárba"
 *    gomb legyen egyedi és feltűnő, versengő CTA nélkül
 *    (https://baymard.com/learn/ecommerce-ux-best-practices).
 *  - Baymard termékoldal-benchmark: az ár és a teljes fizetendő a gomb
 *    KÖZVETLEN közelében látszik (B6.2 — a benchmarkolt oldalak 67%-a
 *    elrontja: https://baymard.com/blog/current-state-ecommerce-product-page-ux).
 * Az előnysorok nem tűnnek el, csak a gomb MÖGÉ kerülnek: a doboz így a
 * „mibe kerül és mit nyomjak meg" kérdésre válaszol előbb, a „miért érdemes"
 * pedig közvetlenül utána, ugyanabban a dobozban marad.
 *
 * A doboz és a CTA-blokk is `id`-t kap. A ragadós vásárlósáv (CourseBuyBar) a
 * CTA-blokkot figyeli IntersectionObserverrel — a sáv pontosan akkor jelenik
 * meg, amikor a GOMB nem látszik. (A doboz `id`-je erre nem elég: a doboz
 * teteje látszhat úgy is, hogy a gomb a belső görgetésen kívül van.)
 */
export interface CourseBuyboxProps {
  id: string
  /**
   * A CTA-blokk horgonya — a ragadós vásárlósáv (CourseBuyBar) EZT figyeli.
   * A doboz `id`-je erre nem elég: a doboz TETEJE látszhat úgy is, hogy a
   * gomb már a belső görgetésen kívül van (mérve 1280×720-on).
   */
  ctaId: string
  title: string
  lead: string | null
  categoryLabel: string | null
  audienceLabel: string
  /** A courses.ts coursePriceBadgeKind döntése — az árlogika KANONIKUS forrása. */
  priceBadge: 'price' | 'free' | 'none'
  priceHuf: number | null
  highlights: string[]
  guaranteeLabel: string | null
  /** Másodlagos, alacsonyabb súlyú horgony (pl. „Kinek való?"). */
  secondaryHref: string | null
  secondaryLabel: string | null
  /**
   * A `priceInHUF` KÖTELEZŐ: a CourseCta állapotgépe az ÉRVÉNYES árat kérdezi
   * (nem csak az ár-pipát), különben a hiányosan konfigurált termék olyan
   * vásárlást kínálna, amit a checkout 400-zal elutasít.
   */
  product: Pick<Product, 'id' | 'slug' | 'status' | 'priceInHUF' | 'priceInHUFEnabled'>
  hasPurchased: boolean
  /**
   * A CTA HELYÉRE kerülő egyedi tartalom. Megadva a `CourseCta` állapotgép
   * helyett ez renderelődik, ugyanazon a helyen és ugyanabban a sorrendben
   * (ár → cselekvés → előnyök), tehát a kutatás szerinti felépítés nem sérül.
   *
   * MA EGY HÍVÓJA VAN: az INGYENES kurzus igénylő űrlapja
   * (`FreeCourseRequestForm`). Ott a cselekvés nem link, hanem beküldés (név +
   * e-mail → hozzáférés + belépő link), amit egy `href`-alapú gomb nem tud
   * kifejezni. A doboz többi eleme (cím, lead, „Ingyenes" címke, előnyök,
   * garancia) változatlan marad — ezért slot, nem külön doboz.
   *
   * Ha nincs megadva, a viselkedés BITRE a korábbi: `CourseCta`.
   */
  ctaSlot?: ReactNode
}

export function CourseBuybox({
  id,
  ctaId,
  title,
  lead,
  categoryLabel,
  audienceLabel,
  priceBadge,
  priceHuf,
  highlights,
  guaranteeLabel,
  secondaryHref,
  secondaryLabel,
  product,
  hasPurchased,
  ctaSlot,
}: CourseBuyboxProps) {
  return (
    <div className="kc-card kc-card--padded kc-course-buybox" id={id}>
      <p className="kc-course-buybox__meta">
        {categoryLabel ? <Badge tone="info">{categoryLabel}</Badge> : null}
        <Badge tone="neutral">{audienceLabel}</Badge>
      </p>
      <h1 className="kc-course-buybox__title">{title}</h1>
      {lead ? <p className="kc-course-buybox__lead">{lead}</p> : null}

      {priceBadge === 'price' && priceHuf !== null ? (
        <p className="kc-course-buybox__price">
          <PriceTag label="Ár:" priceHuf={priceHuf} />
          <span className="kc-course-buybox__price-note">egyszeri díj, további költség nincs</span>
        </p>
      ) : priceBadge === 'free' ? (
        <p className="kc-course-buybox__price kc-course-buybox__price--free">Ingyenes</p>
      ) : null}

      {ctaSlot ?? <CourseCta hasPurchased={hasPurchased} id={ctaId} product={product} />}

      {highlights.length > 0 ? (
        <ul className="kc-course-checklist" role="list">
          {highlights.map((item, index) => (
            <li
              className="kc-course-checklist__item"
              key={`${index}-${item}`}
              style={{ '--kc-course-stagger': index } as CSSProperties}
            >
              <span aria-hidden="true" className="kc-course-checklist__mark">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {secondaryHref && secondaryLabel ? (
        <p className="kc-course-buybox__secondary">
          <a className="kc-course-textlink" href={secondaryHref}>
            {secondaryLabel}
          </a>
        </p>
      ) : null}

      {guaranteeLabel ? (
        <p className="kc-course-buybox__trust">
          <span aria-hidden="true" className="kc-course-buybox__trust-mark">
            ●
          </span>
          {guaranteeLabel}
        </p>
      ) : null}
    </div>
  )
}
