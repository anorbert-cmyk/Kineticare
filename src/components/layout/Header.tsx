import Link from 'next/link'

import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { getNavTree } from '../../lib/menus'
import { DesktopNav } from './DesktopNav'
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
 */
export async function Header() {
  const items = await getNavTree()

  return (
    <header className="kc-site-header">
      <HeaderScrollFx />
      <Container>
        <div className="kc-site-header__bar">
          <Link aria-label="Kineticare — kezdőlap" className="kc-site-header__brand" href="/">
            Kineticare
          </Link>
          <DesktopNav items={items} />
          <div className="kc-site-header__actions">
            <Button href="/kurzusok" size="sm">
              Kurzusok
            </Button>
            <MobileNav items={items} />
          </div>
        </div>
      </Container>
    </header>
  )
}
