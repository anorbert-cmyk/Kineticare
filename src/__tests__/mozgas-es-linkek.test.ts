import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Services } from '../components/blocks/Services'
import type { BlockServices } from '../payload-types'

/**
 * ŐR — a 2026-08-16-i felületi finomságok (tulajdonosi visszajelzés).
 *
 * Négy szabályt rögzít, mindegyiket olyat, amit egy későbbi szerkesztés
 * csendben elronthatna:
 *
 *  1. MOZGÁS-RÉTEG. A szekció-belépő és a nyitható szakaszok átmenete a közös
 *     styles/motion.css-ben él, a lap importlánca betölti, és mindkettő
 *     `prefers-reduced-motion: reduce` mögött van. A belépő kulcsképsora
 *     KÖZÖS a kurzusoldal staggered mintájával — két mozgás-nyelvet nem
 *     tartunk.
 *  2. PROGRESSZÍV RÁÉPÍTÉS. A rejtett kezdőállapotot kizárólag a kliens teszi
 *     ki, és csak a hajtás alatti szekciókra — JS nélkül tehát semmi nem tűnik
 *     el. A nyitható szakasz átmenete `@supports` mögött áll, tehát régebbi
 *     böngészőn a szakasz a natív, azonnali módon nyílik.
 *  3. NYÍL-LINKEK. Az aláhúzás a SZÖVEG alatt fut, a nyíl alatt nem. Ez
 *     szerkezeti kérdés: a `text-decoration` a dobozról a leszármazottakra
 *     rajzolódik, és gyermek-elemen NEM vonható vissza — ezért kell külön
 *     szöveg- és nyíl-span.
 *  4. BAL SZEGÉLYEK. A kurzusoldalon (és a folyószöveg idézetén) nincs többé
 *     dekoratív bal-border: az elválasztást háttér és térköz viszi.
 */

const REPO = fileURLToPath(new URL('..', import.meta.url))
const olvas = (relativUt: string): string => readFileSync(join(REPO, relativUt), 'utf8')

// ---------------------------------------------------------------------------
// 1–2. Mozgás-réteg
// ---------------------------------------------------------------------------

describe('mozgás-réteg (styles/motion.css)', () => {
  const motion = olvas('app/(frontend)/styles/motion.css')
  const styles = olvas('app/(frontend)/styles.css')
  const kurzusok = olvas('app/(frontend)/kurzusok/kurzusok.css')

  it('a lap importlánca betölti', () => {
    expect(styles).toContain("@import './styles/motion.css';")
  })

  it('EGYETLEN közös belépő kulcsképsor van, és a kurzusoldal is azt használja', () => {
    expect(motion).toContain('@keyframes kc-fade-up')
    expect(kurzusok).toContain('animation: kc-fade-up')
    // A korábbi, kurzus-scope-os másolat megszűnt.
    expect(kurzusok).not.toContain('@keyframes kc-course-fade-up')
  })

  it('a szekció-belépő `prefers-reduced-motion: reduce` esetén teljesen kikapcsol', () => {
    const csokkentett = motion.slice(motion.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(csokkentett).toContain('.kc-reveal,')
    expect(csokkentett).toContain('opacity: 1')
    expect(csokkentett).toContain('animation: none')
  })

  it('a nyitható szakasz átmenete @supports mögött áll (natív működés marad a tartalék)', () => {
    // A kommentekben szabad a technikáról beszélni; a SZABÁLYOK helye számít.
    const kod = motion.replace(/\/\*[\s\S]*?\*\//g, '')
    const tamogatasIndex = kod.indexOf('@supports')
    expect(tamogatasIndex).toBeGreaterThanOrEqual(0)
    expect(kod).toContain('interpolate-size: allow-keywords')
    expect(kod).toContain('selector(::details-content)')
    // A ::details-content MAGASSÁG-szabályai CSAK a @supports blokkon belül
    // állnak — különben nem támogató böngészőn összecsukva ragadna a tartalom.
    expect(kod.indexOf('block-size: 0')).toBeGreaterThan(tamogatasIndex)
    expect(kod.indexOf('block-size: auto')).toBeGreaterThan(tamogatasIndex)
    expect(kod).toContain('content-visibility var(--kc-motion-base) allow-discrete;')
  })

  it('a GYIK, az accordion, a kurzus-GYIK és a szakmai önéletrajz is megkapja', () => {
    for (const osztaly of [
      '.kc-faq__item::details-content',
      '.kc-accordion__item::details-content',
      '.kc-course-faq__item::details-content',
      '.kc-team__cv-section::details-content',
    ]) {
      expect(motion, `hiányzó nyitható szakasz: ${osztaly}`).toContain(osztaly)
    }
  })
})

describe('SectionReveal — progresszív ráépítés', () => {
  const forras = olvas('components/motion/SectionReveal.tsx')

  it('kliens-komponens, és semmit nem renderel a DOM-ba', () => {
    expect(forras).toContain("'use client'")
    expect(forras).toContain('return null')
  })

  it('csökkentett mozgásnál és IntersectionObserver nélkül azonnal kilép', () => {
    expect(forras).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches")
    expect(forras).toContain("typeof IntersectionObserver !== 'function'")
  })

  it('csak a HAJTÁS ALATTI szekciókat rejti el, és egyszer mutatja meg őket', () => {
    expect(forras).toContain('getBoundingClientRect().top > fold')
    expect(forras).toContain('observer.unobserve(entry.target)')
  })

  it('a kezdőlap mindkét ága (CMS-szekciósor és rögzített) beköti', () => {
    const home = olvas('components/content/HomeView.tsx')
    expect((home.match(/<SectionReveal \/>/g) ?? []).length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 3. Nyíl-linkek
// ---------------------------------------------------------------------------

function servicesMarkup(): string {
  const block = {
    id: 'sz1',
    blockType: 'services',
    title: 'Kezelések',
    rows: [
      {
        id: 'sor1',
        title: 'Kézterápia',
        body: 'Ínhüvelygyulladás, kéztőalagút.',
        url: '/kezelesek',
        felirat: 'Tovább a kezelésekre',
      },
    ],
    sectionSettings: {},
  }
  return renderToStaticMarkup(
    createElement(Services, { block: block as unknown as BlockServices }),
  )
}

describe('nyíl-linkek — az aláhúzás a szöveg alatt fut, a nyíl alatt nem', () => {
  it('a Services sor-hivatkozása külön szöveg- és nyíl-spant rendel', () => {
    const html = servicesMarkup()
    expect(html).toContain('kc-services__link-text')
    expect(html).toContain('kc-services__link-arrow')
    // A nyíl dekoratív: a linket a felirat nevezi meg.
    expect(html).toContain('aria-hidden="true" class="kc-services__link-arrow"')
  })

  it('a Services stíluslapján a link dísztelen, az aláhúzást a szöveg viszi', () => {
    const css = olvas('app/(frontend)/styles/blocks/services.css')
    const link = css.slice(css.indexOf('.kc-services__link {'))
    expect(link.slice(0, link.indexOf('}'))).toContain('text-decoration: none')
    const szoveg = css.slice(css.indexOf('.kc-services__link-text {'))
    expect(szoveg.slice(0, szoveg.indexOf('}'))).toContain('text-decoration: underline')
  })

  it('a közös .kc-text-link ugyanezt a szerkezetet követeli, és minden hívója viszi', () => {
    const content = olvas('app/(frontend)/styles/content.css')
    const link = content.slice(content.indexOf('.kc-text-link {'))
    expect(link.slice(0, link.indexOf('}'))).toContain('text-decoration: none')
    expect(content).toContain('.kc-text-link__label {')
    expect(content).toContain('.kc-text-link__arrow {')

    for (const komponens of [
      'components/content/home/CourseCards.tsx',
      'components/content/home/CredentialsStrip.tsx',
      'components/content/home/KnowledgeSection.tsx',
    ]) {
      const forras = olvas(komponens)
      expect(forras, `${komponens}: hiányzó szöveg-span`).toContain('kc-text-link__label')
      expect(forras, `${komponens}: hiányzó nyíl-span`).toContain('kc-text-link__arrow')
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Bal szegélyek
// ---------------------------------------------------------------------------

describe('dekoratív bal szegélyek — a kurzusoldalon nincsenek', () => {
  it('a kurzusoldal stíluslapja egyetlen border-left-et sem ír', () => {
    expect(olvas('app/(frontend)/kurzusok/kurzusok.css')).not.toMatch(/border-left\s*:/)
  })

  it('a garancia-sávot háttér választja el, nem vonal', () => {
    const css = olvas('app/(frontend)/kurzusok/kurzusok.css')
    const sav = css.slice(css.indexOf('.kc-course-guarantee {'))
    const torzs = sav.slice(0, sav.indexOf('}'))
    expect(torzs).toContain('background-color: var(--kc-color-surface-tint)')
    expect(torzs).not.toMatch(/\bborder(-(top|right|bottom|left|inline|block))?\s*:/)
  })

  it('a folyószöveg idézete is háttérrel különül el', () => {
    const content = olvas('app/(frontend)/styles/content.css')
    const idezet = content.slice(content.indexOf('.kc-richtext blockquote {'))
    expect(idezet.slice(0, idezet.indexOf('}'))).not.toContain('border-left')
  })
})
