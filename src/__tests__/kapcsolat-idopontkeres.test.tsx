import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RenderBlocks } from '../components/blocks/RenderBlocks'
import {
  buildKapcsolatLayout,
  buildSzolgaltatasokLayout,
  IDOPONTKERES_HORGONY,
  IDOPONTKERES_URL,
} from '../scripts/restore-legacy-content'
import type { Page } from '../payload-types'

/**
 * A /kapcsolat lap IDŐPONTKÉRŐ szekciójának alapállapota (a legacy-visszaépítő
 * script tölti fel egyszer, utána minden szöveg az adminé).
 *
 * ═══ MIT ŐRIZ ═══
 *  1. Az alap-szekciósor a VALÓS rendelői adatokat viszi (két budapesti cím,
 *     a két gyógytornász telefonszáma, az e-mail-cím). A blokkosítás nem
 *     veszíthet el kapcsolatfelvételi utat: aki nem tölt ki űrlapot, annak a
 *     telefonszám a második, teljes értékű csatorna.
 *  2. A szekció HORGONYT kap, és a /szolgaltatasok „Időpontot kérek"
 *     hivatkozása pontosan erre a horgonyra mutat. Enélkül a látogató a
 *     kapcsolat-lap tetejére érkezne, és neki kellene megtalálnia a szekciót.
 *  3. A magyarázó szöveg KIMONDJA, hogy ez nem foglalás. Naptár-integráció
 *     nincs a rendszerben, tehát foglalást ígérni hazugság lenne.
 *  4. A sávok között NINCS hétvégi lehetőség: a repóban semmi nem igazolja,
 *     hogy hétvégén van rendelés, egy nem tartható sáv felkínálása pedig
 *     ígéret. (Ha van, az adminban egy sorral pótolható.)
 *
 * HÁLÓZAT: a globális fetch hangosan dobó mock (CLAUDE.md 15. tanulság).
 */

vi.stubGlobal('fetch', () => {
  throw new Error('A tesztből SOSEM mehet ki valódi hálózati hívás.')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type Layout = NonNullable<Page['layout']>

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

/** A szekciósor renderelése úgy, ahogy a /kapcsolat route teszi. */
function renderKapcsolatLayout(): string {
  return render(
    createElement(RenderBlocks, {
      layout: buildKapcsolatLayout() as unknown as Layout,
      products: [],
      posts: [],
      testimonials: [],
      appointment: { formId: '42', turnstileSiteKey: null },
    }),
  )
}

describe('/kapcsolat alap-szekciósor', () => {
  it('pontosan egy szekcióból áll: az időpontkérőből', () => {
    const layout = buildKapcsolatLayout()
    expect(layout).toHaveLength(1)
    expect(layout[0].blockType).toBe('appointment')
  })

  it('a rendelő MINDEN elérhetősége megjelenik a renderelt kimeneten', () => {
    const html = renderKapcsolatLayout()
    expect(html).toContain('1117 Budapest, Nádorliget u. 7/b')
    expect(html).toContain('1114 Budapest, Fadrusz utca 15.')
    expect(html).toContain('+36 30 169 2263')
    expect(html).toContain('+36 20 357 3493')
    expect(html).toContain('info@kineticare.hu')
    // A telefonszámok kattinthatók (mobilon ez a leggyorsabb út).
    expect(html).toContain('href="tel:+36301692263"')
    expect(html).toContain('href="tel:+36203573493"')
  })

  it('a szekció horgonyt kap, és a szolgáltatás-oldal CTA-ja arra mutat', () => {
    expect(IDOPONTKERES_URL).toBe(`/kapcsolat#${IDOPONTKERES_HORGONY}`)
    expect(renderKapcsolatLayout()).toContain(`id="${IDOPONTKERES_HORGONY}"`)

    // A /szolgaltatasok szekciósorában az „Időpontot kérek" sor-hivatkozás.
    const szolgaltatasok = JSON.stringify(buildSzolgaltatasokLayout())
    expect(szolgaltatasok).toContain(IDOPONTKERES_URL)
  })

  it('a magyarázat kimondja, hogy NEM foglalás, és megmondja a visszahívás idejét', () => {
    const html = renderKapcsolatLayout()
    expect(html).toContain('nem foglalás')
    expect(html).toContain('két munkanapon belül')
  })

  it('a felkínált időpont-sávok között nincs olyan, amit nem tudunk tartani', () => {
    const html = renderKapcsolatLayout()
    expect(html).toContain('Hétköznap délelőtt')
    expect(html).toContain('Hétköznap délután')
    expect(html).toContain('Rugalmas vagyok')
    // Hétvégi rendelést a repó semmilyen forrása nem igazol.
    expect(html.toLowerCase()).not.toContain('hétvég')
  })

  it('az űrlap ott van, és a hozzájárulás az adatvédelmi tájékoztatóra linkel', () => {
    const html = renderKapcsolatLayout()
    expect(html).toContain('kc-appointment__form')
    expect(html).toContain('href="/adatvedelem"')
  })
})
