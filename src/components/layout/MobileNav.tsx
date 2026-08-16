'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import type { NavItem } from '../../lib/menu-tree'
import { AccountNav } from './AccountNav'
import { NavAnchor } from './NavAnchor'

/**
 * Mobil (< 900px) navigáció: hamburger-gomb + jobb oldali drawer.
 *
 * Az almenü a drawerben KIBONTVA jelenik meg (nincs második koppintás): a
 * fejléc-menü két szintje elfér egy listában, és így minden cél egyetlen
 * gesztussal elérhető. Az érintési célfelület minden soron 44×44px
 * (docs/ertekesitesi-ux-skill.md 3. pont), a mozgást a globális
 * `prefers-reduced-motion` szabály (styles/base.css) kapcsolja ki.
 *
 * Akadálymentesség:
 * - a toggle aria-expanded/aria-controls állapota tükrözi a drawert,
 * - Escape zárja, az overlay-kattintás zárja, navigációkor automatikusan záródik,
 * - nyitva tartás alatt a body görgetése tiltott,
 * - NYITÁSKOR a fókusz a drawer bezáró gombjára kerül, ZÁRÁSKOR (Escape,
 *   bezáró gomb, overlay-kattintás) visszatér a hamburgerre. Enélkül a
 *   billentyűzetes látogató fókusza a drawerbe lépés előtt a fejlécben maradt,
 *   Escape után pedig NYOM NÉLKÜL elveszett: a drawer zárt állapotban
 *   `visibility: hidden`, tehát a benne fókuszált elem megszűnik fókuszálható
 *   lenni, és a fókusz a `<body>`-ra esik vissza.
 * - Hivatkozásra kattintva a fókusz NEM tér vissza a hamburgerre: ott az
 *   oldalváltás veszi át, a fókusz-visszaadás elrabolná az új oldal
 *   kezdőpontját.
 *
 * A FIÓK-BLOKK A DRAWER ELSŐ ELEME (AccountNav). Mobilon a fejléc-sávban nincs
 * hely rá (wordmark + „Kurzusok" pirula + hamburger már kitölti a 320px-es
 * sávot, lásd a Header kommentjét és a 320px-es reflow-mérést), a mai menü
 * viszont KIZÁRÓLAG a CMS-menüpontokat sorolta — a belépés így mobilon
 * sehonnan nem volt elérhető (docs/informacios-architektura.md §4, TOP-10 #2).
 * A blokk azért az ELSŐ elem, mert a lista elejét olvassák el a legnagyobb
 * eséllyel (NN/g F-mintázat, `docs/ui-sztenderdek.md` N-3), és mert a
 * visszatérő vevőnek ez a legfontosabb célja; a CMS-menütől elválasztó
 * hajszálvonal jelzi, hogy más természetű (segéd-)navigáció.
 */
export function MobileNav({ items, signedIn = false }: { items: NavItem[]; signedIn?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const drawerId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])

  /** Zárás + a fókusz visszaadása a hamburgernek (Escape, bezáró gomb, overlay). */
  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false)
    toggleRef.current?.focus()
  }, [])

  // Útvonalváltáskor záródik — a React ajánlott „állapot-igazítás renderben"
  // mintájával (https://react.dev/learn/you-might-not-need-an-effect), nem
  // effektben. Mountkor (és hidratáláskor) a két útvonal egyenlő, tehát nem
  // fut igazítás: a szerver- és a kliens-render kimenete változatlan. Csak
  // tényleges útvonalváltáskor zár, még a festés előtt (effekt helyett).
  const [renderedPathname, setRenderedPathname] = useState(pathname)
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname)
    setOpen(false)
  }

  // Escape + body scroll-lock + a fókusz beléptetése a drawerbe.
  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // A drawer ekkorra már `data-open="true"` (a CSS a rejtett → látható
    // irányban azonnal láthatóra vált), tehát a gomb fókuszálható.
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <div className="kc-nav-mobile">
      <button
        aria-controls={drawerId}
        aria-expanded={open}
        aria-label={open ? 'Menü bezárása' : 'Menü megnyitása'}
        className="kc-nav-mobile__toggle"
        onClick={() => setOpen((value) => !value)}
        ref={toggleRef}
        type="button"
      >
        {open ? (
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        )}
      </button>

      <div
        aria-hidden="true"
        className="kc-nav-mobile__overlay"
        data-open={open}
        onClick={closeAndRestoreFocus}
      />

      <nav
        aria-label="Mobil navigáció"
        className="kc-nav-mobile__drawer"
        data-open={open}
        id={drawerId}
      >
        <div className="kc-nav-mobile__drawer-header">
          <span className="kc-nav-mobile__drawer-title">Menü</span>
          <button
            aria-label="Menü bezárása"
            className="kc-nav-mobile__toggle"
            onClick={closeAndRestoreFocus}
            ref={closeRef}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>
        <AccountNav onNavigate={close} signedIn={signedIn} variant="drawer" />
        {items.length > 0 ? (
          <ul className="kc-nav-mobile__list">
            {items.map((item) => (
              <li key={item.id}>
                <NavAnchor className="kc-nav-mobile__link" item={item} onClick={close} />
                {item.children.length > 0 ? (
                  <ul aria-label={`${item.label} almenü`} className="kc-nav-mobile__sublist">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <NavAnchor className="kc-nav-mobile__sublink" item={child} onClick={close} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="kc-nav-mobile__empty">A menü jelenleg üres.</p>
        )}
      </nav>
    </div>
  )
}
