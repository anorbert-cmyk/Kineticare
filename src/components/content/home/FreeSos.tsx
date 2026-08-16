import { courseHref } from '../../../lib/course-url'
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
 * A GOMB IGAZMONDÁSA (2026-08-16, IA-audit T1 / gomb-inventár B7)
 * ---------------------------------------------------------------
 * Élesben a sáv gombja „Elindítom az ingyenes kurzust" felirattal a
 * KURZUSLISTÁRA vitt. A mérés szerint a gyökérok nem a komponens fallbackje
 * volt, hanem a CMS-adat: a `home-seed.ts` `freeSos` blokkja explicit
 * `url: '/kurzusok'`-ot írt a blokk `cta` mezőjébe, ami felülírta a komponens
 * helyes, termékből számolt célját.
 *
 * Ezért a cél innentől SZÁMÍTOTT, és a felirat a célhoz igazodik. Két érvényes
 * pár létezik, harmadik nincs (`resolveFreeSosCta`):
 *   1. van ingyenes termék → a gomb a kurzus oldalára visz, felirata
 *      „Elindítom ingyen" (docs/ui-sztenderdek.md §3.2 #4);
 *   2. nincs ingyenes termék → a gomb a kurzuslistára visz, felirata
 *      „Nézd meg a kurzusokat" (§3.2 #10) — ígéret nélkül, mert a listán
 *      nem indul el semmi.
 * A szerkesztő a FELIRATOT szabadon átírhatja, és a célt is átteheti EGY MÁSIK
 * KURZUS oldalára; a kurzuslistára mutató felülírást viszont a komponens
 * szándékosan figyelmen kívül hagyja, mert pontosan az volt a mért hiba.
 *
 * Miért így: „A link is a promise" — a felirat azt ígérje, ami a kattintás
 * UTÁN azonnal történik, nem azt, ami több lépéssel később
 * (NN/g, Better Link Labels: „Sincere",
 * https://www.nngroup.com/articles/better-link-labels/). Ugyanezt írja elő a
 * WCAG 2.2 **2.4.4 Link Purpose (In Context)** („The purpose of each link can
 * be determined from the link text alone or from the link text together with
 * its programmatically determined link context",
 * https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html),
 * és a **3.2.4 Consistent Identification** („Components that have the same
 * functionality within a set of web pages are identified consistently",
 * https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html)
 * miatt kell a két feliratnak a szótárból jönnie.
 *
 * Megjelenés: a landing `kc-sos` sávja (akcent-színű háttér, fehér serif cím,
 * jobb oldalt kép-art gradiens-átmenettel, 2px fehér keretes CTA) — MÉRSÉKELT
 * magassággal, mert az ingyenes ajánlat nem előzheti a fizetős blokkot. A
 * stílus és a fehér szöveg kontraszt-garanciája: styles/blocks/free-sos.css.
 */

/** A kurzuslista útvonala — a hibatűrő tartalék célja. */
export const COURSE_LIST_PATH = '/kurzusok'

/**
 * A gomb felirata, ha a cél VALÓBAN az ingyenes kurzus oldala.
 * Jóváhagyott felirat: `docs/ui-sztenderdek.md` §3.2 #4 („ingyenes kurzus
 * indítása"), kódbeli szótár: `src/lib/cta-vocabulary.ts` (`free-course-claim`).
 */
export const FREE_SOS_COURSE_CTA_LABEL = 'Elindítom ingyen'

/**
 * A gomb felirata a hibatűrő ágon (nincs ingyenes termék). A listán semmi nem
 * indul el, ezért ígéretet sem tehet: `docs/ui-sztenderdek.md` §3.2 #10
 * („kurzuskínálatra"), kódbeli szótár: `course-list-open`.
 */
export const FREE_SOS_LIST_CTA_LABEL = 'Nézd meg a kurzusokat'

/**
 * Kurzus-ALOLDALra mutat-e az útvonal (`/kurzusok/<slug>` vagy `/kurzusok/<id>`)?
 *
 * A puszta `/kurzusok` (és a szűrt `/kurzusok?kategoria=…`) SZÁNDÉKOSAN nem
 * számít annak: az a lista, ahol az ingyenes kurzus nem indul el.
 */
export function isCourseDetailHref(href: string): boolean {
  const path = href.split(/[?#]/, 1)[0].trim()
  if (!path.startsWith(`${COURSE_LIST_PATH}/`)) {
    return false
  }
  return path.slice(COURSE_LIST_PATH.length + 1).replace(/\/+$/, '').length > 0
}

/** A blokkból érkező, RÉSZLEGES gomb-felülírás (bármelyik mező hiányozhat). */
export interface FreeSosCtaOverride {
  label?: string
  href?: string
  newTab?: boolean
}

/** A kirendert gomb — a felirat és a cél mindig egymáshoz illik. */
export interface FreeSosCta {
  label: string
  href: string
  newTab: boolean
}

/**
 * A gomb feloldása: előbb a CÉL, aztán a hozzá illő felirat.
 *
 * Tiszta függvény, hogy az őr-teszt adatbázis és render nélkül is végigmérje
 * mind a négy ágat (`src/__tests__/kezdolap-cta-egyertelmuseg.test.tsx`).
 */
export function resolveFreeSosCta(
  freeProduct: Product | null,
  override?: FreeSosCtaOverride,
): FreeSosCta {
  const overrideHref = override?.href?.trim() ?? ''
  // A szerkesztő MÁSIK KURZUS oldalára átteheti a gombot; a kurzuslistára
  // mutató felülírás viszont éppen a mért hiba (B7), ezért nem érvényesül.
  const href = isCourseDetailHref(overrideHref)
    ? overrideHref
    : freeProduct
      ? courseHref(freeProduct)
      : COURSE_LIST_PATH

  const pointsToCourse = isCourseDetailHref(href)
  const label = pointsToCourse
    ? override?.label?.trim() || FREE_SOS_COURSE_CTA_LABEL
    : FREE_SOS_LIST_CTA_LABEL

  return {
    label,
    href,
    // A tartalék ág belső navigáció: új lapot ott nem nyitunk.
    newTab: pointsToCourse ? override?.newTab === true : false,
  }
}

export interface FreeSosProps {
  /** Az első ingyenes (nem árazott) published termék, ha van. */
  freeProduct: Product | null
  /** Cím-felülírás a `freeSos` blokkból — üresen a termék/beépített cím marad. */
  title?: string
  /** Szöveg-felülírás a blokkból. */
  body?: string
  /**
   * Gomb-felülírás a blokkból. Bármelyik mező hiányozhat: a hiányzókat a
   * `resolveFreeSosCta` tölti ki úgy, hogy a felirat és a cél összeérjen.
   */
  cta?: FreeSosCtaOverride
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
  // A termék neve a displayTitle → sku lánc; ha MINDKETTŐ üres, a márkás
  // alapszöveg marad (a courseTitle „Kurzus #id" fallbackja itt félrevinne).
  const productHeading = freeProduct?.displayTitle?.trim() || freeProduct?.sku?.trim() || ''
  // Kettőspont, nem gondolatjel: a magyar tipográfiában a kvirtmínusz nem
  // írásjel, és a tulajdonos külön kikötötte a gondolatjel-halmozás tilalmát
  // (docs/ui-sztenderdek.md §3.1, docs/gomb-inventar.md §7).
  const heading = title?.trim() || productHeading || 'SOS Kézrelax: ingyenes villámkurzus'
  const text =
    body?.trim() ||
    freeProduct?.shortDescription?.trim() ||
    'Ha előbb kipróbálnád a módszert: rövid, azonnal használható gyakorlatok hirtelen jelentkező kézfájdalomra.'
  const button = resolveFreeSosCta(freeProduct, cta)

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
            openInNewTab={button.newTab}
            variant="secondary"
          >
            {button.label} <span aria-hidden="true">→</span>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
