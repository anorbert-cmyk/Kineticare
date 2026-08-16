/**
 * CourseJumpNav — „Ugrás:" horgony-chipek a kurzusoldal fő szakaszaira.
 *
 * Miért: az NN/g 11 fős vizsgálatában a résztvevők 9/11 aránya ismerte és
 * használta a lapon belüli linkeket, és konkrét információigény esetén
 * azonnal odanyúltak; a GOV.UK a harmonika ELŐTT is ezt javasolja
 * (docs/ux-belso-oldalak-kutatas.md K11, B2.3, B5.5).
 *
 * A chipek CSAK a ténylegesen létező szakaszokra mutatnak — üres horgony
 * („ugrás a semmibe") nem kerülhet ki. Kettőnél kevesebb célnál a sáv
 * elmarad: két elem között nincs mit navigálni.
 *
 * A horgony-ugrás nem csúszik a ragadós fejléc alá: a szakasz-címsorok
 * `scroll-margin-top`-ot kapnak (kurzusok.css), a lap pedig
 * `scroll-padding-top`-ot (styles/base.css:17 — WCAG 2.2 SC 2.4.11).
 */
export interface CourseJumpTarget {
  id: string
  label: string
}

/**
 * A vélemény-szekció horgony-célja a kurzusoldalon.
 *
 * A felirat SZÓ SZERINT a `TestimonialsSection` felvezető sorával („Vélemények")
 * egyezik: WCAG 2.2 SC 3.2.4 Consistent Identification — azonos funkciójú elem
 * azonos azonosítást kap
 * (https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html).
 * N-3 (docs/ui-sztenderdek.md): a címke információt hordozó szóval kezd, tehát
 * az első két szóból is érthető (NN/g F-mintázat).
 *
 * Ez NEM CTA, hanem navigációs címke, ezért a §3.2 CTA-szótár nem bővül.
 */
export const TESTIMONIALS_JUMP_TARGET: CourseJumpTarget = {
  id: 'velemenyek',
  label: 'Vélemények',
}

/**
 * A chipek végleges listája.
 *
 * A vélemény-cél MINDIG a lista VÉGÉRE kerül, mert a szekció dokumentum-
 * sorrendben is utolsó — WCAG 2.2 SC 3.2.3 Consistent Navigation: az ismétlődő
 * navigáció sorrendje kövesse a lap sorrendjét
 * (https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html).
 *
 * És CSAK akkor kerül be, ha van megjeleníthető vélemény (N-12: üresre vivő
 * horgony nem rendelhető ki).
 */
export function buildCourseJumpTargets(
  contentTargets: CourseJumpTarget[],
  hasTestimonials: boolean,
): CourseJumpTarget[] {
  return hasTestimonials ? [...contentTargets, TESTIMONIALS_JUMP_TARGET] : [...contentTargets]
}

export interface CourseJumpNavProps {
  targets: CourseJumpTarget[]
}

export function CourseJumpNav({ targets }: CourseJumpNavProps) {
  if (targets.length < 2) {
    return null
  }
  return (
    <nav aria-label="Ugrás az oldal szakaszaira" className="kc-course-jump">
      <span aria-hidden="true" className="kc-course-jump__label">
        Ugrás:
      </span>
      <ul role="list">
        {targets.map((target) => (
          <li key={target.id}>
            <a className="kc-course-jump__chip" href={`#${target.id}`}>
              {target.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
