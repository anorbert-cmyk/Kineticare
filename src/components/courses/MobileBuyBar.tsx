'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

/**
 * MobileBuyBar — mobil ragadós vásárlósáv (ár + gomb).
 *
 * ═══ MIÉRT ═══
 * Két képernyőnél hosszabb értékesítő oldalon a vásárlási CTA-nak
 * ismétlődnie kell, mobilon pedig ragadós ár+gomb sáv indokolt
 * (docs/ux-belso-oldalak-kutatas.md B6.1). A sáv CSAK akkor jelenik meg,
 * amikor a fő vásárlódoboz már NEM látszik — így sosem versenyez önmagával,
 * és a lap tetején nem vesz el helyet.
 *
 * ═══ MIÉRT NINCS BENNE React-ÁLLAPOT ═══
 * A láthatóságot közvetlenül a DOM-on billentjük (`data-visible`), nem
 * `useState`-tel. Két oka van: (1) a szerver-oldali kimenet így determinisztikus
 * (a sáv MINDIG rejtetten renderelődik, nincs hidratálási eltérés), (2) JS
 * nélkül — vagy ha az IntersectionObserver nem elérhető — a sáv egyszerűen
 * rejtve marad, tehát a degradáció csendes és teljes (a CSS alapállapota
 * `display: none`).
 *
 * ═══ AKADÁLYMENTESSÉG ═══
 * A sáv a lap ALJÁN ragad, ezért eltakarhatná az épp fókuszált elemet
 * (WCAG 2.2 SC 2.4.11). Ezért amíg látszik, a dokumentumgyökér
 * `kc-has-buybar` osztályt kap: ez állítja be a `scroll-padding-bottom`-ot
 * és a lap alsó térközét (kurzusok.css). A gomb célfelülete itt is 44px
 * (a `kc-button` minimuma).
 */
export interface MobileBuyBarProps {
  /** A megfigyelt vásárlódoboz `id`-je (CourseBuybox). */
  anchorId: string
  /** A kurzus címe — a sáv akadálymentes megnevezéséhez. */
  courseTitle: string
  /** A CTA felirata (a courses.ts resolveCourseCta állapotgépéből). */
  label: string
  href: string
  /** Kiírt ár („79 500 Ft") vagy „Ingyenes"; null, ha nincs mit kiírni. */
  priceLabel: string | null
}

/** A dokumentumgyökér jelölése, amíg a sáv látszik (scroll-padding + térköz). */
const ROOT_CLASS = 'kc-has-buybar'

export function MobileBuyBar({
  anchorId,
  courseTitle,
  label,
  href,
  priceLabel,
}: MobileBuyBarProps) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    const target = document.getElementById(anchorId)
    if (bar === null || target === null || typeof IntersectionObserver !== 'function') {
      return
    }
    const root = document.documentElement
    const apply = (show: boolean) => {
      bar.dataset.visible = show ? 'true' : 'false'
      root.classList.toggle(ROOT_CLASS, show)
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry !== undefined) {
        apply(!entry.isIntersecting)
      }
    })
    observer.observe(target)
    return () => {
      observer.disconnect()
      apply(false)
    }
  }, [anchorId])

  return (
    <div
      aria-label={`${courseTitle} — vásárlás`}
      className="kc-course-buybar"
      data-visible="false"
      ref={barRef}
      role="region"
    >
      {priceLabel === null ? null : <p className="kc-course-buybar__price">{priceLabel}</p>}
      <Link className="kc-button kc-button--primary kc-course-buybar__cta" href={href}>
        {label}
      </Link>
    </div>
  )
}
