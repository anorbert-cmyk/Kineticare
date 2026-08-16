import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RichText } from '../components/lexical/RichText'
import { hasLexicalContent } from '../components/lexical/serialize'
import { JOGI_OLDALAK, jogiForrasSzoveg, jogiOldalTartalom } from '../lib/legal-content'

/**
 * A jogi oldalak RENDERELÉSE — a `/[slug]` route rich-text ága
 * (src/app/(frontend)/[slug]/page.tsx) ugyanezt a `RichText` komponenst
 * használja, ha az oldalnak nincs szekciósora.
 *
 * Amit ez a réteg őriz: a generált Lexical tartalom TÉNYLEG megjelenik (a
 * serializer minden csomópont-típusát ismeri), a szöveg nem vész el, és a
 * címsorok h2/h3-ként — nem h1-ként — kerülnek ki, hogy a lap egyetlen h1-e a
 * `kc-page-hero__title` maradjon.
 *
 * Hálózati hívás nincs: a tartalom a repóban élő forrásfájlokból jön.
 */

/**
 * HTML → látható szöveg: címkék levágása és az entitások visszafejtése.
 *
 * Az entitás-visszafejtés azért kell, mert a React helyesen menekíti a jogi
 * szövegben előforduló idézőjeleket (`"bannerben"` → `&quot;bannerben&quot;`) —
 * ez megjelenítés, nem szövegváltozás.
 */
const szoveg = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

describe('jogi oldalak renderelése (a [slug] route rich-text ága)', () => {
  it.each(JOGI_OLDALAK.map((oldal) => [oldal.slug, oldal] as const))(
    '/%s: minden bekezdés megjelenik, és nincs benne h1',
    (_slug, oldal) => {
      const tartalom = jogiOldalTartalom(oldal)
      expect(hasLexicalContent(tartalom)).toBe(true)

      const html = renderToStaticMarkup(createElement(RichText, { content: tartalom }))
      expect(html).not.toContain('<h1')
      expect(html).toContain('<p')

      // A forrás MINDEN sora (ép, jelölő nélküli szövegként) megjelenik a
      // renderelt lapon. A leghosszabb sorokat nézzük végig: ha a serializer
      // bármelyik csomópontot elnyelné, itt bukik.
      const lathato = szoveg(html)
      const sorok = jogiForrasSzoveg(oldal)
        .split('\n')
        .map((sor) => sor.replace(/^(## |# |- )/, '').trim())
        .filter((sor) => sor.length > 40)
      expect(sorok.length).toBeGreaterThan(5)
      for (const sor of sorok) {
        expect(lathato).toContain(sor)
      }
    },
  )

  it('az ÁSZF szakaszcímei h2-ként jelennek meg', () => {
    const html = renderToStaticMarkup(
      createElement(RichText, { content: jogiOldalTartalom(JOGI_OLDALAK[0]) }),
    )
    expect(html).toContain('<h2')
    expect(html).toContain('Felelősségkorlátozás')
  })

  it('az adatkezelési tájékoztató alcímei h3-ak, felsorolásai listák', () => {
    const html = renderToStaticMarkup(
      createElement(RichText, { content: jogiOldalTartalom(JOGI_OLDALAK[1]) }),
    )
    expect(html).toContain('<h3')
    expect(html).toContain('<ul')
    expect(html).toContain('<li')
  })
})
