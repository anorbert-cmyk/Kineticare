import Link from 'next/link'

import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { getNavTree } from '../../lib/menus'
import { AccountNav } from './AccountNav'
import { DesktopNav } from './DesktopNav'
import { getHeaderAuthState } from './header-user'
import { HeaderScrollFx } from './HeaderScrollFx'
import { MobileNav } from './MobileNav'

/**
 * Fejléc — a menus menüfából renderel (visible + published-cél, max 2 szint,
 * order szerint; lásd src/lib/menu-tree.ts). A menüstruktúra nem hardcode-olt:
 * az adat a getNavTree() ELŐ lekérdezéséből jön (server component + Payload
 * local API).
 *
 * KIVÉTEL — a „Kurzusok" akciógomb: az értékesítés fő útja
 * (docs/ertekesitesi-ux-skill.md 3. pont) nem függhet a CMS-menü
 * tartalmától, ezért kód-szinten, mindig jelen van a sáv jobb szélén —
 * mobilon a hamburger mellett is. A sáv scroll-állapotát a HeaderScrollFx
 * jelzi (data-kc-scrolled), a vizuális váltás CSS-ben él (layout.css).
 *
 * A márka-jelölés szöveges: a legacy logókép (docs/legacy kckeklogog.png)
 * asset-jellegű, és a legacy assetek jelenleg nincsenek a repóban — a
 * képalapú logó a Media collectionből, a következő hullámban köthető be.
 * A wordmark a landing `.kc-wordmark` nyelvét veszi át (Tenor Sans, ritkított
 * verzál, a „care" tag akcent-színnel) — a látható szöveg VÁLTOZATLAN
 * („Kineticare"), a verzál pusztán CSS-transzformáció, így a DOM-szöveg és a
 * képernyőolvasós név is a régi marad.
 *
 * MÁSODIK KIVÉTEL — a hitelesítési belépési pont (AccountNav). A site-kereten
 * korábban NULLA belépési pont volt (docs/informacios-architektura.md §4 és
 * TOP-10 #2, #6; a javítás kiírása §8.1/2), ezért a visszatérő vevő nem talált
 * vissza a megvett kurzusához. A blokk a „Kurzusok" gomb MELLETT áll, de
 * másodlagos súllyal — a lapon egy elsődleges cselekvés lehet (GOV.UK Design
 * System, Button: „Avoid using multiple default buttons on a single page";
 * https://design-system.service.gov.uk/components/button/). Az elhelyezés a
 * jobb felső sarok, mert a látogató ott keresi (NN/g — Utility Navigation:
 * https://www.nngroup.com/articles/utility-navigation/).
 *
 * A SÁVBAN csak 900px felett látszik: mobilon a wordmark + „Kurzusok" pirula +
 * hamburger már kitölti a 320px-es sávot, ezért ott a blokk a drawer ELSŐ
 * eleme (MobileNav) — így 320px-en sincs vízszintes görgetés (WCAG 2.2 1.4.10
 * Reflow). Az állapot szerver-oldalon dől el (header-user.ts), a
 * `(frontend)` csoport pedig már ma is `force-dynamic`, tehát a lekérdezés nem
 * vesz el statikus renderelést.
 */
export async function Header() {
  const [items, auth] = await Promise.all([getNavTree(), getHeaderAuthState()])

  return (
    <header className="kc-site-header">
      <HeaderScrollFx />
      <Container>
        <div className="kc-site-header__bar">
          <Link aria-label="Kineticare kezdőlap" className="kc-site-header__brand" href="/">
            Kineti<span className="kc-site-header__brand-accent">care</span>
          </Link>
          <DesktopNav items={items} />
          <div className="kc-site-header__actions">
            <AccountNav signedIn={auth.signedIn} variant="header" />
            <Button className="kc-site-header__cta" href="/kurzusok" size="sm">
              Kurzusok
            </Button>
            <MobileNav items={items} signedIn={auth.signedIn} />
          </div>
        </div>
      </Container>
    </header>
  )
}
