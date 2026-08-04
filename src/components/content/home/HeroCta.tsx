import { Button } from '../../ui/Button'

/**
 * HeroCta — a kezdőlap hero elsődleges/másodlagos akciói (audit M1/K3).
 *
 * EGY elsődleges CTA a fizetős kurzusokra (→ /kurzusok) és EGY visszafogott,
 * másodlagos link az ingyenes SOS-anyagra (lapon belüli #ingyenes horgony) —
 * a lead-magnet súlya sosem éri utol az értékesítési útvonalat (audit K2).
 */
export function HeroCta() {
  return (
    <div className="kc-hero__actions">
      <Button href="/kurzusok">Kurzusok megtekintése</Button>
      <Button href="#ingyenes" variant="ghost">
        Ingyenes SOS gyakorlatok
      </Button>
    </div>
  )
}
