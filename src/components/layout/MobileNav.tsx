'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useState } from 'react'

import type { NavItem } from '../../lib/menu-tree'
import { NavAnchor } from './NavAnchor'

/**
 * Mobil (< 900px) navigáció: hamburger-gomb + jobb oldali drawer.
 *
 * Akadálymentesség:
 * - a toggle aria-expanded/aria-controls állapota tükrözi a drawert,
 * - Escape zárja, az overlay-kattintás zárja, navigációkor automatikusan záródik,
 * - nyitva tartás alatt a body görgetése tiltott,
 * - a drawer fókuszalható tartalomként jelenik meg (fókuszgyűrű megmarad).
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const drawerId = useId()

  const close = useCallback(() => setOpen(false), [])

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

  // Escape + body scroll-lock.
  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
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
        onClick={close}
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
            onClick={close}
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
