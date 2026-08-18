import { resolveCourseCta } from '../../lib/courses'
import type { Product } from '../../payload-types'
import { Button } from '../ui/Button'

/**
 * CourseCta — a kurzus-oldal vásárlási akciója (az értékesítés motorja).
 *
 * Állapotgép: src/lib/courses.ts `resolveCourseCta` (egységtesztelve). A
 * komponens NEM dönt, csak megjelenít:
 *
 * - `buy` → §3.2 #1 („Megveszem a kurzust") gomb a pénztárra;
 * - `free` → §3.2 #3 („Elindítom ingyen") a kurzus saját igénylő űrlapjához;
 * - `purchased` → másodlagos súlyú link a kurzusaimhoz + „Már megvetted" sor;
 * - `archived` / `unavailable` → **NINCS GOMB**, csak a magyarázó mondat.
 *
 * ═══ MIÉRT NINCS LETILTOTT GOMB (2026-08-16) ═══
 * A `docs/ui-sztenderdek.md` **Á-3** szabálya: „Letiltott gomb helyett inkább ne
 * legyen gomb. Ha a cselekvés nem végezhető el, a helyes megoldás nem a szürke
 * »Megveszem«, hanem a cselekvés eltávolítása + magyarázó mondat." Ugyanezt írja
 * elő a §3.2 **#16** sora, és a `docs/gomb-inventar.md` T2 megállapítása is
 * ezt méri hibaként: a korábbi `<button disabled>` „Megveszem" fókuszálhatatlan
 * volt ÉS hamis ígéretet tett (NN/g: „a link ígéret"). A skill 4. pontja
 * szerint a letiltott gomb mellett kötelező a szöveges magyarázat — itt a gomb
 * helyett áll.
 *
 * A magyarázó mondat a `kc-course-cta__note` osztályt kapja, amely SEMMILYEN
 * új színt vagy betűméretet nem vezet be: a törzsszöveg tokenjét
 * (`--kc-color-text`, #10243e) örökli. Mérve a vásárlódoboz fehér
 * (`--kc-color-surface-raised`) hátterén: **15,63:1** kontraszt (WCAG 2.2
 * 1.4.3 AA küszöb: 4,5:1).
 */
export interface CourseCtaProps {
  /**
   * A `priceInHUF` KÖTELEZŐ: a CTA az ÉRVÉNYES árat kérdezi, nem csak az
   * ár-pipát — enélkül a hiányos konfigurációjú termék megint „Megveszem"
   * gombot kapna, és a checkout 400-zal utasítaná el.
   */
  product: Pick<Product, 'id' | 'slug' | 'status' | 'priceInHUF' | 'priceInHUFEnabled'>
  /** Bejelentkezett felhasználó purchases-listája alapján (csak olvasás). */
  hasPurchased: boolean
  /**
   * A CTA-blokk horgonya. A ragadós vásárlósáv (CourseBuyBar) EZT figyeli
   * IntersectionObserverrel: a sáv pontosan akkor jelenik meg, amikor ez a
   * gomb nem látszik — bármilyen okból (kigörgött, vagy a ragadós doboz
   * belső görgetése levágta).
   */
  id?: string
}

export function CourseCta({ product, hasPurchased, id }: CourseCtaProps) {
  const cta = resolveCourseCta(product, hasPurchased)

  // Az `id` a ragadós vásárlósáv horgonya: az IntersectionObserver ezt a
  // CTA-blokkot figyeli, nem a teljes dobozt — így pontosan akkor gyújt,
  // amikor maga a GOMB nem látszik.
  return (
    <div className="kc-course-cta" id={id}>
      {/* A `label !== null` nem formalitás: a nem cselekvő (archivált, hiányos
          konfigurációjú) állapotoknak SZÁNDÉKOSAN nincs feliratuk (Á-3, §3.2
          #16) — letiltott „Megveszem" helyett a cselekvés eltűnik, és a
          magyarázó mondat mondja meg, miért. */}
      {cta.label !== null ? (
        <Button
          href={cta.href ?? undefined}
          variant={cta.kind === 'purchased' ? 'secondary' : 'primary'}
        >
          {cta.label}
        </Button>
      ) : null}
      {cta.note !== null ? <p className="kc-course-cta__note">{cta.note}</p> : null}
      {cta.kind === 'purchased' ? (
        <p className="kc-course-cta__note kc-course-cta__note--owned">
          Már megvetted ezt a kurzust.
        </p>
      ) : null}
    </div>
  )
}
