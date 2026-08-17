'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * AnchorScroll — a HOSSZÚ horgony-ugrás ne animálódjon, és a fókusz kövesse a szemet.
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
 * görgetést. Így az útválasztó állapotkezelése és az előzmények érintetlenek
 * maradnak — csak a mozgás módja változik. Ha a JS nem fut le, a lap pontosan
 * a mai módon viselkedik. (A FÓKUSZT külön ág teszi a célra, lásd lent: azt a
 * böngésző az útválasztón át futó ugrásnál nem mozdítja.)
 *
 * `prefers-reduced-motion: reduce` esetén a MOZGÁS-ág marad ki (ott a base.css
 * már `scroll-behavior: auto`-t ad, tehát nincs mit visszavenni); a FÓKUSZ-ág
 * ilyenkor is fut, mert a mozgás-korlát és az akadálymentesség nem ugyanaz —
 * lásd lent.
 *
 * ═══ A FÓKUSZ IS KÖVESSE A SZEMET (2026-08-17) ═══
 *
 * MÉRT HIBA (Chromium 1194, /szolgaltatasok#rendeloi, 1440×900):
 *   - a fejléc menüpontjára EGÉRREL kattintva a lap a célhoz görget (y=2055),
 *     de a fókusz a menüponton marad, és a következő Tab a menü KÖVETKEZŐ
 *     pontjára visz („Szakmai képzés") — az a cél ELŐTT áll a dokumentumban
 *     (`compareDocumentPosition`: DOCUMENT_POSITION_PRECEDING);
 *   - BILLENTYŰZETTEL ugyanez, ráadásul a látható fókuszgyűrű is a lap tetején,
 *     a menüponton marad, miközben a szem a lap közepén jár;
 *   - HIDEG betöltésnél a `document.activeElement` a `body`.
 * Ez a WCAG 2.2 SC 2.4.3 (Focus Order, A) sérülése: a fókusz sorrendje nem
 * őrzi meg a működés értelmét, ha a szem a lap közepén, a fókusz a tetején van.
 * A repó saját szabálya (docs/ui-sztenderdek.md N-13) ugyanezt írja elő.
 *
 * MIÉRT NEM OLDJA MEG A BÖNGÉSZŐ MAGÁTÓL: a HTML-szabvány „scroll to the
 * fragment" lépése beállítja a *sequential focus navigation starting point*-ot
 * a célra, ezért NATÍV horgony-navigációnál a Tab már ma is a célnál folytatja
 * (mérve: hideg betöltés után a Tab a célon BELÜLI „időpontot kérek" gombra
 * visz). A Next.js útválasztója viszont nem natívan navigál: a
 * `layout-router` a hash-célra `instance.scrollIntoView()`-t hív, és a saját
 * megjegyzése szerint „This handler intentionally leaves focus untouched" —
 * a `scrollIntoView` pedig sem fókuszt, sem kiindulópontot nem állít. Ezért a
 * lapon belüli, útválasztón át futó ugrásnál a Tab a fejlécben marad.
 *
 * A MINTA: `tabindex="-1"` + `focus()` — a GOV.UK Design System „skip link"
 * komponensének `setFocus()` segédlete pontosan ezt teszi (a célra csak akkor
 * tesz `tabindex`-et, ha még nem fókuszálható, és `blur`-kor VISSZASZEDI, hogy
 * a DOM ne maradjon átírva). Két eltérés a mi esetünkben:
 *
 *   1. `focus({ preventScroll: true })`. A `focus()` alapból „scroll the
 *      element into view" — és mivel a lap `scroll-behavior: smooth`-t visz, ez
 *      egy MÁSODIK, animált görgetést indítana az imént beállított pozícióról.
 *      Mérve: `preventScroll` nélkül a fókuszálás 0-ról 2347 px-re görgetett,
 *      `preventScroll: true`-val 0 px volt az elmozdulás.
 *   2. A gyűrű: a repó minden fókusz-szabálya `:focus-visible`-re szól
 *      (base.css), amit a böngésző heurisztikája vezérel. Mérve: egérrel
 *      kattintva a célszekció `matches(':focus-visible')` értéke false, a
 *      számított `outline` `none 0px` — tehát nem villan fel gyűrű. Billentyűs
 *      úton (Enter a menüponton) a gyűrű megjelenik, és ott ez a KÍVÁNT
 *      viselkedés (WCAG 2.2 SC 2.4.7 Focus Visible).
 *
 * MIÉRT A RÖVID UGRÁSNÁL IS: a fókusz-hiba nem a távolságtól függ, hanem attól,
 * hogy az útválasztó nem mozdítja a fókuszt. Mérve: egy nézetablaknál rövidebb
 * ugrásnál (1295 → 2055 px) is a menüponton maradt a fókusz. A SC 2.4.3 nem
 * ismer távolság-küszöböt, ezért a fókusz-ág minden lapon belüli horgonyra fut,
 * a mozgás-ág pedig változatlanul csak az egy nézetablaknál hosszabbra.
 *
 * MIÉRT NEM A HIDEG BETÖLTÉSNÉL: ott natív horgony-navigáció fut, tehát a
 * böngésző már beállította a kiindulópontot — mérve: az első Tab a célon
 * BELÜLI gombra visz. Programozott fókusz ott csak ártana: felhasználói
 * esemény híján a böngésző `:focus-visible`-nek minősíti a fókuszt, és 3 px-es
 * gyűrűt rajzol a szekció köré (mérve: `outline: solid 3px`) — MINDEN
 * látogatónak, az egeresnek is. Márpedig az örökölt `/rendeloi-kezelesek` cím
 * 308-cal pont ide, hideg betöltésre érkezik (src/lib/legacy-redirects.ts).
 *
 * MIÉRT CSÖKKENTETT MOZGÁS MELLETT IS: a `prefers-reduced-motion` a MOZGÁSRÓL
 * szól (WCAG 2.2 SC 2.3.3), nem a fókuszról. Mérve: `reduce` mellett az érkezés
 * azonnali (0 ms), a fókusz viszont ugyanúgy a menüponton maradt — a hiba tehát
 * ott is fennáll. Ezért a komponens már nem lép ki korán: a mozgás-ág kap
 * őrszemet (`csokkentettMozgas()`), a fókusz-ág feltétel nélkül fut.
 *
 * WCAG 2.2 SC 2.4.11 (Focus Not Obscured, AA): a fókuszált cél nem kerülhet a
 * ragadós fejléc alá. Ezt a `scroll-padding-top` adja a gyökéren (base.css),
 * és mérve is tartja magát: a szekció teteje a fejléc alsó éle alatt áll.
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
 * állapotkezelése és az előzmények is ránk szállnának. Így viszont a böngésző
 * végzi a görgetést, mi csak a kiindulópontot állítjuk át.
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

/**
 * A fókuszáláshoz szükséges elem-felület. Azért ez, és nem `HTMLElement`, hogy
 * a `fokuszCelra` DOM nélkül is futtatható legyen (a tesztkörnyezet `node`,
 * jsdom nincs a projektben). Minden `HTMLElement` kielégíti.
 */
export interface FokuszCel {
  readonly tabIndex: number
  hasAttribute(nev: string): boolean
  setAttribute(nev: string, ertek: string): void
  removeAttribute(nev: string): void
  addEventListener(tipus: 'blur', kezelo: () => void, opciok: { once: true }): void
  focus(opciok: { preventScroll: boolean }): void
}

/**
 * Kell-e a célra IDEIGLENES `tabindex`? Csak akkor, ha még nem fókuszálható.
 *
 * A `tabIndex` IDL-tulajdonság a HTML-szabvány szerint az elem alapértelmezett
 * fókuszálhatóságát tükrözi: `a[href]`, `button`, `input` és társaik attribútum
 * nélkül is 0-t adnak, egy sima `section` viszont −1-et. Így egy már
 * fókuszálható célt (pl. ha valaki egy gombra tesz horgonyt) NEM veszünk ki a
 * Tab-sorrendből azzal, hogy ráírunk egy `tabindex="-1"`-et.
 */
function ideiglenesTabindexKell(elem: FokuszCel): boolean {
  return !elem.hasAttribute('tabindex') && elem.tabIndex < 0
}

/**
 * A horgony CÉLJÁRA teszi a fókuszt, GÖRGETÉS NÉLKÜL.
 *
 * A GOV.UK Design System `setFocus()` segédletének mintája: ha a cél még nem
 * fókuszálható, ideiglenes `tabindex="-1"`-et kap, és `blur`-kor visszaszedjük,
 * hogy a lap DOM-ja ne maradjon tartósan átírva. A `preventScroll` a mi
 * kiegészítésünk: enélkül a fókuszálás MÉG EGYSZER odagörgetne, mégpedig
 * animálva (a lap `scroll-behavior: smooth`), és elrontaná az imént beállított
 * pozíciót.
 *
 * @param elem a horgony célja
 * @param ideiglenesek az átmeneti `tabindex`-ek nyilvántartása (leszereléskor
 *   ebből takarítunk, ha a `blur` már nem futna le)
 */
export function fokuszCelra(elem: FokuszCel, ideiglenesek: Set<FokuszCel>): void {
  if (ideiglenesTabindexKell(elem)) {
    elem.setAttribute('tabindex', '-1')
    ideiglenesek.add(elem)
    elem.addEventListener(
      'blur',
      () => {
        elem.removeAttribute('tabindex')
        ideiglenesek.delete(elem)
      },
      { once: true },
    )
  }
  elem.focus({ preventScroll: true })
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
  /**
   * A lapváltás jele. A komponens a storefront-elrendezésben ül, tehát
   * útvonalváltáskor NEM szerelődik újra — a hash céljára kerülő fókuszt
   * ezért az útvonalra fűzött hatás állítja be.
   */
  const utvonal = usePathname()
  /** Az általunk kiosztott, átmeneti `tabindex`-ek — leszereléskor takarítunk. */
  const ideiglenesek = useRef<Set<FokuszCel>>(new Set())

  useEffect(() => {
    const gyoker = document.documentElement
    const nyilvantartas = ideiglenesek.current
    let visszaallitas: ReturnType<typeof setTimeout> | null = null

    /**
     * Csökkentett mozgás: csak a MOZGÁS-ág marad el.
     *
     * Hívásonként kérdezünk rá (nem a felcsatoláskor egyszer), így az
     * időközben átállított rendszer-beállítás azonnal érvényre jut.
     */
    const csokkentettMozgas = (): boolean =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
      if (csokkentettMozgas()) {
        // Ott a base.css már `scroll-behavior: auto`-t ad: nincs mit átállítani.
        return
      }
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
      if (csokkentettMozgas()) {
        // Ott az érkezés eleve azonnali, tehát nincs mit rövidíteni.
        return
      }
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
        // A FÓKUSZ a célra kerül, hogy a következő Tab onnan folytassa.
        // Sorrend: előbb a mozgás kiindulópontja, utána a fókusz — a
        // `preventScroll` miatt a fókuszálás nem nyúl a pozícióhoz.
        // Azért MÉG az alapértelmezett művelet előtt (elfogási szakasz), mert
        // így a natív horgony-navigáció is a mi célunkat találja már
        // fókuszálhatónak, és a saját lépése nem szedi le róla a fókuszt.
        const celPont = celElem(link.hash)
        if (celPont !== null) {
          fokuszCelra(celPont, nyilvantartas)
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
      const celPont = celElem(window.location.hash)
      if (celPont !== null) {
        fokuszCelra(celPont, nyilvantartas)
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
      // Az általunk kiosztott `tabindex`-ek nem maradhatnak a DOM-ban, ha a
      // `blur` már nem futna le (leszerelés fókuszban lévő céllal).
      for (const elem of nyilvantartas) {
        elem.removeAttribute('tabindex')
      }
      nyilvantartas.clear()
    }
  }, [])

  /**
   * LAPVÁLTÁS: a fókusz a hash céljára az ÚJ lapon.
   *
   * A kattintás-kezelő a lapon belüli ugrást fedi; lapváltásnál a cél a
   * kattintás pillanatában még nincs a DOM-ban, ezért az új útvonal
   * kirenderelése UTÁN kell fókuszálni. A Next.js a hash-célra
   * `scrollIntoView()`-t hív egy elrendezés-hatásban, a fókuszt szándékosan nem
   * mozdítja — ez a hatás fut utána, tehát a görgetés már megtörtént.
   *
   * A HIDEG BETÖLTÉS (első futás) KIMARAD. Ott natív horgony-navigáció történt,
   * és a böngésző a szabvány szerint már beállította a *sequential focus
   * navigation starting point*-ot a célra. Mérve is: hideg betöltés után az
   * első Tab a célon BELÜLI „időpontot kérek" gombra visz, tehát nincs mit
   * javítani. Fókuszálni viszont ott ÁRT: a lap még nem kapott felhasználói
   * eseményt, ezért a böngésző heurisztikája `:focus-visible`-nek minősíti a
   * programozott fókuszt, és 3 px-es gyűrűt rajzol a szekció köré (mérve:
   * `outline: solid 3px`), MINDEN látogatónak, az egeresnek is. Márpedig az örökölt
   * `/rendeloi-kezelesek` cím 308-cal pont ide, hideg betöltésre érkezik.
   */
  const elsoFutas = useRef(true)
  useEffect(() => {
    if (elsoFutas.current) {
      elsoFutas.current = false
      return
    }
    if (window.location.hash.length <= 1) {
      return
    }
    const celPont = celElem(window.location.hash)
    if (celPont !== null) {
      fokuszCelra(celPont, ideiglenesek.current)
    }
  }, [utvonal])

  return null
}
