import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FilmHero } from '@/components/blocks/FilmHero'
import type { BlockFilmHero } from '@/payload-types'

/**
 * ŐR — a filmsáv 2. és 3. „állása" CÍM + LEÍRÁS párban áll.
 *
 * A tulajdonos 2026-08-17-i kifogása szó szerint: a két görgetés-álláson „nem
 * csak valami titulus és alatta semmi, mert az üres" — kell alá leírás, mint
 * az 1. állás szekciójában. Ez a teszt azt akadályozza meg, hogy a leírás egy
 * későbbi szerkesztéssel némán kiürüljön: a szöveg KÓDBAN él (nem CMS-mező),
 * tehát nincs szerkesztői visszajelzés, ami az eltűnését jelezné.
 *
 * Amit még véd:
 *  - a leírás UGYANABBAN a `[data-scroll-scrub-caption]` burkolóban van, mint
 *    a cím. A görgetés-vezérelt áttűnés és az `aria-hidden` a burkolóra megy
 *    (scroll-scrub.tsx), tehát külön dobozban a leírás a címtől függetlenül
 *    jelenne meg, vagy képernyőolvasóval kiszakadva maradna a fában;
 *  - a felirat címe NEM címsor-elem. A vászon a DOM-ban megelőzi a jelenet
 *    H1-ét, így egy h2 a lap első címsora lenne — fordított dokumentum-vázlat;
 *  - a mikroszöveg-szabályok (docs/ui-sztenderdek.md §3.1): nincs töltelék
 *    gondolatjel és nincs felkiáltójel a vevői szövegben.
 */

const BLOKK: BlockFilmHero = {
  blockType: 'filmHero',
  ctas: [{ felirat: 'Nézd meg a kurzusokat', id: 'c1', ujAblakban: false, url: '/kurzusok' }],
  lead: 'Teszt-bevezető.',
  tags: [{ id: 't1', label: 'Kéz' }],
  title: 'Teszt-cím',
}

/** A `[data-scroll-scrub-caption]` burkolók nyers HTML-je, sorrendben. */
function feliratBlokkok(markup: string): string[] {
  return [...markup.matchAll(/<div class="scroll-scrub__caption[^"]*"[^>]*>(.*?)<\/div>/gs)].map(
    (talalat) => talalat[1],
  )
}

/** Egy adott osztályú bekezdés szövege a burkolón belül. */
function bekezdes(blokk: string, osztaly: string): string | null {
  const talalat = blokk.match(new RegExp(`<p class="${osztaly}">(.*?)</p>`, 's'))
  return talalat === null ? null : talalat[1]
}

const markup = renderToStaticMarkup(<FilmHero block={BLOKK} />)
const blokkok = feliratBlokkok(markup)

describe('filmsáv-feliratok', () => {
  it('mindkét állás megjelenik', () => {
    expect(blokkok).toHaveLength(2)
    expect(markup).toContain('scroll-scrub__caption--right')
    expect(markup).toContain('scroll-scrub__caption--center')
  })

  it('minden álláson van cím ÉS alatta leírás, ugyanabban a burkolóban', () => {
    for (const blokk of blokkok) {
      const cim = bekezdes(blokk, 'scroll-scrub__caption-title')
      const leiras = bekezdes(blokk, 'scroll-scrub__caption-body')
      expect(cim, 'a felirat címe hiányzik').toBeTruthy()
      expect(leiras, 'a felirat leírása hiányzik — a tulajdonos ezt kérte').toBeTruthy()
      expect((cim ?? '').trim().length).toBeGreaterThan(0)
      // Két rövid mondatnál hosszabb leírást a néző görgetés közben nem olvas el.
      expect((leiras ?? '').trim().length).toBeGreaterThan(20)
      expect((leiras ?? '').trim().length).toBeLessThanOrEqual(160)
      // A leírás a cím UTÁN áll a burkolón belül.
      expect(blokk.indexOf('scroll-scrub__caption-body')).toBeGreaterThan(
        blokk.indexOf('scroll-scrub__caption-title'),
      )
    }
  })

  it('a felirat címe nem címsor-elem (a H1 a DOM-ban KÉSŐBB jön)', () => {
    for (const blokk of blokkok) {
      expect(blokk).not.toMatch(/<h[1-6][\s>]/)
    }
  })

  it('a feliratok szövege betartja a magyar mikroszöveg-szabályokat', () => {
    for (const blokk of blokkok) {
      const szoveg = blokk.replace(/<[^>]*>/g, ' ')
      expect(szoveg, 'töltelék gondolatjel nem lehet vevői szövegben').not.toMatch(/[–—]/)
      expect(szoveg, 'felkiáltójel nem lehet vevői szövegben').not.toContain('!')
    }
  })
})
