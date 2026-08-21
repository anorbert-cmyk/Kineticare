import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  sortButtonStyle,
  sortHeadCellStyle,
  errorStyle,
  warningStyle,
  TARGET_SIZE,
} from '../components/admin/course-progress-styles'
import { LessonDropOffTable, StudentsTable } from '../components/admin/course-progress-tables'
import type {
  CourseLessonDropOff,
  CourseStudentProgress,
} from '../lib/admin/course-progress-stats'

/**
 * ŐR — A KURZUS-HALADÁS PANEL AKADÁLYMENTESSÉGE ÉS SZÓHASZNÁLATA.
 *
 * A 2026-08-21-i audit nyolc hibát sorolt fel a panelen
 * (`docs/statisztika-audit-2026-08-21.md` 7. pont). Ez a fájl azokat őrzi,
 * amelyek némán vissza tudnának csúszni:
 *
 *   H1  a hibaüzenet színe MÉRVE 4,13:1 volt fehéren (kell 4,5)
 *   H2  a csonkolás-figyelmeztetésé 4,03:1
 *   H3  a görgethető táblarégió billentyűzetről elérhetetlen volt
 *   H4  a hallgató neve `td` volt, nem `th scope="row"`
 *   H5  a rendezhető fejléc-gomb doboza a sormagasságra esett (~19 px)
 *   H6  nem volt LÁTHATÓ rendezés-jelölés, csak `aria-sort`
 *   H7  ismétlődő fejezetnél ÜRES cella maradt a „Fejezet" oszlopban
 *   H8  a panel címsora `h4` volt
 *
 * A kontraszt-állítások nem string-egyezést néznek: a VALÓDI CSS-ből olvasott
 * hexa értékből SZÁMOLNAK arányt a WCAG 2.2 relatív luminancia-képletével
 * (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Egy
 * string-egyezés nem venné észre, ha valaki „csak egy árnyalatot" állít.
 *
 * A tábla-komponensek renderelhetők (nincs bennük Payload-provider-igény),
 * ezért a jelölést a TÉNYLEGES kimeneten mérjük, nem a forráson. Ami csak a
 * panelben él (címsor-szint, feliratok, mély link bekötése), azt a panel
 * forrásából olvassuk — ugyanaz a minta, mint a `cta-a-termekben.test.ts`-ben.
 */

const REPO = process.cwd()
const PANEL_SRC = readFileSync(
  join(REPO, 'src', 'components', 'admin', 'CourseProgressPanel.tsx'),
  'utf8',
)
const PANEL_CSS = readFileSync(
  join(REPO, 'src', 'components', 'admin', 'course-progress-panel.css'),
  'utf8',
)
const PAYLOAD_COLORS = readFileSync(
  join(REPO, 'node_modules', '@payloadcms', 'ui', 'dist', 'scss', 'colors.scss'),
  'utf8',
)

/**
 * A panel forrása KOMMENTEK NÉLKÜL.
 *
 * A „nincs benne ez a szó" alakú állításokat csak a VÉGREHAJTÓDÓ kódra szabad
 * megtenni: a fejkommentek és az indoklások éppen a régi feliratokat és a
 * megszüntetett hibákat idézik, tehát komment nélkül mérünk. (A blokk-komment
 * a JSX `{/* … *\/}` alakját is lefedi.)
 */
const PANEL_KOD = PANEL_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/* ───────────────────────── WCAG 2.2 kontraszt ───────────────────────── */

type Rgb = readonly [number, number, number]

function csatornaLuminancia(ertek: number): number {
  const s = ertek / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relativLuminancia([r, g, b]: Rgb): number {
  return (
    0.2126 * csatornaLuminancia(r) +
    0.7152 * csatornaLuminancia(g) +
    0.0722 * csatornaLuminancia(b)
  )
}

function kontraszt(a: Rgb, b: Rgb): number {
  const la = relativLuminancia(a)
  const lb = relativLuminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function hexRgb(hex: string): Rgb {
  const tiszta = hex.replace('#', '')
  return [
    Number.parseInt(tiszta.slice(0, 2), 16),
    Number.parseInt(tiszta.slice(2, 4), 16),
    Number.parseInt(tiszta.slice(4, 6), 16),
  ]
}

/** Egy `--kc-cp-*` token értéke a panel CSS-éből, témánként. */
function token(nev: string, tema: 'vilagos' | 'sotet'): string {
  const blokk =
    tema === 'vilagos'
      ? /\.kc-course-progress \{([\s\S]*?)\n\}/.exec(PANEL_CSS)?.[1]
      : /\[data-theme='dark'\] \.kc-course-progress \{([\s\S]*?)\n\}/.exec(PANEL_CSS)?.[1]
  expect(blokk, `nincs ${tema} .kc-course-progress blokk`).toBeTruthy()
  const ertek = new RegExp(`--${nev}:\\s*(#[0-9a-fA-F]{6})`).exec(blokk ?? '')?.[1]
  expect(ertek, `nincs --${nev} a ${tema} blokkban`).toBeTruthy()
  return ertek ?? ''
}

/**
 * A panel HÁTTERE a Payload `--theme-bg` = `--theme-elevation-0`, ami világos
 * témán `--color-base-0`, sötéten `--color-base-900`
 * (@payloadcms/ui/dist/scss/colors.scss). A két értéket ITT rögzítjük, és a
 * lenti tripwire ellenőrzi, hogy a csomag még mindig ezt mondja: ha a Payload
 * megváltoztatja a palettát, a kontrasztokat ÚJRA KELL MÉRNI, és ez a teszt
 * hangosan szól érte.
 */
const LAP_HATTER: Record<'vilagos' | 'sotet', Rgb> = {
  vilagos: [255, 255, 255],
  sotet: [20, 20, 20],
}

/* ───────────────────────── Fixtúrák ───────────────────────── */

function diak(overrides: Partial<CourseStudentProgress> & { userId: number }): CourseStudentProgress {
  return {
    name: `Hallgató ${String(overrides.userId)}`,
    email: `u${String(overrides.userId)}@example.test`,
    completed: 2,
    total: 4,
    percent: 50,
    status: 'folyamatban',
    lastActivityAt: '2026-08-11T08:00:00.000Z',
    currentLessonTitle: 'Harmadik lecke',
    enrolledAt: null,
    ...overrides,
  }
}

function lecke(
  lessonRef: string,
  title: string,
  moduleTitle: string,
  completedCount: number,
): CourseLessonDropOff {
  return { lessonRef, title, moduleTitle, completedCount, dropOffFromPrevious: 0 }
}

function hallgatoTabla(students: CourseStudentProgress[]): string {
  return renderToStaticMarkup(
    createElement(StudentsTable, {
      caption: 'A kurzushoz hozzáférő hallgatók haladása',
      captionId: 'kc-course-progress-hallgatok',
      onSort: () => undefined,
      sortDirection: 'asc' as const,
      sortKey: 'haladas' as const,
      students,
    }),
  )
}

function leckeTabla(lessons: CourseLessonDropOff[]): string {
  return renderToStaticMarkup(
    createElement(LessonDropOffTable, {
      caption: 'Leckénkénti elvégzettség és lemorzsolódás',
      captionId: 'kc-course-progress-leckek',
      enrolled: 10,
      lessons,
    }),
  )
}

/* ───────────────────────── H1–H2: kontraszt ───────────────────────── */

describe('H1–H2 — a panel állapotszínei (WCAG 2.2 SC 1.4.3)', () => {
  it('a Payload palettája még mindig az, amire a jegyzőkönyv számolt', () => {
    // Tripwire: ha ez kidől, a lenti kontraszt-számok elavultak.
    expect(PAYLOAD_COLORS).toContain('--color-base-0: rgb(255, 255, 255)')
    expect(PAYLOAD_COLORS).toContain('--color-base-900: rgb(20, 20, 20)')
  })

  it('a MAI Payload-tokenek tényleg megbuknak (a hiba reprodukálható)', () => {
    // --theme-error-500 = rgb(218,75,72), --theme-warning-500 = rgb(185,108,13)
    expect(kontraszt([218, 75, 72], LAP_HATTER.vilagos)).toBeLessThan(4.5)
    expect(kontraszt([185, 108, 13], LAP_HATTER.vilagos)).toBeLessThan(4.5)
    // A hibaszín sötét témán SEM elég, tehát a csere ott is javít.
    expect(kontraszt([218, 75, 72], LAP_HATTER.sotet)).toBeLessThan(4.5)
  })

  it('a márka-token VILÁGOS témán ≥ 4,5:1', () => {
    expect(kontraszt(hexRgb(token('kc-cp-danger', 'vilagos')), LAP_HATTER.vilagos)).toBeGreaterThanOrEqual(4.5)
    expect(kontraszt(hexRgb(token('kc-cp-warning', 'vilagos')), LAP_HATTER.vilagos)).toBeGreaterThanOrEqual(4.5)
  })

  it('a márka-token SÖTÉT témán is ≥ 4,5:1', () => {
    expect(kontraszt(hexRgb(token('kc-cp-danger', 'sotet')), LAP_HATTER.sotet)).toBeGreaterThanOrEqual(4.5)
    expect(kontraszt(hexRgb(token('kc-cp-warning', 'sotet')), LAP_HATTER.sotet)).toBeGreaterThanOrEqual(4.5)
  })

  it('a vezetői döntés szerinti márka-hibaszín áll a világos témán (8.3)', () => {
    expect(token('kc-cp-danger', 'vilagos').toLowerCase()).toBe('#b3261e')
  })

  it('a komponens a TOKENRE hivatkozik, és a tartalék sem bukhat el', () => {
    expect(errorStyle.color).toBe('var(--kc-cp-danger, var(--theme-text))')
    expect(warningStyle.color).toBe('var(--kc-cp-warning, var(--theme-text))')
    // A tartalék a Payload szövegszíne (--theme-elevation-800): világosban
    // rgb(47,47,47), sötétben rgb(235,235,235) — mindkettő bőven AA fölött.
    expect(kontraszt([47, 47, 47], LAP_HATTER.vilagos)).toBeGreaterThanOrEqual(4.5)
    expect(kontraszt([235, 235, 235], LAP_HATTER.sotet)).toBeGreaterThanOrEqual(4.5)
  })

  it('a panel NEM nyúl a Payload globális hibatokenjéhez', () => {
    // A 8.3 döntés: a globális felülírás az admin ÖSSZES gyári hibaüzenetét
    // átszínezné. A panel ezért sehol nem használhatja a bukó tokeneket.
    expect(PANEL_KOD).not.toContain('--theme-error-500')
    expect(PANEL_KOD).not.toContain('--theme-warning-500')
    expect(PANEL_CSS).not.toContain('--theme-error-500:')
    expect(PANEL_CSS).not.toContain('--theme-warning-500:')
  })
})

/* ───────────── H3–H7: a táblák TÉNYLEGES kimenetén mérve ───────────── */

describe('H3 — a görgethető táblarégió billentyűzetről (WCAG 2.2 SC 2.1.1)', () => {
  it('a hallgató-tábla görgetője fókuszálható, nevesített régió', () => {
    const html = hallgatoTabla([diak({ userId: 1 })])
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-labelledby="kc-course-progress-hallgatok"')
    expect(html).toContain('id="kc-course-progress-hallgatok"')
  })

  it('a lemorzsolódás-tábla görgetője is', () => {
    const html = leckeTabla([lecke('l1', 'Első lecke', '1. fejezet', 9)])
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-labelledby="kc-course-progress-leckek"')
  })

  it('a régiónak VAN neve (névtelen régió nem navigálható)', () => {
    const html = hallgatoTabla([diak({ userId: 1 })])
    expect(html).toContain('A kurzushoz hozzáférő hallgatók haladása')
  })
})

describe('H4 — minden sornak van sorfejléce (WCAG 2.2 SC 1.3.1)', () => {
  it('a hallgató neve `th scope="row"`, nem `td`', () => {
    const html = hallgatoTabla([diak({ userId: 7, name: 'Kovács Anna' })])
    expect(html).toContain('<th scope="row"')
    expect(html).toMatch(/<th scope="row"[^>]*>Kovács Anna<\/th>/)
  })

  it('név híján az e-mail azonosít — üres sorfejléc nincs', () => {
    const html = hallgatoTabla([diak({ userId: 8, name: null })])
    expect(html).toMatch(/<th scope="row"[^>]*>u8@example\.test<\/th>/)
  })

  it('a lecke címe is sorfejléc a lemorzsolódás-táblában', () => {
    const html = leckeTabla([lecke('l1', 'Első lecke', '1. fejezet', 9)])
    expect(html).toMatch(/<th scope="row"[^>]*>Első lecke<\/th>/)
  })
})

describe('H5 — a rendezhető fejléc-gomb érintőcélja (WCAG 2.2 SC 2.5.8)', () => {
  /**
   * A gomb korábban `padding: 0; background: none; border: none` volt, tehát
   * a doboza a sormagasságra esett (mérve ~19 px). A szabvány minimuma
   * 24 × 24 CSS px, a repó célja 44 × 44 (`docs/ui-sztenderdek.md` §2.4).
   */
  it('a stílus 44 px-es alsó korlátot ír elő MINDKÉT irányban', () => {
    expect(sortButtonStyle.minHeight).toBe(TARGET_SIZE)
    expect(sortButtonStyle.minWidth).toBe(TARGET_SIZE)
    expect(TARGET_SIZE).toContain('44px')
    // A `max()` azért kell, mert a Payload 1024 px alatt 12 px-re viszi a
    // gyökeret, és a puszta rem-alak ott 40,6 px-et adna.
    expect(TARGET_SIZE.startsWith('max(')).toBe(true)
  })

  it('a fejléccella nem növeli fölöslegesen a sort a gomb fölött', () => {
    expect(sortHeadCellStyle.paddingTop).toBe(0)
    expect(sortHeadCellStyle.paddingBottom).toBe(0)
  })

  it('a kirajzolt gombon ott van a min-height és a min-width', () => {
    const html = hallgatoTabla([diak({ userId: 1 })])
    expect(html).toContain('min-height:max(44px')
    expect(html).toContain('min-width:max(44px')
  })
})

describe('H6 — LÁTHATÓ rendezés-jelölés (NN/g, Data Tables)', () => {
  it('mindhárom rendezhető oszlopon van jel, és a jel `aria-hidden`', () => {
    const html = hallgatoTabla([diak({ userId: 1 })])
    // Az aktív oszlop (haladas, asc) nyila és a két inaktív kettős nyila.
    expect(html).toContain('↑')
    expect(html).toContain('⇅')
    expect(html).toMatch(/aria-hidden="true"[^>]*>[↑↓⇅]</)
  })

  it('az `aria-sort` MEGMARADT a jel mellett', () => {
    const html = hallgatoTabla([diak({ userId: 1 })])
    expect(html).toContain('aria-sort="ascending"')
    expect(html).toContain('aria-sort="none"')
  })
})

describe('H7 — a „Fejezet" oszlop nem hagy üres cellát (WCAG 2.2 SC 1.3.1)', () => {
  it('az ismétlődő fejezetcím BENNE VAN a DOM-ban, csak nem látszik', () => {
    const html = leckeTabla([
      lecke('l1', 'Első lecke', '1. fejezet', 9),
      lecke('l2', 'Második lecke', '1. fejezet', 8),
      lecke('l3', 'Harmadik lecke', '1. fejezet', 7),
    ])
    // Háromszor szerepel a cím, de csak az elsőn nincs elrejtő stílus.
    const elofordulas = html.split('1. fejezet').length - 1
    expect(elofordulas).toBe(3)
    expect(html).toContain('clip:rect(0 0 0 0)')
  })

  it('nincs üres `td` a fejezet-oszlopban', () => {
    const html = leckeTabla([
      lecke('l1', 'Első lecke', '1. fejezet', 9),
      lecke('l2', 'Második lecke', '1. fejezet', 8),
    ])
    expect(html).not.toMatch(/<td[^>]*><\/td>/)
  })
})

/* ───────────── H8 + szóhasználat: a panel forrásából ───────────── */

describe('H8 — a panel címsora nem ugrik szintet (WCAG 2.2 SC 1.3.1 / 2.4.6)', () => {
  it('h3 áll a korábbi h4 helyén, mind a négy ágon', () => {
    expect(PANEL_KOD).toContain('<h3 style={{ marginTop: 0 }}>Kurzus-haladás</h3>')
    expect(PANEL_KOD).not.toContain('<h4')
  })
})

describe('Szóhasználat és mikroszöveg (ui-sztenderdek §3.1, audit 8.2)', () => {
  it('a hozzáférés-kártya „Hozzáfér", nem „Beiratkozott"', () => {
    expect(PANEL_KOD).toContain('label="Hozzáfér"')
    expect(PANEL_KOD).not.toContain('label="Beiratkozott"')
  })

  it('a gombfeliratok a jóváhagyott alakban állnak', () => {
    expect(PANEL_KOD).toContain("'Megnézem a haladást'")
    expect(PANEL_KOD).toContain("'Betöltés…'")
    expect(PANEL_KOD).toContain('Letöltöm a listát (CSV)')
    expect(PANEL_KOD).toContain('Mutass még ')
    expect(PANEL_KOD).not.toContain('Haladás betöltése')
    expect(PANEL_KOD).not.toContain('Letöltés táblázatba')
    expect(PANEL_KOD).not.toContain('hallgató megjelenítése')
  })

  it('a hibaüzenet végig tegez (nincs „Kérjük")', () => {
    expect(PANEL_KOD).toContain('A kurzus-haladás most nem tölthető be. Próbáld újra később.')
    expect(PANEL_KOD).not.toContain('Kérjük')
  })

  it('a mentetlen kurzus üzenete kettősponttal tagol, nem gondolatjellel', () => {
    expect(PANEL_KOD).toContain('Előbb mentsd a kurzust: haladást csak meglévő kurzushoz')
  })

  it('a FELHASZNÁLÓNAK SZÁNT szövegekben nincs kvirtmínusz (§3.1.1)', () => {
    const emDash = String.fromCodePoint(0x2014)
    for (const sor of PANEL_KOD.split('\n')) {
      expect(sor, sor.trim()).not.toContain(emDash)
    }
  })
})

describe('Mély link — a panel bekötése (audit 1. pont)', () => {
  it('a panel a query-paraméterből olvassa a szűrőt', () => {
    expect(PANEL_KOD).toContain('readProgressDeepLink(searchParams.toString())')
    expect(PANEL_KOD).toContain("useState<StudentStatusFilter>(deepLinkStatus ?? 'mind')")
  })

  it('automata betöltés CSAK akkor, ha a link kérte', () => {
    expect(PANEL_KOD).toContain('if (deepLinkStatus === null || productId === null')
    expect(PANEL_KOD).toContain('autoLoadStarted.current')
  })

  it('a panel horgonyt visel, és odagörget', () => {
    expect(PANEL_KOD).toContain('id={PROGRESS_PANEL_ANCHOR}')
    expect(PANEL_KOD).toContain('scrollIntoView')
    // Mozgás nélkül: a `behavior: 'smooth'` sértené a prefers-reduced-motion
    // elvárását (WCAG 2.2 SC 2.3.3).
    expect(PANEL_KOD).not.toContain("behavior: 'smooth'")
  })

  it('a szerepkör-kapu VÁLTOZATLANUL a helyén van', () => {
    expect(PANEL_KOD).toContain('if (!hasStaffOrOwnerRole(user))')
  })

  it('hibaágon SEM naplóz hallgatói objektumot', () => {
    // A logger redact-listáján rajta van az `email`, a `name` NINCS
    // (audit 6.5), ezért a panel egyáltalán nem naplóz.
    expect(PANEL_KOD).not.toContain('console.')
    expect(PANEL_KOD).not.toContain('logger')
  })
})
