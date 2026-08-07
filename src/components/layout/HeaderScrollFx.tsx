'use client'

import { useEffect } from 'react'

/**
 * HeaderScrollFx — a sticky fejléc scroll-állapotának jelzője.
 *
 * 8px görgetés felett a <html> elemre kerül a `data-kc-scrolled` attribútum;
 * a vizuális átmenet (tömörebb, enyhén áttetsző sáv + árnyék) tisztán CSS-ből
 * jön (layout.css), így a komponens nem renderel semmit és per-frame React
 * állapotot sem tart. A scroll-esemény passzív, a frissítés
 * requestAnimationFrame-be fogva. A kontraszt-követelményeket a
 * docs/ertekesitesi-ux-skill.md 3. pontja rögzíti.
 */
export function HeaderScrollFx() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0

    const update = () => {
      frame = 0
      root.toggleAttribute('data-kc-scrolled', window.scrollY > 8)
    }

    const onScroll = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== 0) {
        cancelAnimationFrame(frame)
      }
      root.removeAttribute('data-kc-scrolled')
    }
  }, [])

  return null
}
