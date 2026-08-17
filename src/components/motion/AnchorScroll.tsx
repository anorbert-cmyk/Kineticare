'use client'

import { useEffect } from 'react'

/**
 * AnchorScroll — a HOSSZÚ horgony-ugrás ne animálódjon.
 *
 * ═══ A MÉRT HIBA ═══
 * A `base.css` a gyökérre `scroll-behavior: smooth`-t tesz, ezért MINDEN
 * horgony-ugrás végiganimálódik, bármilyen messze van a cél. A fejléc-menü
 * „Rendelői kezelések" pontja (`/szolgaltatasok#rendeloi`) 1440×900-on
 * 2048 px-t (2,3 nézetablak), 390×844-en 3138 px-t (3,7 nézetablak) görget —
 * Chromiumban mérve 661–790 ms-ig tartó, a teljes lapot elhúzó mozgás, ami
 * terhelés alatt képkockákat is ejt (4× CPU-fékkel 3–6 kockát a 717 ms-ból).
 *
 * ═══ A KÜSZÖB LEVEZETÉSE (mérés, nem érzés) ═══
 * Chromium `scroll-behavior: smooth` animáció-hossza a távolság szerint
 * (900 px magas nézetablak): 0,22× → 217 ms · 0,5× → 333 ms · 0,75× → 417 ms ·
 * 1,0× → 483 ms · 1,5× → 600 ms · 2,0× és fölötte → 683 ms (itt befagy).
 * A NN/g mérése szerint 500 ms fölött az animáció „a real drag" a
 * felhasználónak, az ajánlott sáv 100–500 ms. PONTOSAN egy nézetablaknyi
 * ugrás az utolsó, amely még e küszöb alatt marad — ezért ez a határ.
 * A WCAG 2.2 SC 2.3.3 (Animation from Interactions) ugyanezt az elvet mondja
 * ki a görgetéshez társított, nem lényegi mozgásra.
 *
 * ═══ MIÉRT ÍGY, ÉS NEM A KATTINTÁS ELKAPÁSÁVAL ═══
 * A komponens NEM hívja meg a `preventDefault`-ot, és nem görget maga: csak
 * egy osztályt tesz a gyökérre a `styles/motion.css` `.kc-scroll-instant`
 * szabályához, mielőtt a böngésző (vagy a Next.js útválasztó) elindítaná a
 * görgetést. Így az útválasztó állapotkezelése, az előzmények és a
 * horgonyra kerülő fókusz (ui-sztenderdek N-13) érintetlen marad — csak a
 * mozgás módja változik. Ha a JS nem fut le, a lap pontosan a mai módon
 * viselkedik.
 *
 * `prefers-reduced-motion: reduce` esetén a komponens azonnal kilép: ott a
 * base.css már `scroll-behavior: auto`-t ad, tehát nincs mit visszavenni.
 */

/** A gyökér-osztály, amely a görgetést azonnalivá teszi (motion.css). */
const INSTANT_CLASS = 'kc-scroll-instant'

/**
 * Ennyi nézetablak-magasságnál hosszabb ugrás megy azonnal.
 *
 * 1 = pontosan egy képernyőnyi. A mért Chromium-görbén ez 483 ms-os
 * animációt jelent, ami még a NN/g 500 ms-os küszöbe alatt van.
 */
const MAX_ANIMALT_NEZETABLAK = 1

/**
 * Ennyi ideig marad fenn az azonnali mód, ha a böngésző nem ismeri a
 * `scrollend` eseményt. Bőven fedi a lapváltás utáni, késleltetett görgetést
 * is (mérve: hideg betöltésnél ~250 ms-mal a load után indul a görgetés).
 */
const VISSZAALLITAS_MS = 1200

/**
 * Hosszú-e az ugrás? Tiszta függvény, hogy DOM nélkül is őrizhető legyen
 * (őr-teszt: horgony-ugras).
 *
 * @param tavolsagPx a jelenlegi és a cél görgetés-pozíció különbsége (px)
 * @param nezetablakPx a nézetablak magassága (px)
 * @returns true, ha az ugrás egy nézetablaknál hosszabb
 */
export function hosszuUgras(tavolsagPx: number, nezetablakPx: number): boolean {
  if (nezetablakPx <= 0) {
    return false
  }
  return Math.abs(tavolsagPx) > nezetablakPx * MAX_ANIMALT_NEZETABLAK
}

/** A hash-ből a cél elem — üres, „#" és „#top" esetén a lap teteje. */
function celElem(hash: string): HTMLElement | null {
  const azonosito = decodeURIComponent(hash.replace(/^#/, ''))
  if (azonosito === '') {
    return null
  }
  const talalat =
    document.getElementById(azonosito) ??
    document.querySelector<HTMLElement>(`a[name="${CSS.escape(azonosito)}"]`)
  return talalat instanceof HTMLElement ? talalat : null
}

/** A hash céljának abszolút görgetés-pozíciója; hiányzó célnál null. */
function celPozicio(hash: string): number | null {
  const elem = celElem(hash)
  if (elem === null) {
    return hash === '' || hash === '#' || hash === '#top' ? 0 : null
  }
  return elem.getBoundingClientRect().top + window.scrollY
}

export function AnchorScroll() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const gyoker = document.documentElement
    let visszaallitas: ReturnType<typeof setTimeout> | null = null

    const vissza = () => {
      gyoker.classList.remove(INSTANT_CLASS)
      if (visszaallitas !== null) {
        clearTimeout(visszaallitas)
        visszaallitas = null
      }
      window.removeEventListener('scrollend', vissza)
    }

    /** Azonnali módba kapcsol, és gondoskodik a visszaállásról. */
    const azonnal = () => {
      gyoker.classList.add(INSTANT_CLASS)
      if (visszaallitas !== null) {
        clearTimeout(visszaallitas)
      }
      // A `scrollend` a pontos jel; ahol nincs, ott az időzítő zár.
      window.addEventListener('scrollend', vissza, { once: true })
      visszaallitas = setTimeout(vissza, VISSZAALLITAS_MS)
    }

    /** Ugyanarra az útvonalra (csak horgonyban eltérő) mutat-e a hivatkozás? */
    const azonosOldal = (link: HTMLAnchorElement): boolean =>
      link.pathname === window.location.pathname && link.search === window.location.search

    const onClick = (esemeny: MouseEvent) => {
      // Új lapon nyíló vagy módosítóval indított kattintás nem görget.
      if (esemeny.defaultPrevented || esemeny.button !== 0) {
        return
      }
      if (esemeny.metaKey || esemeny.ctrlKey || esemeny.shiftKey || esemeny.altKey) {
        return
      }
      const cel = esemeny.target
      if (!(cel instanceof Element)) {
        return
      }
      const link = cel.closest('a')
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') {
        return
      }
      // Külső hivatkozás: a lap elhagyása, itt nincs mit görgetni.
      if (link.host !== window.location.host) {
        return
      }

      // (a) UGYANAZON az oldalon, horgonyra: a távolság MOST mérhető.
      if (azonosOldal(link) && link.hash.length > 0) {
        const pozicio = celPozicio(link.hash)
        if (pozicio !== null && hosszuUgras(pozicio - window.scrollY, window.innerHeight)) {
          azonnal()
        }
        return
      }

      // (b) MÁSIK oldalra, horgonnyal (pl. a fejléc-menü „Rendelői kezelések"
      //     pontja egy másik lapról). A cél most nem mérhető, mert a lap még
      //     nincs kirenderelve — de nem is kell: a felhasználó az ÚJ lapot még
      //     sosem látta, tehát a mozgásnak nincs mit összekötnie a szemében.
      //     Ez a mozgás definíció szerint nem lényegi (WCAG 2.2 SC 2.3.3),
      //     ezért mindig azonnali.
      if (link.hash.length > 0) {
        azonnal()
        return
      }

      // (c) Horgony NÉLKÜLI belső hivatkozás: az útválasztó a lap TETEJÉRE
      //     görget. Mérve: a menüpontra visszakattintva ez ugyanaz a 2055 px-es,
      //     ~700 ms-os elhúzás volt, csak felfelé.
      if (hosszuUgras(window.scrollY, window.innerHeight)) {
        azonnal()
      }
    }

    const onHashChange = () => {
      const pozicio = celPozicio(window.location.hash)
      if (pozicio !== null && hosszuUgras(pozicio - window.scrollY, window.innerHeight)) {
        azonnal()
      }
    }

    // Hideg betöltés horgonnyal: a böngésző a lap megjelenése UTÁN, késleltetve
    // indítja az animált görgetést (mérve ~250 ms-mal a load után) — a
    // csatoláskor tehát még idejében azonnali módba tudunk kapcsolni.
    if (window.location.hash.length > 1) {
      const pozicio = celPozicio(window.location.hash)
      if (pozicio !== null && hosszuUgras(pozicio - window.scrollY, window.innerHeight)) {
        azonnal()
      }
    }

    // A kattintást ELFOGÁSI szakaszban nézzük: a `scroll-behavior`-t azelőtt
    // kell átállítani, hogy az útválasztó vagy a böngésző elindítaná a
    // görgetést. Az eseményt nem nyeljük el, csak megjelöljük a módot.
    document.addEventListener('click', onClick, true)
    window.addEventListener('hashchange', onHashChange)

    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('hashchange', onHashChange)
      vissza()
    }
  }, [])

  return null
}
