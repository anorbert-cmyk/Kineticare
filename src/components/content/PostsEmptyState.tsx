import Link from 'next/link'

import { ctaLabel } from '../../lib/cta-vocabulary'
import { Button } from '../ui/Button'

import '../../app/(frontend)/styles/blocks/empty-state.css'

/**
 * PostsEmptyState — a Tudástár ÉRTELMES üres állapota (bloglista és
 * kategória-oldal).
 *
 * ═══ MIÉRT KELL EGYÁLTALÁN ═══
 * A `/blog` ma zsákutca: az IA-audit mérése szerint a `<main>`-ben NULLA
 * link van, miközben a „Tudástár" a négy főmenüpont egyike — a menü 25%-a
 * visz egy semmire (docs/informacios-architektura.md, Z2 és a 7. fejezet 4.
 * sora). A zsákutca-tilalom a projekt-skill 5. pontja: „minden oldalról
 * legyen értelmes továbblépés és visszaút".
 *
 * ═══ MIT KELL EGY ÜRES ÁLLAPOTNAK TUDNIA (kutatás) ═══
 * 1. NN/g, Designing Empty States in Complex Applications: 3 Guidelines —
 *    https://www.nngroup.com/articles/empty-state-interface-design/
 *    Az üres felület három dolgot végez el: közli a rendszer állapotát,
 *    megtanítja, mi kerül ide, és közvetlen utat ad a következő feladathoz
 *    („provide direct pathways for getting started with key tasks").
 *    A teljesen üres nézet tilos: „Do not default to totally empty states.
 *    This approach creates confusion for users, who may be left wondering if
 *    the system is still loading information or if errors have occurred."
 * 2. IBM Carbon Design System, Empty states pattern —
 *    https://carbondesignsystem.com/patterns/empty-states-pattern/
 *    Anatómia: cím + törzs + elsődleges cselekvés (+ opcionális másodlagos
 *    út). A cím ÁLLÍTÁS legyen, ne a hiány panasza („Write this as a positive
 *    statement"), és ha van értelmes következő lépés, „include a direct link
 *    in your message copy or a primary action button".
 * 3. NN/g, Top 10 Information Architecture Mistakes —
 *    https://www.nngroup.com/articles/top-10-ia-mistakes/
 *    A „Missing Category Landing Pages" hibája pontosan ez: a kategória
 *    (itt: a Tudástár) létezik a navigációban, de nincs mögötte lap, ami
 *    továbbvinne.
 *
 * ═══ FELIRATOK (docs/ui-sztenderdek.md §3.2 CTA-szótár) ═══
 * - „Nézd meg a kurzusokat" — a szótár 10. sora, amely a felhasználási
 *   helyek közt KIFEJEZETTEN nevesíti az üres állapotokat. E/2, mert puszta
 *   navigáció (P-1b): a kattintás után csak máshol vagyunk.
 * - „Elindítom ingyen" — a szótár 3./4. sora. E/1 (P-1a), mert hozzáférés
 *   keletkezik. Csak akkor jelenik meg, ha van TUDATOSAN ingyenes termék
 *   (lásd lentebb): hamis ígéretet a felirat nem tehet.
 * - „Vissza a Tudástárba" — a szótár 15. sorának mintázatos alakja
 *   („Vissza a <hova>"), E/2.
 * - „Kapcsolat" — a fejléc- és lábléc-menü szava, változatlanul (WCAG 2.2
 *   **3.2.4** Consistent Identification: ugyanaz a cél mindenhol ugyanazzal
 *   a névvel). Ezért marad főnévi, egyszavas címke (P-1c).
 * Gondolatjel a feliratokban és a törzsszövegben SINCS (magyar mikroszöveg-
 * szabályzat, §3.1.2).
 *
 * ═══ AMIT NEM TESZÜNK ═══
 * Az „ingyenes kurzus" útja csak akkor jelenik meg, ha a hívó tényleg talált
 * `priceInHUFEnabled: false` állapotú, published terméket. A kezdőlapon élő
 * hiba (IA-audit T1) pont az ellenkezője volt: az „Elindítom az ingyenes
 * kurzust" gomb a kurzuslistára esett vissza, tehát ígért valamit, amit nem
 * teljesített. Itt a hiányzó ingyenes terméknél a gomb egyszerűen nincs.
 */

export type PostsEmptyStateVariant = 'tudastar' | 'kategoria'

export interface PostsEmptyStateProps {
  /**
   * 'tudastar' — a teljes Tudástár üres (még egy cikk sincs);
   * 'kategoria' — csak a szűrt nézet üres, máshol VAN olvasnivaló.
   * A kettő más mondatot és más továbbvezetést kíván: az elsőnél a lap
   * jövőjét kell elmagyarázni, a másodiknál vissza kell vinni a teljes
   * listához (NN/g: a „no results" és a „first use" nem ugyanaz az állapot).
   */
  variant: PostsEmptyStateVariant
  /**
   * A tudatosan ingyenes kurzus kanonikus útvonala, ha van ilyen published
   * termék. Hiányában az ingyenes út NEM jelenik meg.
   */
  freeCourseHref?: string | null
  /** A cím id-je — ez adja a szekció hozzáférhető nevét (aria-labelledby). */
  headingId?: string
}

const HEADING_ID = 'tudastar-ures-cim'

export function PostsEmptyState({
  variant,
  freeCourseHref,
  headingId = HEADING_ID,
}: PostsEmptyStateProps) {
  const isHub = variant === 'tudastar'
  const freeHref = typeof freeCourseHref === 'string' && freeCourseHref.length > 0 ? freeCourseHref : null

  return (
    <section aria-labelledby={headingId} className="kc-empty-panel">
      <h2 className="kc-empty-panel__title" id={headingId}>
        {isHub ? 'Hamarosan érkeznek az első cikkek' : 'Ebben a témában még nincs cikk'}
      </h2>

      <p className="kc-empty-panel__lead">
        {isHub
          ? 'A Tudástárba kézrehabilitációs cikkek kerülnek: otthon végezhető gyakorlatok, a felépülés szakaszai és a rendelőben szerzett tapasztalataink.'
          : 'A többi témában viszont már találsz olvasnivalót a Tudástárban.'}
      </p>

      <p className="kc-empty-panel__hint">
        {isHub
          ? 'Amíg az első cikkek elkészülnek, innen tudsz továbbindulni:'
          : 'Innen tudsz továbbindulni:'}
      </p>

      <ul className="kc-empty-panel__actions">
        {isHub ? null : (
          <li>
            <Button href="/blog" variant="primary">
              Vissza a Tudástárba
            </Button>
          </li>
        )}
        <li>
          <Button href="/kurzusok" variant={isHub ? 'primary' : 'secondary'}>
            {ctaLabel('course-list-open')}
          </Button>
        </li>
        {isHub && freeHref !== null ? (
          <li>
            <Button href={freeHref} variant="secondary">
              {ctaLabel('free-course-claim')}
            </Button>
          </li>
        ) : null}
      </ul>

      {/* §3.2 #33: a /kapcsolat oldalra vivő CSELEKVÉS felirata mindenhol
          „Írj nekünk". A puszta „Kapcsolat" menücímke (N-3), és gombként nem
          mondja meg, mi történik (M-7). */}
      <p className="kc-empty-panel__contact">
        Ha kérdésed van a felépülésről,{' '}
        <Link className="kc-empty-panel__contact-link" href="/kapcsolat">
          {ctaLabel('contact-open')}
        </Link>{' '}
        a kapcsolati oldalon.
      </p>
    </section>
  )
}
