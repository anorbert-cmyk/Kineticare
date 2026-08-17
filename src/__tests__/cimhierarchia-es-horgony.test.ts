import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { hosszuUgras } from '../components/motion/AnchorScroll'

/**
 * ŐR — a 2026-08-17-i tulajdonosi észrevételek. Mindhárom szabályt MÉRÉS
 * hozta, és mindhármat elronthatná egy későbbi, jó szándékú szerkesztés.
 *
 * ═══ 1. „UGYANAKKORA-E A KÉT SZEKCIÓCÍM?" ═══
 * Az „Így tudunk segíteni" (`.kc-services__title`) és az „Így működik az
 * online kurzus" (`.kc-section-title`) betűmérete MÁR AZELŐTT is azonos volt
 * (mérve: 46,4 px @1440, 32,55 px @390 — mindkettő a közös L lépcsőn). Amitől
 * mégis másnak látszottak, az a SORTÁV (1,06 vs 1,2) és a MÉRTÉK (7,2ch vs
 * korlátozatlan) volt. Az őr ezért nem csak a méretet, a sortávot is rögzíti:
 * két azonos szintű címsor ugyanazon a lapon nem futhat kétféle sortávval.
 *
 * ═══ 2. „A SOR-CÍMEK LEGYENEK OLVASHATÓBBAK" ═══
 * A szolgáltatás-sor címe (`Rendelői kezelések`) és a sor szövege AZONOS
 * méretű és AZONOS súlyú volt (18 px / 400), ráadásul a cím a vékonyabb
 * vonalú Tenor Sans-t vitte — a címsor halványabbnak látszott, mint a
 * bekezdés alatta. Mivel a méret nem mozdulhat (három-méretes skála), a
 * szintet a SÚLY hordozza. A 700-as súlyhoz a TÖRZS-betű kell: a Tenor
 * Sans-nak csak 400-as metszete van (styles/fonts.css), a 700 kérése ott
 * szintetikus félkövért adna.
 *
 * ═══ 3. „FURÁN ANIMÁLÓDIK AZ OLDAL A HORGONYRA UGRÁSKOR" ═══
 * A globális `scroll-behavior: smooth` minden horgony-ugrást végiganimál:
 * `/szolgaltatasok#rendeloi` 2048 px @1440×900 (2,3 nézetablak), 3138 px
 * @390×844 (3,7 nézetablak), 661–790 ms hosszan. Az egy nézetablaknál
 * hosszabb ugrás innentől AZONNALI (AnchorScroll + `.kc-scroll-instant`),
 * a rövid pedig továbbra is sima — a küszöb mérésből jön (lásd a komponens
 * és a motion.css fejlécét).
 */

const REPO = fileURLToPath(new URL('..', import.meta.url))
const olvas = (relativUt: string): string => readFileSync(join(REPO, relativUt), 'utf8')

/** Kommentek nélküli forrás — a dokumentációban álló példa nem szabály. */
const kommentNelkul = (forras: string): string => forras.replace(/\/\*[\s\S]*?\*\//g, '')

/** Egy szelektor ÖSSZES szabálytörzse (a töréspont-változatok is). */
function szabalyTorzsek(css: string, szelektor: string): string[] {
  const tiszta = kommentNelkul(css)
  const torzsek: string[] = []
  let honnan = 0
  for (;;) {
    const kezdet = tiszta.indexOf(`${szelektor} {`, honnan)
    if (kezdet < 0) break
    const vege = tiszta.indexOf('}', kezdet)
    torzsek.push(tiszta.slice(kezdet, vege))
    honnan = vege
  }
  if (torzsek.length === 0) {
    throw new Error(`Nincs ilyen szabály a stíluslapon: ${szelektor}`)
  }
  return torzsek
}

const szabalyTorzs = (css: string, szelektor: string): string => szabalyTorzsek(css, szelektor)[0]

/** Egy deklaráció értéke a szabálytörzsből (pl. `font-size` → `var(--kc-font-l)`). */
function ertek(torzs: string, tulajdonsag: string): string {
  const talalat = new RegExp(`(?:^|[^-\\w])${tulajdonsag}:\\s*([^;]+);`).exec(torzs)
  if (talalat === null) {
    throw new Error(`A szabálytörzsben nincs ${tulajdonsag} deklaráció:\n${torzs}`)
  }
  return talalat[1].trim()
}

const servicesCss = olvas('app/(frontend)/styles/blocks/services.css')
const howCss = olvas('app/(frontend)/styles/blocks/how-it-works.css')
const contentCss = olvas('app/(frontend)/styles/content.css')
const motionCss = olvas('app/(frontend)/styles/motion.css')
const baseCss = olvas('app/(frontend)/styles/base.css')
const fontsCss = olvas('app/(frontend)/styles/fonts.css')
const layoutTsx = olvas('app/(frontend)/layout.tsx')
const anchorTsx = olvas('components/motion/AnchorScroll.tsx')

describe('1. a két kezdőlapi szekciócím EGY lépcsőn és EGY sortávon áll', () => {
  const servicesCim = szabalyTorzs(servicesCss, '.kc-services__title')
  const kozosCim = szabalyTorzs(contentCss, '.kc-section-title')

  it('mindkettő a közös L betűméret-lépcsőt viseli', () => {
    expect(ertek(servicesCim, 'font-size')).toBe('var(--kc-font-l)')
    expect(ertek(kozosCim, 'font-size')).toBe('var(--kc-font-l)')
    expect(ertek(servicesCim, 'font-size')).toBe(ertek(kozosCim, 'font-size'))
  })

  it('mindkettő a közös címsor-SORTÁVOT viseli (ez volt a látszólagos méretkülönbség)', () => {
    expect(ertek(servicesCim, 'line-height')).toBe('var(--kc-leading-heading)')
    expect(ertek(kozosCim, 'line-height')).toBe('var(--kc-leading-heading)')
  })

  it('a tábla-sortáv (1,06) nem jön vissza egyik szekciócímre sem', () => {
    expect(servicesCim).not.toContain('--kc-leading-board')
    expect(kozosCim).not.toContain('--kc-leading-board')
  })

  it('mindkettő ugyanazt a súlyt és címsor-betűt viszi', () => {
    expect(ertek(servicesCim, 'font-weight')).toBe('var(--kc-font-weight-normal)')
    expect(ertek(kozosCim, 'font-weight')).toBe('var(--kc-font-weight-normal)')
    expect(ertek(servicesCim, 'font-family')).toBe('var(--kc-font-heading)')
    expect(ertek(kozosCim, 'font-family')).toBe('var(--kc-font-heading)')
  })

  it('a rövid cím mértéke tágabb a régi, három sorra törő 7,2ch-nál', () => {
    const mertek = ertek(servicesCim, 'max-width')
    expect(mertek).toMatch(/^\d+(\.\d+)?ch$/)
    expect(Number.parseFloat(mertek)).toBeGreaterThan(7.2)
  })

  it('a hosszú CMS-cím fokozata BŐVEBB az alapnál (a fokozat nem üresedett ki)', () => {
    const alap = Number.parseFloat(ertek(servicesCim, 'max-width'))
    const hosszu = Number.parseFloat(ertek(szabalyTorzs(servicesCss, '.kc-services__title--long'), 'max-width'))
    expect(hosszu).toBeGreaterThan(alap)
  })
})

describe('2. a számozott sorok címét a SÚLY emeli ki, nem a méret', () => {
  const parok = [
    ['services.css', servicesCss, '.kc-services__row-title', '.kc-services__text'],
    ['how-it-works.css', howCss, '.kc-how__step-title', '.kc-how__text'],
  ] as const

  it.each(parok)('%s — a sor-cím 700-as, a sor-szövege 400-as súlyú', (_nev, css, cimSzelektor, szovegSzelektor) => {
    const cim = szabalyTorzs(css, cimSzelektor)
    expect(ertek(cim, 'font-weight')).toBe('var(--kc-font-weight-bold)')
    // A szöveg-szabály súlyt nem deklarál: a body 400-as alapértékét viszi.
    expect(szabalyTorzs(css, szovegSzelektor)).not.toContain('font-weight')
  })

  it.each(parok)('%s — cím és szöveg AZONOS méreten áll (a szintet nem a méret adja)', (_nev, css, cimSzelektor, szovegSzelektor) => {
    expect(ertek(szabalyTorzs(css, cimSzelektor), 'font-size')).toBe('var(--kc-font-m)')
    expect(ertek(szabalyTorzs(css, szovegSzelektor), 'font-size')).toBe('var(--kc-font-m)')
  })

  it.each(parok)('%s — a sor-cím a TÖRZS-betűt viszi (a címsor-betűnek nincs 700-as metszete)', (_nev, css, cimSzelektor) => {
    expect(ertek(szabalyTorzs(css, cimSzelektor), 'font-family')).toBe('var(--kc-font-body)')
  })

  it.each(parok)('%s — a sor-cím a közös címsor-sortávot viszi (nincs elemre írt szám)', (_nev, css, cimSzelektor) => {
    expect(ertek(szabalyTorzs(css, cimSzelektor), 'line-height')).toBe('var(--kc-leading-heading)')
  })

  it('a Tenor Sans-nak tényleg CSAK 400-as metszete van (a szintetikus félkövér tilalmának alapja)', () => {
    const tenorSulyok = [...kommentNelkul(fontsCss).matchAll(/font-family:\s*'Tenor Sans';[\s\S]*?font-weight:\s*([^;]+);/g)].map(
      (talalat) => talalat[1].trim(),
    )
    expect(tenorSulyok.length).toBeGreaterThan(0)
    expect(new Set(tenorSulyok)).toEqual(new Set(['400']))
  })

  it('a Nunito Sans variábilis metszete lefedi a 700-at (a súly VALÓDI, nem szintetikus)', () => {
    expect(kommentNelkul(fontsCss)).toMatch(/font-family:\s*'Nunito Sans';[\s\S]*?font-weight:\s*400 700;/)
  })

  it('egyetlen szabály sem kér 700-as súlyt a CÍMSOR-betűre (az szintetikus félkövér lenne)', () => {
    for (const [nev, css] of [
      ['services.css', servicesCss],
      ['how-it-works.css', howCss],
    ] as const) {
      const tiszta = kommentNelkul(css)
      for (const torzs of tiszta.split('}')) {
        if (!torzs.includes('var(--kc-font-heading)')) continue
        expect(torzs, `${nev}: címsor-betű félkövér súllyal`).not.toContain('--kc-font-weight-bold')
      }
    }
  })
})

describe('3. a hosszú horgony-ugrás nem animálódik', () => {
  it('egy nézetablaknál rövidebb ugrás MARAD sima', () => {
    expect(hosszuUgras(0, 900)).toBe(false)
    expect(hosszuUgras(450, 900)).toBe(false)
    expect(hosszuUgras(899, 900)).toBe(false)
    // Pontosan egy nézetablak: a mért Chromium-görbén 483 ms — a NN/g 500 ms-os
    // küszöbe ALATT, tehát még animálható.
    expect(hosszuUgras(900, 900)).toBe(false)
  })

  it('egy nézetablaknál hosszabb ugrás AZONNALI', () => {
    expect(hosszuUgras(901, 900)).toBe(true)
    // A tulajdonos által jelzett eset: /szolgaltatasok#rendeloi.
    expect(hosszuUgras(2048, 900)).toBe(true)
    expect(hosszuUgras(3138, 844)).toBe(true)
  })

  it('a felfelé tartó ugrás ugyanúgy számít (a menüpontra visszakattintás)', () => {
    expect(hosszuUgras(-2048, 900)).toBe(true)
    expect(hosszuUgras(-450, 900)).toBe(false)
  })

  it('nulla vagy értelmetlen nézetablak-magasságnál nem avatkozik be', () => {
    expect(hosszuUgras(5000, 0)).toBe(false)
    expect(hosszuUgras(5000, -100)).toBe(false)
  })

  it('a motion.css adja az azonnali görgetés osztályát', () => {
    expect(szabalyTorzs(motionCss, '.kc-scroll-instant')).toContain('scroll-behavior: auto')
  })

  it('a RÖVID ugrás sima marad: a globális smooth görgetés megmarad', () => {
    expect(kommentNelkul(baseCss)).toContain('scroll-behavior: smooth')
  })

  it('a komponens csökkentett mozgás mellett azonnal kilép', () => {
    expect(anchorTsx).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(anchorTsx).toMatch(/\.matches\)\s*\{\s*\n\s*return/)
  })

  it('a horgony NÉLKÜLI belső hivatkozás (lap tetejére görgetés) is fedve van', () => {
    // Mérve: a menüpontra visszakattintva a lap 2055 px-t görgetett VISSZA,
    // ugyanazzal a ~690 ms-os elhúzással. A távolság ilyenkor a jelenlegi
    // görgetés-pozíció, mert az útválasztó a lap tetejére visz.
    const tiszta = kommentNelkul(anchorTsx)
    expect(tiszta).toContain('hosszuUgras(window.scrollY, window.innerHeight)')
  })

  it('a MÁSIK oldalra mutató horgony mindig azonnali (a cél még nem mérhető)', () => {
    const tiszta = kommentNelkul(anchorTsx)
    expect(tiszta).toMatch(/if \(link\.hash\.length > 0\) \{\s*\n\s*azonnal\(\)/)
  })

  it('a külső hivatkozás kimarad (ott nincs mit görgetni)', () => {
    expect(kommentNelkul(anchorTsx)).toContain('link.host !== window.location.host')
  })

  it('a komponens NEM nyeli el a kattintást (az útválasztó és a fókusz érintetlen)', () => {
    const tiszta = kommentNelkul(anchorTsx)
    expect(tiszta).not.toContain('preventDefault()')
    expect(tiszta).not.toContain('scrollIntoView')
    expect(tiszta).not.toContain('window.scrollTo')
  })

  it('a kattintást ELFOGÁSI szakaszban figyeli (a görgetés indulása előtt kell átállni)', () => {
    expect(kommentNelkul(anchorTsx)).toContain("document.addEventListener('click', onClick, true)")
  })

  it('a storefront-elrendezés fel is csatolja', () => {
    expect(layoutTsx).toContain("from '@/components/motion/AnchorScroll'")
    expect(layoutTsx).toContain('<AnchorScroll />')
  })
})
