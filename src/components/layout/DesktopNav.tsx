import type { NavItem } from '../../lib/menu-tree'
import { NavAnchor } from './NavAnchor'

/**
 * Desktop (>= 900px) vízszintes navigáció, egy szintű almenüvel.
 * Az almenü hover ÉS billentyűzet-fókusz (focus-within) alatt is nyitva
 * marad — JS nélkül is használható (a mobil drawer a MobileNav feladata).
 */
export function DesktopNav({ items }: { items: NavItem[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <nav aria-label="Fő navigáció" className="kc-nav-desktop">
      <ul className="kc-nav-desktop__list">
        {items.map((item) => (
          <li className="kc-nav-desktop__item" key={item.id}>
            <NavAnchor className="kc-nav-desktop__link" item={item}>
              {item.label}
              {item.children.length > 0 ? (
                <svg
                  aria-hidden="true"
                  className="kc-nav-desktop__caret"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              ) : null}
            </NavAnchor>
            {item.children.length > 0 ? (
              <ul aria-label={`${item.label} almenü`} className="kc-nav-desktop__submenu">
                {item.children.map((child) => (
                  <li key={child.id}>
                    <NavAnchor className="kc-nav-desktop__sublink" item={child} />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  )
}
