import { coursePriceHuf } from '../../lib/courses'
import type { Product } from '../../payload-types'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { CourseCard } from './CourseCard'

/**
 * RelatedCourses — kapcsolódó kurzusok sáv a kurzus-oldal alján.
 *
 * Csak a published kapcsolódó termékek jelennek meg (draft/archived upsell nem
 * kerülhet a storefrontra); ha nincs ilyen, a sáv rejtve marad. A tartalom
 * forrása KIZÁRÓLAG a termék `relatedProducts` mezője (a szerkesztő állítja az
 * adminban) — terméket a kód sosem éget be.
 *
 * ═══ KÉT KERETEZÉS, EGY SÁV (2026-08-17) ═══
 * A sáv eddig minden kurzuson ugyanazt a semleges „Kapcsolódó kurzusok" címet
 * viselte. Az INGYENES kurzus oldalán ez kevés: ott a sáv az egyetlen hely,
 * ahol a látogató megtudja, mi a teljes program és mibe kerül — a régi
 * `www.kineticare.hu` ugyanezen a ponton (az ingyenes anyag igénylése után)
 * egy fizetős ajánlatra irányított át (`urlRedirect: /oto-kezrehab-akcio`,
 * mérve: `docs/regi-oldal-osszehasonlitas.md` 5.1), és ez a lépés ma HIÁNYZIK
 * (ugyanott 5.2: „Következő ajánlat: NINCS").
 *
 * Ezért a `crossSell` ág cím + felvezető keretezést kap, a fizetős kurzusok
 * oldala pedig BITRE a korábbi, semleges sávot. A kapcsoló a lap ár-állapota
 * (`coursePriceBadgeKind === 'free'`), nem az űrlap láthatósága: a már
 * igényelt ingyenes kurzus oldalán is ez a helyes keretezés.
 *
 * ═══ MIT MUTAT A KÁRTYA, ÉS MIÉRT ═══
 * Baymard mérése szerint a cross-sell akkor használható, ha a listaelem
 * MINDEN döntési adatot visel: kép, TELJES cím és ÁR. Az ár nélküli ajánlat
 * „impedes comparison, leading to fatigue and frustration", és a benchmarkolt
 * asztali oldalak 15%-áról hiányzik az ár, 55%-áról a teljes cím
 * (https://baymard.com/blog/product-page-suggestions-information). A
 * `CourseCard` mindhármat hozza, tehát külön ár-szöveget a sávba nem írunk.
 * A típusok szétválasztásáról (alternatíva ↔ kiegészítő, külön csoport, külön
 * felirat): https://baymard.com/blog/product-page-suggestions — itt EGY
 * csoport van, és a felirat megmondja, mire vonatkozik.
 *
 * ═══ AMI SZÁNDÉKOSAN NINCS BENNE ═══
 * Visszaszámláló, „csak ma", „utolsó X hely" és minden más sürgetés. A régi
 * oldal látogatónként újrainduló, 3 napos visszaszámlálót használt
 * (`docs/regi-oldal-valaszok.md` 21. ellentmondás) — ezt NEM hozzuk át. A
 * valótlan időkorlát a 2008. évi XLVII. törvény (Fttv.) 6. §-a és melléklete
 * szerint megtévesztő kereskedelmi gyakorlat; NN/g ugyanezt a határt húzza meg:
 * a valós készlet-jelzés meggyőzés, a kitalált megtévesztés
 * (https://www.nngroup.com/articles/deceptive-patterns/). Gyógyulás-ígéret és
 * eredmény-garancia sincs: a programot LEÍRJUK, az eredményt nem ígérjük.
 */

/** A sáv címsorának horgonya — ettől kap a `section` hozzáférhető nevet. */
export const RELATED_COURSES_HEADING_ID = 'kapcsolodo-kurzusok-cim'

/** A semleges (fizetős kurzus) ág címe. VÁLTOZATLAN a 2026-08-17 előtti állapothoz képest. */
export const RELATED_COURSES_HEADING = 'Kapcsolódó kurzusok'

/**
 * A cross-sell ág címe. Kérdő alak, mint a lap többi szakaszcíme („Hogyan
 * működik?", „Kinek való, és kinek nem?") — a látogató szemszögéből mondja meg,
 * mire szolgál a sáv (Baymard: a felirat tegye egyértelművé, mire vonatkozik az
 * ajánlás). Felkiáltójel és sürgetés nincs benne.
 */
export const CROSS_SELL_HEADING = 'Mi jön az ingyenes kurzus után?'

/**
 * A cross-sell felvezető, ha a kapcsolt kurzuson LÁTSZIK ár. A második mondat
 * csak akkor állítja, hogy az ár alább van, ha tényleg ott van — különben a
 * szöveg hazudna (NN/g „Sincere").
 */
export const CROSS_SELL_LEAD_WITH_PRICE =
  'Ha az ingyenes anyag után rendszeresen gyakorolnál, itt folytathatod. Az árat alább látod, a teljes tananyagot pedig a kurzus oldalán.'

/** Ugyanaz, ár nélküli (pl. hiányosan konfigurált) kapcsolt kurzusnál. */
export const CROSS_SELL_LEAD =
  'Ha az ingyenes anyag után rendszeresen gyakorolnál, itt folytathatod. A teljes tananyagot a kurzus oldalán találod.'

export interface RelatedCoursesProps {
  products: Product[]
  /**
   * Cross-sell keretezés (cím + felvezető). Az INGYENES kurzus oldalán `true`;
   * a fizetős kurzusoldal alapértelmezésben a semleges sávot kapja.
   */
  crossSell?: boolean
}

export function RelatedCourses({ products, crossSell = false }: RelatedCoursesProps) {
  const published = products.filter((product) => product.status === 'published')
  if (published.length === 0) {
    return null
  }

  // Az ÁR ugyanabból az egyetlen forrásból dől el, mint a kártyán (courses.ts):
  // a felvezető és a kártya így nem tud szétcsúszni.
  const hasVisiblePrice = published.some((product) => coursePriceHuf(product) !== null)
  const lead = crossSell ? (hasVisiblePrice ? CROSS_SELL_LEAD_WITH_PRICE : CROSS_SELL_LEAD) : null

  return (
    <Section aria-labelledby={RELATED_COURSES_HEADING_ID} variant="tint">
      <Container>
        <h2 className="kc-course-related__title" id={RELATED_COURSES_HEADING_ID}>
          {crossSell ? CROSS_SELL_HEADING : RELATED_COURSES_HEADING}
        </h2>
        {lead === null ? null : <p className="kc-course-related__lead">{lead}</p>}
        <ul className="kc-course-grid" role="list">
          {published.map((product) => (
            <li key={product.id}>
              <CourseCard headingLevel="h3" product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
