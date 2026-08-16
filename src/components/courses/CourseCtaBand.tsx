import type { Product } from '../../payload-types'
import { PriceTag } from '../ui/PriceTag'
import { CourseCta } from './CourseCta'

/**
 * CourseCtaBand — ismételt vásárlási sáv a hosszú értékesítő oldalon.
 *
 * ═══ MIÉRT ═══
 * A P1-es mérés szerint a mai oldalon PONTOSAN EGY vásárlási gomb volt, a lap
 * tetején, alatta 821 szónyi értékesítő szöveggel — vagyis a döntés
 * pillanatában nem volt mire kattintani (docs/ux-belso-oldalak-kutatas.md P1,
 * B6.1). Az NN/g görgetés-kutatása szerint a nézési idő 57%-a a hajtás felett,
 * 81%-a az első három képernyőn telik: a lentebbi tartalomhoz ARÁNYOSAN
 * ismétlődő CTA kell.
 *
 * ═══ MI NEM ═══
 * A sáv NEM talál ki szöveget: a kurzus címét, az ÁRÁT és — ha van — a
 * garancia címét mutatja, mind a termékadatból. Nincs visszaszámláló, nincs
 * kamu-készlet (UX-skill 6. pont). Az akció is UGYANAZ, mint a
 * vásárlódobozé — egyetlen elsődleges cél él a lapon (B6.5).
 */
export interface CourseCtaBandProps {
  courseTitle: string
  priceBadge: 'price' | 'free' | 'none'
  priceHuf: number | null
  guaranteeLabel: string | null
  product: Pick<Product, 'id' | 'status' | 'priceInHUFEnabled'>
  hasPurchased: boolean
}

export function CourseCtaBand({
  courseTitle,
  priceBadge,
  priceHuf,
  guaranteeLabel,
  product,
  hasPurchased,
}: CourseCtaBandProps) {
  return (
    <aside aria-label={`${courseTitle} — vásárlás`} className="kc-course-ctaband">
      <div className="kc-course-ctaband__text">
        <p className="kc-course-ctaband__title">{courseTitle}</p>
        {guaranteeLabel ? (
          <p className="kc-course-ctaband__note">{guaranteeLabel}</p>
        ) : null}
      </div>
      <div className="kc-course-ctaband__action">
        {priceBadge === 'price' && priceHuf !== null ? (
          <p className="kc-course-ctaband__price">
            <PriceTag label="Ár:" priceHuf={priceHuf} />
          </p>
        ) : priceBadge === 'free' ? (
          <p className="kc-course-ctaband__price">Ingyenes</p>
        ) : null}
        <CourseCta hasPurchased={hasPurchased} product={product} />
      </div>
    </aside>
  )
}
