import Link from 'next/link'

import { Container } from '../ui/Container'
import { getNavTree } from '../../lib/menus'
import { DesktopNav } from './DesktopNav'
import { MobileNav } from './MobileNav'

/**
 * Fejléc — a menus menüfából renderel (visible + published-cél, max 2 szint,
 * order szerint; lásd src/lib/menu-tree.ts). Semmilyen menüstruktúra nincs
 * hardcode-olva: az adat a getNavTree() ELŐ lekérdezéséből jön (server
 * component + Payload local API).
 *
 * A márka-jelölés szöveges: a legacy logókép (docs/legacy kckeklogog.png)
 * asset-jellegű, és a legacy assetek jelenleg nincsenek a repóban — a
 * képalapú logó a Media collectionből, a következő hullámban köthető be.
 */
export async function Header() {
  const items = await getNavTree()

  return (
    <header className="kc-site-header">
      <Container>
        <div className="kc-site-header__bar">
          <Link aria-label="Kineticare — kezdőlap" className="kc-site-header__brand" href="/">
            Kineticare
          </Link>
          <DesktopNav items={items} />
          <MobileNav items={items} />
        </div>
      </Container>
    </header>
  )
}
