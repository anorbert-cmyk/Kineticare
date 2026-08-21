import Link from 'next/link'

import { courseHref } from '../../lib/course-url'
import { coursePriceBadgeKind, coursePriceLabel, courseTitle } from '../../lib/courses'
import { ctaLabel } from '../../lib/cta-vocabulary'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import type { CourseCtaTarget } from './post-article'

import '../../app/(frontend)/styles/blocks/post-view.css'

/**
 * PostCourseCta — a cikk végi, halk kurzus-ajánló panel.
 *
 * ═══ MIÉRT KELL ═══
 * NN/g, *Informational Articles Must Ask For the Order*
 * (https://www.nngroup.com/articles/product-links-on-informational-pages/):
 * a keresőből érkező látogató a navigációt nem járja be, ezért a
 * termék-hivatkozás helye „the page's body area and at the end of the
 * article"; a P&G-esettanulmányban a látogatók „didn't notice that P&G sold a
 * product". A hivatkozás nélküli cikk „attracts tons of freeloaders, but no
 * business".
 *
 * ═══ MIÉRT HALKAN ═══
 * Ugyanez a cikk: „Turn down the volume on the sales message. If you push too
 * hard, you lose credibility." Ezért kompakt panel a lap saját tokenjeivel,
 * kép nélkül, új szín nélkül — a bannervakság ellen is ez a védelem (NN/g,
 * *Banner Blindness*), és ez a `docs/ux-belso-oldalak-kutatas.md` B4.2 pontja.
 *
 * ═══ AMI TILOS A PANELBEN ═══
 * Gyógyulási arány, gyógyulási idő, „garantált eredmény", visszaszámláló,
 * kamu-készlet. A mért vevőhang szerint a versenytárs „80-20%-os gyógyulási
 * információja" NEGATÍV véleményt hozott
 * (docs/vevohang-es-hirdetesszoveg.md), és a feladatkiírás orvosi szabálya is
 * ezt tiltja.
 *
 * ═══ A KÉT ÁG ÉS A GOMBOK SÚLYA ═══
 * - Kapcsolt kurzus van → „Nyisd meg a kurzusoldalt" (CTA-szótár #28,
 *   SECONDARY). Az ár vagy az „Ingyenes" tény a gomb KÖZVETLEN közelében áll
 *   (Baymard: a döntéshez szükséges tény a cselekvés mellé való, B6.2).
 * - Nincs kapcsolt kurzus → „Nézd meg a kurzusokat" (#10, PRIMARY).
 * Laponként legfeljebb EGY elsődleges gomb áll (B6.5), ezért a kurzusos ág
 * másodlagos: a cikk elsődleges cselekvése ilyenkor is egyetlen marad.
 * Új feliratot kitalálni tilos — minden szöveg a `cta-vocabulary.ts`-ből jön.
 */
export interface PostCourseCtaProps {
  /** A cikkhez kapcsolt, közzétett kurzus; null, ha nincs (vagy nem publikált). */
  course: CourseCtaTarget | null
}

/**
 * A kurzus nélküli ág két mikroszövege.
 *
 * LEKTORÁLANDÓ (docs/tudastar-technikai-terv.md 11. fejezet, K-B3): vevői
 * szöveg, a tulajdonos jóváhagyása előtt nem végleges. A megfogalmazás
 * tudatosan tényszerű: nem ígér eredményt, nem sürget, és nem mond olyat,
 * ami ne lenne igaz minden kurzusra. Gondolatjel nincs benne (§3.1.2).
 */
const NO_COURSE_HEADING = 'Hogyan tovább?'
const NO_COURSE_TEXT =
  'A cikkek a tájékozódáshoz szólnak. Ha vezetett, videós gyakorlást keresel otthonra, azt a kurzusainkban találod meg.'

export function PostCourseCta({ course }: PostCourseCtaProps) {
  if (course === null) {
    return (
      <Card as="section" className="kc-post-cta__panel">
        <h2 className="kc-post-cta__title">{NO_COURSE_HEADING}</h2>
        <p className="kc-post-cta__text">{NO_COURSE_TEXT}</p>
        <p className="kc-post-cta__action">
          <Link className="kc-button kc-button--primary" href="/kurzusok">
            {ctaLabel('course-list-open')}
          </Link>
        </p>
      </Card>
    )
  }

  const priceKind = coursePriceBadgeKind(course)
  const priceLabel = coursePriceLabel(course)

  return (
    <Card as="section" className="kc-post-cta__panel">
      <h2 className="kc-post-cta__title">{courseTitle(course)}</h2>
      {course.shortDescription !== null ? (
        <p className="kc-post-cta__text">{course.shortDescription}</p>
      ) : null}
      <p className="kc-post-cta__action">
        {/* Az ÁR-TÉNY a gomb mellett áll. A 'none' állapot (bekapcsolt
            ár-pipa, üres ár) SZÁNDÉKOSAN néma: az konfigurációs hiba, és az
            „Ingyenes" felirat ott hazugság lenne (lib/courses.ts). */}
        {priceKind === 'price' && priceLabel !== null ? (
          <Badge tone="neutral">{priceLabel}</Badge>
        ) : null}
        {priceKind === 'free' ? <Badge tone="success">Ingyenes</Badge> : null}
        <Link className="kc-button kc-button--secondary" href={courseHref(course)}>
          {ctaLabel('course-sales-open')}
        </Link>
      </p>
    </Card>
  )
}
