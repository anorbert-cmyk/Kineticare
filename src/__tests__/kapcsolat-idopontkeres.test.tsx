import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RenderBlocks } from '../components/blocks/RenderBlocks'
import {
  buildKapcsolatLayout,
  buildRolunkLayout,
  buildSzolgaltatasokLayout,
  IDOPONTKERES_HORGONY,
  IDOPONTKERES_URL,
  SZAKMAI_HATTER_URL,
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
 *  5. A lap SZAKEMBER-ELÉRHETŐSÉGET is visz (tulajdonosi kérés, 2026-08-16:
 *     „lányok elérhetősége kell a kapcsolat menüpontba is"), az időpontkérő
 *     UTÁN, kapcsolat-fókuszú felvezetővel, önmagára mutató link nélkül.
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
  it('két szekcióból áll: az időpontkérőből, utána a szakember-elérhetőségből', () => {
    const layout = buildKapcsolatLayout()
    expect(layout.map((blokk) => blokk.blockType)).toEqual(['appointment', 'teamMembers'])
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

  it('a magyarázat a TELEFONOS utat írja le, és nem ígér foglalást', () => {
    /**
     * SZERZŐDÉS-VÁLTÁS (tulajdonosi döntés, 2026-08-17): az időpontot telefonon
     * egyeztetik, nem üzenetben. A korábbi állítás („nem foglalás" + „két
     * munkanapon belül") az ŰRLAP folyamatát írta le — űrlap nélkül mindkettő
     * hamis lenne, ezért a magyarázat a hívásra mutat. Ami NEM változott: a
     * szekció továbbra sem ígér naptár-foglalást.
     */
    const html = renderKapcsolatLayout()
    expect(html).toContain('Hívd az alábbi számok egyikét')
    expect(html).toContain('50 perces vizsgálattal')
    expect(html).not.toContain('két munkanapon belül')
    // Naptár-foglalás nincs a rendszerben, tehát ígérni sem szabad. A szótő
    // önmagában nem használható: a szakember-kártyák „ki mivel FOGLALkozik"
    // mondata is illeszkedne rá (mérve) — a tiltás a foglalás FŐNÉVRE szól.
    expect(html.toLowerCase()).not.toContain('foglalás')
    expect(html.toLowerCase()).not.toContain('foglalj')
  })

  it('nincs időpontkérő űrlap, se időpont-sáv, se beküldő gomb', () => {
    const html = renderKapcsolatLayout()
    expect(html).not.toContain('kc-appointment__form')
    expect(html).not.toContain('Időpontot kérek')
    expect(html).not.toContain('Hétköznap délelőtt')
    expect(html).not.toContain('<form')
  })

  it('a szekció ettől NEM lesz zsákutca: minden elérhetőség kattintható marad', () => {
    const html = renderKapcsolatLayout()
    // NN/g: „Never hide or remove phone numbers from the Contact Us Page."
    // (https://www.nngroup.com/articles/contact-us-pages/)
    expect(html).toContain('href="tel:+36301692263"')
    expect(html).toContain('href="tel:+36203573493"')
    expect(html).toContain('href="mailto:info@kineticare.hu"')
    expect(html).toContain('kc-appointment__contact--fo')
  })
})

/**
 * A /kapcsolat SZAKEMBER-ELÉRHETŐSÉGE (tulajdonosi kérés, 2026-08-16: „lányok
 * elérhetősége kell a kapcsolat menüpontba is").
 *
 * ═══ MIT ŐRIZ ═══
 *  1. SORREND. A szekció az időpontkérő UTÁN áll: az időpontkérő bal hasábja
 *     már kiírja mindkét telefonszámot (NN/g kapcsolat-oldal irányelve: az
 *     űrlap csak a telefonszám MELLETT állhat, nem helyette), ez a szekció
 *     pedig az általa felvetett kérdésre válaszol — melyik szám kihez tartozik.
 *  2. NINCS ÖNMAGÁRA MUTATÓ LINK. Az írásos időpontkérés a lapon belüli
 *     `#idopontkeres` horgonyra megy, nem a `/kapcsolat` címre: az önmagára
 *     mutató link csak újratölti a lapot („the current document should never
 *     link to itself" — W3C wiki).
 *  3. A SZAKMAI HÁTTÉR a /rolunk harmonikájára mutat, mert ezen a lapon nincs
 *     önéletrajz — lapon belüli horgony törött linket adna.
 *  4. NINCS KITALÁLT ADAT: az `availability` („Mikor és hol érhető el") ÜRES,
 *     mert a rendelési idő és a helyszín szakemberenként nincs a repóban.
 *  5. A FELVEZETŐ kapcsolat-fókuszú, és eltér a másik két lapétól (a /rolunk-on
 *     bemutatkozás, a /szolgaltatasok-on bejelentkezés).
 */
describe('/kapcsolat szakember-elérhetőség', () => {
  const kapcsolatSzakember = () => {
    const blokk = buildKapcsolatLayout({ kocsisPortre: 31, kissPortre: 32 }).find(
      (elem) => elem.blockType === 'teamMembers',
    )
    if (blokk?.blockType !== 'teamMembers') {
      throw new Error('A szakember-szekció hiányzik a /kapcsolat szekciósorból.')
    }
    return blokk
  }

  it('az időpontkérő UTÁN áll, és megtartja a sávritmust (tint → fehér)', () => {
    const layout = buildKapcsolatLayout()
    const idopont = layout.findIndex((blokk) => blokk.blockType === 'appointment')
    const szakember = layout.findIndex((blokk) => blokk.blockType === 'teamMembers')
    expect(idopont).toBeGreaterThanOrEqual(0)
    expect(szakember).toBe(idopont + 1)

    // A sávritmus: az időpontkérő világoskék, a szakember-szekció fehér — az
    // utána következő üzenetküldő szekcióval EGY régiót alkotva (B2.2).
    const idopontBlokk = layout[idopont]
    const szakemberBlokk = layout[szakember]
    if (idopontBlokk.blockType !== 'appointment' || szakemberBlokk.blockType !== 'teamMembers') {
      throw new Error('A /kapcsolat szekciósor nem a várt két blokkot adta.')
    }
    expect(idopontBlokk.sectionSettings?.hatter).toBe('tint')
    expect(szakemberBlokk.sectionSettings?.hatter).toBe('feher')
  })

  it('mindkét gyógytornász neve, titulusa és kattintható száma megjelenik', () => {
    const html = renderKapcsolatLayout()
    expect(html).toContain('Kocsis Kata')
    expect(html).toContain('Kiss Kata')
    expect(html).toContain('Hívd Kocsis Katát')
    expect(html).toContain('Hívd Kiss Katát')
    // A szekció saját, kattintható hívás-felülete (az időpontkérő listáján felül).
    expect((html.match(/class="kc-team__call"/g) ?? []).length).toBe(2)
    for (const tag of kapcsolatSzakember().members ?? []) {
      expect((tag.role ?? '').trim().length).toBeGreaterThan(0)
    }
  })

  it('a portrék bekerülnek, de kép nélkül is felépül a szekció', () => {
    expect((kapcsolatSzakember().members ?? []).map((tag) => tag.photo)).toEqual([31, 32])
    const kepNelkul = buildKapcsolatLayout().find((blokk) => blokk.blockType === 'teamMembers')
    if (kepNelkul?.blockType !== 'teamMembers') {
      throw new Error('A szakember-szekció kép nélkül eltűnt a szekciósorból.')
    }
    expect((kepNelkul.members ?? []).map((tag) => tag.photo)).toEqual([undefined, undefined])
  })

  it('a szekció alján NINCS odaugró hivatkozás, mert fölösleges lenne', () => {
    /**
     * SZERZŐDÉS-VÁLTÁS (2026-08-17): korábban itt egy „Kérj időpontot
     * üzenetben" link vitt a lap tetején álló ŰRLAPRA. Az űrlap megszűnt, tehát
     * a felirat hazugság lenne; a link CÉLJA pedig (a rendelő elérhetőségei)
     * innen két szekcióval feljebb, ráadásul a kártyákon is ott van saját
     * hívás-linkkel. Az odaugrás így olyan adathoz vinne, ami már a látogató
     * szeme előtt van.
     */
    const blokk = kapcsolatSzakember()
    expect(blokk.bookingLink).toBeUndefined()

    // A horgony maga MARAD: a /szolgaltatasok „Időpontot kérek" hivatkozása ide
    // érkezik, tehát a célnak léteznie kell.
    const horgonyok = buildKapcsolatLayout().map((elem) => elem.sectionSettings?.anchorId)
    expect(horgonyok).toContain(IDOPONTKERES_HORGONY)

    const html = renderKapcsolatLayout()
    // Körkörös link (a lap önmagára) sehol nem keletkezik.
    expect(html).not.toContain('href="/kapcsolat"')
  })

  it('a szakmai háttér a /rolunk harmonikájára mutat, és az a horgony létezik ott', () => {
    expect(SZAKMAI_HATTER_URL).toBe('/rolunk#szakmai-hatter')
    for (const tag of kapcsolatSzakember().members ?? []) {
      expect(tag.link?.url).toBe(SZAKMAI_HATTER_URL)
      expect(tag.link?.felirat).toBe('Nézd meg a szakmai hátterét')
    }
    // A cél ténylegesen létező horgony a /rolunk szekciósorában.
    const rolunkHorgonyok = buildRolunkLayout().map((blokk) => blokk.sectionSettings?.anchorId)
    expect(rolunkHorgonyok).toContain(SZAKMAI_HATTER_URL.split('#')[1])
    // A /kapcsolat lapon NINCS önéletrajz-harmonika, tehát lapon belüli horgony
    // törött linket adna — ezt méri ez a sor.
    expect(buildKapcsolatLayout().some((blokk) => blokk.blockType === 'accordion')).toBe(false)
  })

  it('NEM talál ki rendelési időt vagy címet', () => {
    // ═══ MIT VÉD EZ AZ ŐR ═══
    // A szabály SOSEM az volt, hogy a mező maradjon üres, hanem hogy ne
    // találjunk ki adatot. A tulajdonos 2026-08-17-én megadta a valós
    // folyamatot (a helyszínt telefonon egyeztetik), ezért a mező már nem
    // üres — de kitalált NYITVATARTÁS és CÍM továbbra sem kerülhet bele.
    // Ezért az őr mostantól a tényleges tilalmat méri, nem az ürességet:
    // enélkül a következő szerkesztés csendben beírhatna egy kitalált
    // „H–P 8–16, Fő utca 1." sort, és a teszt zöld maradna.
    const idoMintak = [
      /\d{1,2}[:.]\d{2}/, //  8:00, 8.00
      /\d{1,2}\s*[–-]\s*\d{1,2}\s*(óra|h\b)/i, //  8–16 óra
      /\b(hétfő|kedd|szerda|csütörtök|péntek|szombat|vasárnap)/i,
    ]
    const cimMintak = [/\b(utca|út|tér|körút|krt\.|hrsz|emelet|házszám)\b/i, /\b\d{4}\s+[A-ZÁÉÍÓÖŐÚÜŰ]/]

    for (const tag of kapcsolatSzakember().members ?? []) {
      const szoveg = (tag.availability ?? '').trim()
      for (const minta of idoMintak) {
        expect(szoveg, `kitalált rendelési idő: „${szoveg}"`).not.toMatch(minta)
      }
      for (const minta of cimMintak) {
        expect(szoveg, `kitalált cím: „${szoveg}"`).not.toMatch(minta)
      }
    }
  })

  it('a felvezetője kapcsolat-fókuszú, és eltér a másik két lapétól', () => {
    const kapcsolat = kapcsolatSzakember()
    const mezok = (blokk: typeof kapcsolat) => [blokk.eyebrow, blokk.title, blokk.lead]
    const masik = [buildRolunkLayout(), buildSzolgaltatasokLayout()].map((layout) => {
      const blokk = layout.find((elem) => elem.blockType === 'teamMembers')
      if (blokk?.blockType !== 'teamMembers') {
        throw new Error('A szakember-szekció hiányzik az egyik belső oldal szekciósorából.')
      }
      return mezok(blokk)
    })

    for (const [eyebrow, title, lead] of masik) {
      expect(kapcsolat.eyebrow).not.toBe(eyebrow)
      expect(kapcsolat.title).not.toBe(title)
      expect(kapcsolat.lead).not.toBe(lead)
    }
    // A titulus továbbra is EGY forrásból jön (nem csúszhat el oldalanként).
    const rolunk = buildRolunkLayout().find((blokk) => blokk.blockType === 'teamMembers')
    if (rolunk?.blockType !== 'teamMembers') {
      throw new Error('A szakember-szekció hiányzik a /rolunk szekciósorból.')
    }
    expect((kapcsolat.members ?? []).map((tag) => tag.role)).toEqual(
      (rolunk.members ?? []).map((tag) => tag.role),
    )
  })

  it('a vevőnek szóló szövegeiben nincs gondolatjel-halmozás', () => {
    const blokk = kapcsolatSzakember()
    const szovegek = [
      blokk.eyebrow ?? '',
      blokk.title ?? '',
      blokk.lead ?? '',
      blokk.bookingLink?.felirat ?? '',
      ...(blokk.members ?? []).flatMap((tag) => [
        tag.name,
        tag.role ?? '',
        tag.bio ?? '',
        tag.callLabel ?? '',
        tag.link?.felirat ?? '',
      ]),
    ]
    for (const szoveg of szovegek) {
      expect(szoveg).not.toContain('—')
      expect(szoveg).not.toContain('–')
    }
  })

  it('nem visz saját h1-et (a lap h1-e a route „Kapcsolat" címe marad)', () => {
    expect(renderKapcsolatLayout()).not.toContain('<h1')
  })
})
