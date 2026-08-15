import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { pageBlockSlugs, teamMembers } from '../blocks'
import { RenderBlocks } from '../components/blocks/RenderBlocks'
import { cvItemLines, TeamMembers, telHref } from '../components/blocks/TeamMembers'
import type { BlockTeamMembers, Page } from '../payload-types'

/**
 * Szakértő-kártyák (teamMembers) — fókuszált tesztek, DB nélkül.
 *
 * Négy szerződést rögzítenek:
 *  1. a BLOKK-DEFINÍCIÓ: benne van a katalógusban, a `members` tömb legfeljebb
 *     KETTŐ (ez a 50–50-es páros szerződése), és a név kötelező;
 *  2. a RENDERELÉS: két tag egymás mellett, névvel/titulussal/bióval, a hiányos
 *     tag kimarad, tag nélkül a szekció is;
 *  3. a LINKELÉS és a TISZTÍTÁS: `tel:`/`mailto:` href-építés, tiltott sémájú
 *     CMS-webcím némán link nélkül renderel;
 *  4. a CV-HARMONIKA: natív `details`, a darabszám a TÉNYLEGES sorokból jön,
 *     üres sor nem számít bele, és a blokk NEM ad ki FAQPage JSON-LD-t.
 *
 * A stíluslap két szabálya (akcent-korlát, prefers-reduced-motion) fájl-szinten
 * őrzött: mindkettő olyan, amit egy későbbi szerkesztés csendben elronthatna.
 */

// ---------------------------------------------------------------------------
// Fixture-ök
// ---------------------------------------------------------------------------

type Layout = NonNullable<Page['layout']>

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

/** Egy teamMembers blokk renderelése önmagában (a szekció-adapteren kívül). */
function renderBlock(block: Record<string, unknown>): string {
  return render(createElement(TeamMembers, { block: block as unknown as BlockTeamMembers }))
}

/** Ugyanaz a blokk a RenderBlocks switchén keresztül (regisztráció-ellenőrzés). */
function renderViaSwitch(block: Record<string, unknown>): string {
  return render(
    createElement(RenderBlocks, {
      layout: [block] as unknown as Layout,
      products: [],
      posts: [],
      testimonials: [],
    }),
  )
}

const kocsis = {
  id: 'm1',
  name: 'Kocsis Kata',
  role: 'Gyógytornász, manuálterapeuta',
  bio: 'Kézrehabilitációval foglalkozik.',
  phone: '+36 30 169 2263',
}

const kiss = {
  id: 'm2',
  name: 'Kiss Kata',
  role: 'Gyógytornász, sportrehabilitációs tréner',
  bio: 'Sportolók kézsérüléseivel foglalkozik.',
  phone: '+36 20 357 3493',
}

// ---------------------------------------------------------------------------
// 1. Blokk-definíció
// ---------------------------------------------------------------------------

describe('teamMembers blokk-definíció', () => {
  it('a katalógus része, és a slug/interfész a generált típussal egyezik', () => {
    expect(teamMembers.slug).toBe('teamMembers')
    expect(teamMembers.interfaceName).toBe('BlockTeamMembers')
    expect(pageBlockSlugs).toContain('teamMembers')
  })

  it('a `members` tömb LEGFELJEBB kettő — ez a 50–50-es páros szerződése', () => {
    const members = teamMembers.fields.find(
      (field) => 'name' in field && field.name === 'members',
    )
    expect(members, 'nincs `members` mező a blokkban').toBeDefined()
    expect(members).toMatchObject({ type: 'array', maxRows: 2, minRows: 1 })
  })

  it('a név kötelező, a portré/titulus/bio nem — hiányos adat nem blokkolja a mentést', () => {
    const members = teamMembers.fields.find(
      (field): field is Extract<typeof field, { fields: unknown[] }> =>
        'name' in field && field.name === 'members' && 'fields' in field,
    )
    const byName = new Map(
      (members?.fields ?? []).flatMap((field) =>
        'name' in field && typeof field.name === 'string' ? [[field.name, field] as const] : [],
      ),
    )
    expect(byName.get('name')).toMatchObject({ required: true })
    expect(byName.get('photo')).toMatchObject({ type: 'upload', relationTo: 'media' })
    // A `required` a Payload mező-uniójában nem minden ágon létezik (UIField),
    // ezért itt szűkítés nélkül, tulajdonság-jelenlétre vizsgálunk.
    for (const optional of ['role', 'bio', 'phone', 'email'] as const) {
      const field = byName.get(optional)
      expect(field, `hiányzó mező: ${optional}`).toBeDefined()
      expect(
        field && 'required' in field ? field.required === true : false,
        `a(z) ${optional} mező nem lehet kötelező`,
      ).toBe(false)
    }
    // A szekció-beállítások (elrejtés, horgony, háttér) minden blokkon ott vannak.
    expect(
      teamMembers.fields.some((field) => 'name' in field && field.name === 'sectionSettings'),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. Renderelés
// ---------------------------------------------------------------------------

describe('TeamMembers renderelés', () => {
  it('két tag egymás mellett: mindkét név, titulus és bio megjelenik', () => {
    const html = renderBlock({
      id: 'b1',
      blockType: 'teamMembers',
      title: 'Kik vagyunk?',
      members: [kocsis, kiss],
      sectionSettings: {},
    })
    expect(html).toContain('Kik vagyunk?')
    expect(html).toContain('Kocsis Kata')
    expect(html).toContain('Kiss Kata')
    expect(html).toContain('Gyógytornász, manuálterapeuta')
    expect(html).toContain('Sportolók kézsérüléseivel foglalkozik.')
    // Pontosan két kártya — a rács két hasábja.
    expect((html.match(/kc-team__card/g) ?? []).length).toBe(2)
  })

  it('név nélküli tag kimarad; egyetlen érvényes tag nélkül a szekció sem renderel', () => {
    const html = renderBlock({
      id: 'b2',
      blockType: 'teamMembers',
      title: 'Kik vagyunk?',
      members: [kocsis, { id: 'm3', name: '   ', role: 'Névtelen titulus' }],
      sectionSettings: {},
    })
    expect(html).toContain('Kocsis Kata')
    expect(html).not.toContain('Névtelen titulus')
    expect((html.match(/kc-team__card/g) ?? []).length).toBe(1)

    expect(renderBlock({ id: 'b3', blockType: 'teamMembers', title: 'Üres' })).toBe('')
  })

  it('cím nélkül a nevek h2-k (nincs kihagyott címsor-szint), címmel h3-ak', () => {
    const withTitle = renderBlock({
      id: 'b4',
      blockType: 'teamMembers',
      title: 'Kik vagyunk?',
      members: [kocsis],
      sectionSettings: {},
    })
    expect(withTitle).toContain('<h2 class="kc-team__title"')
    expect(withTitle).toContain('<h3 class="kc-team__name">Kocsis Kata</h3>')

    const withoutTitle = renderBlock({
      id: 'b5',
      blockType: 'teamMembers',
      members: [kocsis],
      sectionSettings: {},
    })
    expect(withoutTitle).not.toContain('<h3')
    expect(withoutTitle).toContain('<h2 class="kc-team__name">Kocsis Kata</h2>')
  })

  it('a RenderBlocks switch ismeri a blokkot: horgony és háttérsáv átmegy', () => {
    const html = renderViaSwitch({
      blockType: 'teamMembers',
      id: 'b6',
      title: 'Kik vagyunk?',
      members: [kocsis, kiss],
      sectionSettings: { visible: true, anchorId: 'szakembereink', hatter: 'tint' },
    })
    expect(html).toContain('Kocsis Kata')
    expect(html).toContain('id="szakembereink"')
    expect(html).toContain('kc-section--tint')
  })

  it('visible=false esetén a szekció kimarad', () => {
    const html = renderViaSwitch({
      blockType: 'teamMembers',
      id: 'b7',
      title: 'Rejtett szekció',
      members: [kocsis],
      sectionSettings: { visible: false },
    })
    expect(html).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 3. Kapcsolati linkek és CMS-webcím tisztítás
// ---------------------------------------------------------------------------

describe('TeamMembers kapcsolati linkek', () => {
  it('telHref: a tagolt szám href-je csak + és számjegy; szám nélkül nincs link', () => {
    expect(telHref('+36 30 169 2263')).toBe('tel:+36301692263')
    expect(telHref('06-30/169-2263')).toBe('tel:06301692263')
    expect(telHref('hívj fel!')).toBeNull()
  })

  it('a megjelenített szám tagolt marad, a href tömör; az e-mail mailto: lesz', () => {
    const html = renderBlock({
      id: 'b8',
      blockType: 'teamMembers',
      members: [{ ...kocsis, email: 'info@kineticare.hu' }],
      sectionSettings: {},
    })
    expect(html).toContain('href="tel:+36301692263"')
    expect(html).toContain('+36 30 169 2263')
    expect(html).toContain('href="mailto:info@kineticare.hu"')
    // Az ismétlődő kapcsolati linkek a linklistában is megkülönböztethetők.
    expect(html).toContain('aria-label="Kocsis Kata telefonszáma: +36 30 169 2263"')
  })

  it('tiltott sémájú webcím némán link nélkül renderel, a belső útvonal linkként', () => {
    const blocked = renderBlock({
      id: 'b9',
      blockType: 'teamMembers',
      members: [
        { ...kocsis, link: { felirat: 'Bővebben', url: 'javascript:alert(1)' } },
      ],
      sectionSettings: {},
    })
    expect(blocked).toContain('Kocsis Kata')
    expect(blocked).not.toContain('kc-team__link')

    const allowed = renderBlock({
      id: 'b10',
      blockType: 'teamMembers',
      members: [{ ...kocsis, link: { felirat: 'Bővebben', url: '/rolunk#cv-kocsis' } }],
      sectionSettings: {},
    })
    expect(allowed).toContain('href="/rolunk#cv-kocsis"')
    expect(allowed).toContain('aria-label="Kocsis Kata: Bővebben"')
  })

  it('új lapon nyíló külső linknél kötelező a rel="noopener noreferrer"', () => {
    const html = renderBlock({
      id: 'b11',
      blockType: 'teamMembers',
      members: [
        {
          ...kocsis,
          link: { felirat: 'Szakmai profil', url: 'https://pelda.hu/kata', ujAblakban: true },
        },
      ],
      sectionSettings: {},
    })
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })
})

// ---------------------------------------------------------------------------
// 4. CV-harmonika
// ---------------------------------------------------------------------------

describe('TeamMembers szakmai listák (harmonika)', () => {
  it('cvItemLines: soronként egy tétel, az üres és csak szóközös sorok kimaradnak', () => {
    expect(cvItemLines('Egy\n\n  \nKettő\nHárom  ')).toEqual(['Egy', 'Kettő', 'Három'])
    expect(cvItemLines('   ')).toEqual([])
  })

  it('natív details/summary, és a darabszám a TÉNYLEGES sorokból számolódik', () => {
    const html = renderBlock({
      id: 'b12',
      blockType: 'teamMembers',
      members: [
        {
          ...kocsis,
          cvSections: [
            {
              id: 'cv1',
              heading: 'Tanfolyamok',
              // Öt sor, közte egy üres — a darabszám 4 kell legyen.
              items: 'Dynamic Tape\nFlossing\n\nKinezio tape\nKöpölyözés',
            },
          ],
        },
      ],
      sectionSettings: {},
    })
    expect(html).toContain('<details')
    expect(html).toContain('<summary')
    expect(html).toContain('Tanfolyamok')
    expect(html).toContain('<span class="kc-team__cv-count">4</span>')
    expect((html.match(/kc-team__cv-entry/g) ?? []).length).toBe(4)
    // Alapból zárva: az `open` attribútum nincs kiírva.
    expect(html).not.toContain('<details class="kc-team__cv-section" open')
  })

  it('cím vagy tétel nélküli lista kimarad', () => {
    const html = renderBlock({
      id: 'b13',
      blockType: 'teamMembers',
      members: [
        {
          ...kocsis,
          cvSections: [
            { id: 'cv2', heading: 'Üres lista', items: '\n  \n' },
            { id: 'cv3', heading: '  ', items: 'Van tétel, de nincs cím' },
          ],
        },
      ],
      sectionSettings: {},
    })
    expect(html).not.toContain('Üres lista')
    expect(html).not.toContain('Van tétel, de nincs cím')
    expect(html).not.toContain('<details')
  })

  it('a blokk NEM ad ki FAQPage JSON-LD-t (egy CV-lista nem GYIK)', () => {
    const html = renderViaSwitch({
      blockType: 'teamMembers',
      id: 'b14',
      title: 'Kik vagyunk?',
      members: [
        { ...kocsis, cvSections: [{ id: 'cv4', heading: 'Publikációk', items: 'Egy\nKettő' }] },
      ],
      sectionSettings: {},
    })
    expect(html).toContain('Publikációk')
    expect(html).not.toContain('FAQPage')
    expect(html).not.toContain('application/ld+json')
  })
})

// ---------------------------------------------------------------------------
// 5. Teljes CMS-vezéreltség (tulajdonosi elfogadási feltétel)
// ---------------------------------------------------------------------------

describe('TeamMembers — minden tartalom az adminból jön', () => {
  /**
   * Látható szöveg a renderelt HTML-ből: tag-ek nélkül, összevont szóközökkel.
   *
   * Az attribútumok (köztük a képernyőolvasónak szóló `aria-label` kötőszava)
   * szándékosan kimaradnak: az elfogadási feltétel a LÁTHATÓ tartalomra szól,
   * a hozzáférhető név pedig nem szerkesztői szöveg, hanem a11y-eszköz.
   */
  function visibleText(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  it('a látható szöveg KIZÁRÓLAG a mezők értéke (+ a számolt darabszám és a dekoratív nyíl)', () => {
    // A jelzőértékek szándékosan NEM részhalmazai egymásnak: a kivonás
    // egymás után fut, egy közös részszó hamis maradékot hagyna.
    const sentinels = {
      eyebrow: 'Aa-jelzo',
      title: 'Bb-jelzo',
      lead: 'Cc-jelzo',
      name: 'Dd-jelzo',
      role: 'Ee-jelzo',
      bio: 'Ff-jelzo',
      phone: '+11 22 333 4444',
      email: 'gg@jelzo.test',
      cvHeading: 'Hh-jelzo',
      cvItem: 'Ii-jelzo',
      linkLabel: 'Jj-jelzo',
    }
    const html = renderBlock({
      id: 'b15',
      blockType: 'teamMembers',
      eyebrow: sentinels.eyebrow,
      title: sentinels.title,
      lead: sentinels.lead,
      members: [
        {
          id: 'm9',
          name: sentinels.name,
          role: sentinels.role,
          bio: sentinels.bio,
          phone: sentinels.phone,
          email: sentinels.email,
          cvSections: [{ id: 'cv9', heading: sentinels.cvHeading, items: sentinels.cvItem }],
          link: { felirat: sentinels.linkLabel, url: '/rolunk' },
        },
      ],
      sectionSettings: {},
    })

    let remaining = visibleText(html)
    for (const value of Object.values(sentinels)) {
      expect(remaining, `hiányzó mező-érték a kimenetből: ${value}`).toContain(value)
      remaining = remaining.split(value).join(' ')
    }
    // Ami marad: a számolt darabszám (1) és a dekoratív nyíl. Bármi más beégetett
    // szöveg lenne — az a tulajdonosi feltétel megsértése.
    expect(remaining.replace(/[\s→1]/g, '')).toBe('')
  })

  it('üres mezők nem kapnak helykitöltőt — a hiányzó rész egyszerűen kimarad', () => {
    const html = renderBlock({
      id: 'b16',
      blockType: 'teamMembers',
      members: [{ id: 'm10', name: 'Csak Név' }],
      sectionSettings: {},
    })
    expect(visibleText(html)).toBe('Csak Név')
    expect(html).not.toContain('kc-team__role')
    expect(html).not.toContain('kc-team__bio')
    expect(html).not.toContain('kc-team__contact')
    expect(html).not.toContain('kc-team__cv')
    expect(html).not.toContain('<img')
  })

  it('a kártyák sorrendje a tömb sorrendje — az adminban átrendezhető', () => {
    const first = renderBlock({
      id: 'b17',
      blockType: 'teamMembers',
      members: [kocsis, kiss],
      sectionSettings: {},
    })
    const swapped = renderBlock({
      id: 'b18',
      blockType: 'teamMembers',
      members: [kiss, kocsis],
      sectionSettings: {},
    })
    expect(first.indexOf('Kocsis Kata')).toBeLessThan(first.indexOf('Kiss Kata'))
    expect(swapped.indexOf('Kiss Kata')).toBeLessThan(swapped.indexOf('Kocsis Kata'))
  })
})

// ---------------------------------------------------------------------------
// 6. Stíluslap-őrök (akcent-korlát és mozgás-érzékenység)
// ---------------------------------------------------------------------------

describe('team-members.css szabály-őrök', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../app/(frontend)/styles/blocks/team-members.css', import.meta.url)),
    'utf8',
  )

  it('a kiemelt szöveg accent-DEEP-et visz; a nyers `accent` sehol nem jelenik meg', () => {
    expect(css).toContain('--kc-team-accent-text: var(--kc-color-primary)')
    // A --kc-color-primary maga az accent-deep aliasa (tokens.css). A nyers
    // --kc-color-accent a hűvös felületeken 4,07:1 — AA alatt, ezért itt tilos.
    expect(css).not.toMatch(/var\(--kc-color-accent\)/)
  })

  it('a portré-nagyítás `prefers-reduced-motion: reduce` esetén kikapcsol', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('transition: none')
    expect(reduced).toContain('transform: none')
  })

  it('a rács auto-fit — egy taggal nem marad üres hasáb (kutatás B3.5)', () => {
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr))')
  })
})
