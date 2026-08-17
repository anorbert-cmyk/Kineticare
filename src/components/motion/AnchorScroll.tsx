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
 * Ennyi nézetablak-magasságnál hosszabb ugrás számít HOSSZÚNAK.
 *
 * 1 = pontosan egy képernyőnyi. A mért Chromium-görbén ez 483 ms-os
 * animációt jelent, ami még a NN/g 500 ms-os küszöbe alatt van.
 */
const MAX_ANIMALT_NEZETABLAK = 1

/**
 * ═══ A HOSSZÚ, LAPON BELÜLI UGRÁS RÖVIDÍTÉSE ═══
 *
 * Tulajdonosi döntés (2026-08-17): „elsimítás nagyon fontos" — a mozgás tehát
 * NEM tűnhet el, csak nem húzódhat el. A korábbi megoldás a hosszú ugrást
 * azonnalivá tette (0 ms); ez megszüntette az „ugrálást", de a simítást is.
 *
 * A mostani megoldás a TÁVOLSÁGOT rövidíti, nem a mozgást tünteti el: a
 * kattintás pillanatában azonnal a cél elé ugrunk fél képernyőnyire, és az
 * utolsó szakaszt a böngésző saját sima görgetése teszi meg. A néző így nem
 * lát elhúzódó, képkockát ejtő átsuhanást a lap közepén, viszont a célhoz
 * érkezés SIMA marad, és látja, hova ért.
 *
 * A 0,5 érték MÉRT: a Chromium `scroll-behavior: smooth` animáció-hossza a
 * távolság szerint (900 px-es nézetablak) 0,5× → 333 ms · 0,75× → 417 ms ·
 * 1,0× → 483 ms · 2,0× és fölötte → 683 ms (befagy). A 333 ms a NN/g által
 * ajánlott 100–500 ms-os sávban van, annak is a kényelmes közepén.
 *
 * MIÉRT NEM SAJÁT rAF-ANIMÁCIÓ: ahhoz el kellene nyelni a kattintást
 * (`preventDefault`), és magunknak kellene görgetni. Azzal az útválasztó
 * állapotkezelése, az előzmények és a horgonyra kerülő fókusz is ránk szállna
 * (ui-sztenderdek N-13). Így viszont a böngésző végzi a görgetést, mi csak a
 * kiindulópontot állítjuk át.
 *
 * FIGYELEM, MÉRT CSAPDA: a `behavior: 'auto'` NEM azonnalit jelent, hanem azt,
 * hogy a böngésző a CSS `scroll-behavior`-t használja — ami itt `smooth`.
 * Mérve: az `auto`-val kért előkészítő ugrás MAGA is végiganimálódott
 * (0 → 1685 px, 698 ms), és a rákövetkező görgetés így ismét a teljes utat
 * tette meg. A nem animált értéket kimondottan kérni kell: `'instant'`.
 */
const ELOKESZITO_NEZETABLAK = 0.5

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

/**
 * A rövidített ugrás KIINDULÓPONTJA: a cél előtt fél képernyővel, a mozgás
 * irányában. Tiszta függvény, hogy DOM nélkül is őrizhető legyen.
 *
 * @param celPx a cél abszolút görgetés-pozíciója
 * @param jelenlegiPx a jelenlegi görgetés-pozíció
 * @param nezetablakPx a nézetablak magassága
 * @returns az a pozíció, ahonnan a böngésző sima görgetése induljon
 */
export function elokeszitoPozicio(
  celPx: number,
  jelenlegiPx: number,
  nezetablakPx: number,
): number {
  const irany = celPx < jelenlegiPx ? -1 : 1
  return Math.max(0, celPx - irany * nezetablakPx * ELOKESZITO_NEZETABLAK)
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

    /**
     * A LAPON BELÜLI hosszú ugrás rövidítése: azonnal a cél elé ugrunk fél
     * képernyővel, a maradékot a böngésző sima görgetése teszi meg (~333 ms).
     * Rövid ugrásnál nem csinál semmit — az eleve sima és rövid.
     */
    const rovidit = (pozicio: number) => {
      if (!hosszuUgras(pozicio - window.scrollY, window.innerHeight)) {
        return
      }
      window.scrollTo({
        behavior: 'instant',
        top: elokeszitoPozicio(pozicio, window.scrollY, window.innerHeight),
      })
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

      // (a) UGYANAZON az oldalon, horgonyra: a távolság MOST mérhető, tehát a
      //     hosszú utat RÖVIDÍTJÜK, nem tüntetjük el. A látogató a lapot már
      //     látta, a célhoz érkezés így sima marad (tulajdonosi döntés).
      if (azonosOldal(link) && link.hash.length > 0) {
        const pozicio = celPozicio(link.hash)
        if (pozicio !== null) {
          rovidit(pozicio)
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

    // Hash-váltás a LAPON BELÜL (pl. böngésző vissza-gombja): a cél mérhető,
    // tehát ugyanaz a rövidítés, mint a kattintásnál.
    const onHashChange = () => {
      const pozicio = celPozicio(window.location.hash)
      if (pozicio !== null) {
        rovidit(pozicio)
      }
    }

    // Hideg betöltés horgonnyal: a böngésző a lap megjelenése UTÁN, késleltetve
    // indítja az animált görgetést (mérve ~250 ms-mal a load után). Itt a
    // látogató az ÚJ lapot még sosem látta, tehát az érkezés azonnali — a
    // (b) ággal azonos indoklás (WCAG 2.2 SC 2.3.3: nem lényegi mozgás).
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
