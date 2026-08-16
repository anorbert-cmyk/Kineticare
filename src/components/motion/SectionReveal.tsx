'use client'

import { useEffect } from 'react'

/**
 * SectionReveal — a kezdőlap szekcióinak halk belépője.
 *
 * ═══ MIT CSINÁL ═══
 * A `<main>` KÖZVETLEN szekció-gyermekeit figyeli, és amelyik a hajtás alatt
 * van, azt néhány pixeles emelkedéssel + áttűnéssel hozza be, amikor a
 * nézetbe ér. EGYSZER: a megjelenés után a megfigyelő leválik a szekcióról,
 * tehát visszafelé görgetve nincs villogás.
 *
 * ═══ MIÉRT ÍGY ═══
 *  - A rejtett kezdőállapotot KIZÁRÓLAG ez a kliens-effekt teszi rá. Ha a CSS
 *    írná ki alapból, akkor JS nélkül (vagy hibás hidratálásnál) a tartalom
 *    végleg láthatatlan maradna — a belépő animációk klasszikus, tartalmat
 *    elnyelő hibája.
 *  - Csak a HAJTÁS ALATTI szekciók kapják meg. A már látható (hero, hitel-csík)
 *    szekció bántatlan marad, különben a betöltés után villanna egyet.
 *  - `prefers-reduced-motion: reduce` esetén az effekt AZONNAL kilép: nem tesz
 *    ki osztályt, nem indít megfigyelőt. (A CSS-oldali biztosíték a
 *    styles/motion.css-ben is megvan.)
 *  - `IntersectionObserver` hiányában szintén nem történik semmi.
 *
 * A mozgás-nyelv a kurzusoldal meglévő staggered mintája: ugyanaz a
 * `kc-fade-up` kulcsképsor (8px emelkedés + áttűnés) és ugyanaz a
 * lépcsőzött késleltetés — a késleltetést a `--kc-reveal-stagger` egyedi
 * tulajdonság viszi, ahogy a kurzusoldalon a `--kc-course-stagger`.
 */

/** A belépő-osztály (kezdőállapot) — a stílusát a styles/motion.css adja. */
const REVEAL_CLASS = 'kc-reveal'
/** A megjelent állapot jelölője. */
const REVEALED_CLASS = 'is-revealed'
/**
 * Egy szekció akkor kap belépőt, ha a betöltéskor a nézetablak alja alatt
 * kezdődik. A 0,9-es szorzó ad egy kis ráhagyást: a hajtás alján éppen
 * beleérő szekció még „látottnak" számít, tehát nem villan.
 */
const BELOW_FOLD_RATIO = 0.9
/** A megfigyelő ennyivel a nézetablak alja ELŐTT gyújt (korai, nyugodt belépő). */
const ROOT_MARGIN = '0px 0px -12% 0px'

export function SectionReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function' || typeof window.matchMedia !== 'function') {
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const main = document.querySelector('main')
    if (main === null) {
      return
    }

    const fold = window.innerHeight * BELOW_FOLD_RATIO
    const targets = Array.from(main.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.classList.contains('kc-section') &&
        element.getBoundingClientRect().top > fold,
    )
    if (targets.length === 0) {
      return
    }

    for (const [index, target] of targets.entries()) {
      target.classList.add(REVEAL_CLASS)
      // A lépcsőzés a szekción BELÜL nem, csak a szekciók között értelmes; a
      // modulo tartja 3 lépcsőn belül, hogy a lap alján se gyűljön fel
      // fél másodperces késleltetés.
      target.style.setProperty('--kc-reveal-stagger', String(index % 3))
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          entry.target.classList.add(REVEALED_CLASS)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    )
    for (const target of targets) {
      observer.observe(target)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
