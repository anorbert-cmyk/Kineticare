'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

/**
 * CourseBuyBar — a kurzusoldal ragadós vásárlósávja (ár + gomb).
 *
 * ═══ MIÉRT ═══
 * Két képernyőnél hosszabb értékesítő oldalon a vásárlási CTA-nak elérhetőnek
 * kell maradnia (docs/ux-belso-oldalak-kutatas.md B6.1). A sáv CSAK akkor
 * jelenik meg, amikor a vásárlódoboz GOMBJA nem látszik — így sosem versenyez
 * önmagával, és a lap tetején nem vesz el helyet.
 *
 * ═══ MIÉRT A GOMBOT FIGYELI, ÉS MIÉRT ASZTALON IS ═══
 * A komponens 2026-08-16-ig „MobileBuyBar" volt: a teljes vásárlódobozt
 * figyelte, és `@media (max-width: 1023px)` mögött állt. A böngészős mérés
 * (produkciós build, Chromium 141, `elementFromPoint`) megmutatta, hogy ez
 * asztali méreteken lyukat hagy: a ragadós doboz magasabb lehet, mint a
 * rendelkezésre álló nézetablak-magasság, ilyenkor a doboz ALJA (benne a
 * gombbal) sosem kerül képbe, miközben a doboz TETEJE látszik — a régi
 * feltétel szerint tehát a sáv nem jelent meg, a gomb meg nem volt elérhető.
 * Mérve 1366×768-on a lap görgetésének 10%-án, 1280×720-on 8%-án volt
 * kattintható a „Megveszem".
 *
 * A javítás két lépcsős: (1) a doboz belül görgethető és a nézetablakhoz
 * kötött magasságú (kurzusok.css), (2) HA a gomb így sem fér ki — mert a
 * CMS-ből jövő cím és lead hosszú, vagy a süti-sáv is helyet vesz el —,
 * akkor ez a sáv veszi át. A feltétel ezért MÉRET-alapú, nem töréspont-alapú:
 * az IntersectionObserver magától az ősök levágását (`overflow`) is beszámítja,
 * tehát pontosan akkor gyújt, amikor a gomb TÉNYLEGESEN nem látszik.
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
 * (a `kc-button` minimuma). A sáv maga a süti-sáv FÖLÉ ül
 * (`--kc-consent-offset`), mert a hozzájárulás-kezelőt eltakarni nem szabad.
 */
export interface CourseBuyBarProps {
  /**
   * A megfigyelt elem `id`-je: a vásárlódoboz GOMBJA (CourseCta). A sáv
   * pontosan akkor jelenik meg, amikor ez az elem nem látszik.
   */
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

/**
 * Ekkora látható hányad alatt lép be a sáv. A küszöb SZÁNDÉKOSAN „majdnem
 * teljesen": a részben levágott gomb nem elég.
 *
 * MÉRVE (1366×768, süti-sávval): a doboz belső görgetése a gombnak csak a
 * felső 21 pixelét hagyta meg (53-ból), a KÖZEPE már a levágás alá esett —
 * `elementFromPoint` szerint tehát a gomb közepe nem volt kattintható, a
 * puszta „metszi-e" feltétel viszont igaznak látszott, és a sáv nem jelent
 * meg. Ezért a döntés az `intersectionRatio`-n áll, nem az `isIntersecting`-en.
 *
 * Miért nem pontosan 1: a törtpixeles doboz-méretek miatt az arány sosem éri
 * el biztosan az 1,0-t, és a sáv beragadna.
 */
const TELJESEN_LATSZIK = 0.99

export function CourseBuyBar({
  anchorId,
  courseTitle,
  label,
  href,
  priceLabel,
}: CourseBuyBarProps) {
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
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (entry !== undefined) {
          apply(entry.intersectionRatio < TELJESEN_LATSZIK)
        }
      },
      // Mindkét határon értesülünk: amikor a gomb egyáltalán eltűnik, és
      // amikor éppen teljesen láthatóvá válik.
      { threshold: [0, TELJESEN_LATSZIK] },
    )
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
