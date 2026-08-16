import { Button } from '../../ui/Button'

/**
 * HeroCta — a kezdőlap hero elsődleges/másodlagos akciói (audit M1/K3).
 *
 * EGY elsődleges CTA a fizetős kurzusokra (→ /kurzusok) és EGY visszafogott,
 * másodlagos link az ingyenes SOS-anyagra (lapon belüli #ingyenes horgony) —
 * a lead-magnet súlya sosem éri utol az értékesítési útvonalat (audit K2).
 * Egy lapon egy főcselekvés: „Avoid using multiple default buttons on a single
 * page. Having more than one main call to action reduces their impact, and
 * makes it harder for users to know what to do next."
 * (GOV.UK Design System, Button,
 * https://design-system.service.gov.uk/components/button/)
 *
 * A FELIRAT a szótárból jön, nem szabad szöveg: a kurzuslistára a jóváhagyott
 * alak a „Nézd meg a kurzusokat" (docs/ui-sztenderdek.md §3.2 #10, kódbeli
 * szótár: src/lib/cta-vocabulary.ts `course-list-open`). A korábbi „Kurzusok
 * megtekintése" ugyanerre a cselekvésre egy MÁSODIK feliratot vezetett be
 * ugyanazon a lapon, ami WCAG 2.2 3.2.4 (Consistent Identification) sérülés:
 * „Components that have the same functionality within a set of web pages are
 * identified consistently."
 * (https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html)
 *
 * Megjegyzés: ez a hero csak akkor renderel, ha a kezdőlapnak NINCS
 * szekciósora. Szekciósorral a `filmHero` blokk CMS-gombjai jelennek meg —
 * azok alapállapotát a `src/lib/home-seed.ts` adja, ugyanezzel a felirattal.
 */
export function HeroCta() {
  return (
    <div className="kc-hero__actions">
      <Button href="/kurzusok">Nézd meg a kurzusokat</Button>
      <Button href="#ingyenes" variant="ghost">
        Ingyenes SOS gyakorlatok
      </Button>
    </div>
  )
}
