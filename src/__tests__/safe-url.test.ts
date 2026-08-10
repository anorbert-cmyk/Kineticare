import { describe, expect, it } from 'vitest'

import { sanitizeCmsUrl } from '../lib/safe-url'

/**
 * A CMS-ből érkező href-ek allowlist-szűrése (src/lib/safe-url.ts).
 *
 * A szerkesztő szabadon gépelheti a webcímeket, ezért a rendereltethető
 * sémákat itt kell lezárni: `https:`/`http:`/`mailto:` abszolút cím,
 * gyökér-relatív útvonal és lapon belüli horgony mehet href-be, más semmi.
 */
describe('sanitizeCmsUrl — engedélyezett alakok', () => {
  it('https és http abszolút URL', () => {
    expect(sanitizeCmsUrl('https://kineticare.hu/kapcsolat')).toBe('https://kineticare.hu/kapcsolat')
    expect(sanitizeCmsUrl('http://localhost:3000/admin')).toBe('http://localhost:3000/admin')
  })

  it('mailto cím', () => {
    expect(sanitizeCmsUrl('mailto:info@kineticare.hu')).toBe('mailto:info@kineticare.hu')
  })

  it('gyökér-relatív útvonal (a széleken lévő whitespace lekerül)', () => {
    expect(sanitizeCmsUrl('/kurzusok/12')).toBe('/kurzusok/12')
    expect(sanitizeCmsUrl('  /kapcsolat ')).toBe('/kapcsolat')
    // A rendszer-generált, query-s útvonalak is átmennek (pénztár-CTA).
    expect(sanitizeCmsUrl('/penztar?termek=7')).toBe('/penztar?termek=7')
  })

  it('lapon belüli horgony (a hero/CTA navigáció nyelve)', () => {
    expect(sanitizeCmsUrl('#ingyenes')).toBe('#ingyenes')
  })
})

/**
 * Az ABSZOLÚT ág NORMALIZÁLT alakot ad vissza, nem a nyerset.
 *
 * Ez nem kozmetika: minden hívó a `/^https?:\/\//i` mintával dönti el, hogy a
 * cím KÜLSŐ-e (Button.tsx:79, LexicalContent.tsx:99, Services.tsx:83,
 * PressLogos.tsx:77, serialize.tsx:205 és :232, menu-tree.ts:116). Ettől függ,
 * hogy `<a>` lesz-e belőle `next/link` helyett, és hogy megkapja-e az „új ablak
 * + rel=noopener noreferrer" ágat. A `https:evil.example` alak az
 * URL-értelmező szerint IDEGEN hosztra mutató abszolút cím, a mintára viszont
 * nem illeszkedik — nyersen visszaadva BELSŐ linkként renderelődne.
 */
describe('sanitizeCmsUrl — az abszolút ág normalizált alakot ad vissza', () => {
  /** A hívók külső-jelölő mintája — a teszt ezt méri, nem csak a szöveget. */
  const isExternalPattern = /^https?:\/\//i

  it.each([
    ['egy perjeles, hoszt nélküli séma', 'https:evil.example', 'https://evil.example/'],
    ['backslash a séma után', 'http:\\\\evil.example', 'http://evil.example/'],
    ['csupasz hoszt (a gyökér-perjel bekerül)', 'https://pelda.hu', 'https://pelda.hu/'],
    ['nagybetűs hoszt (kisbetűsre normalizálva)', 'https://PELDA.hu/Cikk', 'https://pelda.hu/Cikk'],
  ])('%s → %s', (_label, input, expected) => {
    const result = sanitizeCmsUrl(input)

    expect(result).toBe(expected)
    // A LÉNYEG: a visszaadott alak a hívók külső-mintájára ILLESZKEDIK, tehát
    // `<a target="_blank" rel="noopener noreferrer">` ágra kerül, nem next/link-re.
    expect(isExternalPattern.test(result ?? '')).toBe(true)
  })

  it('a nyers alak NEM illeszkedne a hívók külső-mintájára (ez a hiba, amit javít)', () => {
    expect(isExternalPattern.test('https:evil.example')).toBe(false)
    expect(isExternalPattern.test('http:\\\\evil.example')).toBe(false)
  })

  it('a mailto és a relatív alakok NEM normalizálódnak abszolúttá', () => {
    // A mailto-nak nincs hoszt-része; a parser nem tesz hozzá perjelet.
    expect(sanitizeCmsUrl('mailto:info@kineticare.hu')).toBe('mailto:info@kineticare.hu')
    // A relatív ág nyers marad — a next/link pontosan így várja.
    expect(sanitizeCmsUrl('/kurzusok')).toBe('/kurzusok')
    expect(sanitizeCmsUrl('#ingyenes')).toBe('#ingyenes')
  })
})

describe('sanitizeCmsUrl — tiltott és hibás bemenetek', () => {
  it.each([
    ['javascript séma', 'javascript:alert(1)'],
    ['javascript séma nagybetűsen', 'JaVaScRiPt:alert(1)'],
    ['javascript séma szóközzel', '  javascript:alert(1)  '],
    ['data URI', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript séma', 'vbscript:msgbox(1)'],
    ['file séma', 'file:///etc/passwd'],
    ['protokoll-relatív cím', '//evil.example/phish'],
    ['backslash-trükk a gyökér-relatív ágon', '/\\evil.example'],
    ['séma nélküli relatív útvonal', 'kurzusok/12'],
    ['hoszt nélküli https', 'https://'],
    ['címzett nélküli mailto', 'mailto:'],
    ['csupasz horgony (üres cél)', '#'],
    ['üres string', ''],
    ['csak whitespace', '   '],
  ])('%s → null', (_label, value) => {
    expect(sanitizeCmsUrl(value)).toBeNull()
  })

  /**
   * A böngésző URL-értelmezője a tabot és a soremelést a cím BELSEJÉBŐL is
   * kidobja, mielőtt értelmezné. A `/<TAB>/evil.example` ezért a böngészőben
   * protokoll-relatív, IDEGEN eredetű cím lesz — miközben a puszta
   * `startsWith('//')` vizsgálat szerint ártalmatlan gyökér-relatív útvonal.
   * Ez a csoport azt rögzíti, hogy a vezérlőkarakteres bemenet nem jut el a
   * renderelésig.
   */
  it.each([
    ['tabbal álcázott protokoll-relatív cím', '/\t/evil.example'],
    ['tabbal álcázott javascript séma', 'java\tscript:alert(1)'],
    ['soremeléssel álcázott javascript séma', 'java\nscript:alert(1)'],
    ['soremelés a gyökér-relatív útvonalban', '/kapcsolat\njavascript:alert(1)'],
    ['NUL karakter az útvonalban', 'https://kineticare.hu/\u0000'],
    ['DEL karakter a horgonyban', '#ingyenes\u007F'],
  ])('vezérlőkarakteres trükk (%s) → null', (_label, value) => {
    expect(sanitizeCmsUrl(value)).toBeNull()
  })

  it('nem szöveg bemenetre null (a Lexical-mezők típus nélkül érkeznek)', () => {
    expect(sanitizeCmsUrl(null)).toBeNull()
    expect(sanitizeCmsUrl(undefined)).toBeNull()
    expect(sanitizeCmsUrl(42)).toBeNull()
    expect(sanitizeCmsUrl({ url: 'https://kineticare.hu' })).toBeNull()
    expect(sanitizeCmsUrl(['https://kineticare.hu'])).toBeNull()
  })

  /**
   * Unicode-trükk: a teljes szélességű solidus (U+FF0F) nem perjel az
   * URL-értelmezőnek, ezért a `／／evil.example` nem protokoll-relatív cím,
   * hanem séma nélküli, értelmezhetetlen szöveg — a szűrő elutasítja.
   */
  it('teljes szélességű solidus nem számít perjelnek → null', () => {
    expect(sanitizeCmsUrl('／／evil.example')).toBeNull()
  })
})
