'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CTA_PROGRESS_LABELS, ctaLabel } from '../../lib/cta-vocabulary'
import { logoutUser } from '../../lib/logout-client'

/**
 * AccountNav — a hitelesítési belépési pont az OLDALKERETBEN.
 *
 * MIÉRT LÉTEZIK. A 2026-08-16-i mérés szerint a site-kereten (fejléc, lábléc,
 * mobil menü) NULLA belépési pont volt: 32 lemért oldalváltozaton `/belepes` = 0
 * link, `/kurzusaim` = 0 link, kijelentkezés sehol. Az egyetlen kivétel egy
 * 120×19 px-es szöveglink a pénztár egyik mondatának belsejében.
 * Bizonyíték és súlyozás: `docs/informacios-architektura.md` §4 (a
 * „Belépés" és a „Fiók/Kurzusaim" oszlop teljesen üres), TOP-10 #2 és #6;
 * a javítás kiírása ugyanott §8.1/2. A persona-séta szava:
 * `docs/felhasznaloi-seta.md` §6.1 („elvesztettem a tanfolyamot").
 *
 * ─── A TERVEZÉSI DÖNTÉSEK ÉS A FORRÁSAIK ──────────────────────────────────
 *
 * 1. HOVA. A fejléc jobb oldala. A NN/g segéd-navigációs (utility navigation)
 *    kutatása szerint a látogató ott KERESI ezeket az elemeket:
 *    „We often see users looking in that area for tools, especially for items
 *    such as Log in, Search, and My Account", és „Group utilities where people
 *    expect them: either in the top-right corner or next to the content they
 *    affect."
 *    NN/g — Utility Navigation: What It Is and How to Design It
 *    https://www.nngroup.com/articles/utility-navigation/
 *
 * 2. MILYEN SÚLLYAL. Szöveglink, NEM második kitöltött pirula. A lapon egy
 *    elsődleges cselekvés lehet, és az a „Kurzusok" (az értékesítés fő útja,
 *    docs/ertekesitesi-ux-skill.md 3. pont). A GOV.UK Design System gomb-lapja:
 *    „Avoid using multiple default buttons on a single page. Having more than
 *    one main call to action reduces their impact, and makes it harder for users
 *    to know what to do next", és „Use secondary buttons for secondary calls to
 *    action on a page."
 *    GOV.UK Design System — Button
 *    https://design-system.service.gov.uk/components/button/
 *    Ezért a belépési pont a fejléc MÁR MEGLÉVŐ másodlagos nyelvét viszi
 *    (`.kc-nav-desktop__link`: ink szöveg, hoveren akcent + aláhúzás), és nem
 *    hoz be új vizuális súlyt.
 *
 * 3. A KIJELENTKEZÉS GOMB, NEM LINK. A WAI-ARIA Authoring Practices szerint a
 *    gomb „a widget that enables users to trigger an action or event", és
 *    „The types of actions performed by buttons are distinctly different from
 *    the function of a link."
 *    W3C WAI-ARIA APG — Button Pattern
 *    https://www.w3.org/WAI/ARIA/apg/patterns/button/
 *    A kijelentkezés állapotot változtat (session-törlés), tehát `<button>`, és
 *    a hívás POST (OWASP CSRF — lásd `src/lib/logout-client.ts`).
 *
 * 4. A FELIRATOK. „Belépés" (nem „Bejelentkezés", nem „Fiók") és „Kurzusaim" —
 *    minden felületen UGYANAZ a szó. WCAG 2.2 3.2.4 Consistent Identification:
 *    „Components that have the same functionality within a set of web pages are
 *    identified consistently."
 *    https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
 *    A „Belépés" a `docs/ui-sztenderdek.md` §3.2 #5 jóváhagyott sora, és a
 *    `docs/gomb-inventar.md` §5 leképezése is UGYANEZT adja — vagyis nem érinti
 *    a két szótár nyitott E/1–E/2 vitáját. A „Kurzusaim" a CÉLOLDAL neve
 *    (`kurzusaim/page.tsx`: `metadata.title` és `<h1>` egyaránt „Kurzusaim"),
 *    tehát navigációs címke, nem CTA: a menüpont-név és az oldalcím egyezése a
 *    „megérkeztem" visszaigazolás feltétele (informacios-architektura.md §6.5).
 *    A „Kijelentkezés" a „Belépés" szimmetrikus párja, egyszavas bevett
 *    parancs — a §3.2 #5 indoklása szerint.
 *
 * 5. NINCS IKON. A fejléc jelenlegi nyelve tisztán tipográfiai (ikon csak a
 *    lenyitó nyílon és a hamburgeren van, mindkettő `aria-hidden`). Egy új,
 *    nem bizonyított ikon-szótár bevezetése helyett a felirat marad az
 *    azonosító — ez a 3.2.4 szerint is a biztos út.
 *
 * ─── ÁLLAPOTOK (mind a hét, a skill 4. pontja) ────────────────────────────
 * alap · hover · focus-visible (globális 3px gyűrű, base.css) · active ·
 * disabled (a kijelentkezés folyamat közben) · folyamatban („Kijelentkezés…",
 * `aria-busy`) · látogatott (navigációs linknél SZÁNDÉKOSAN nincs külön
 * :visited jelölés — a keret-navigáció minden linkje meglátogatott lenne, a
 * jelölés így nem hordozna információt; az NN/g :visited-ajánlása a TARTALMI
 * linkekre szól).
 *
 * A hibaüzenet `role="alert"` + `aria-live="assertive"` (a repó LoginForm-
 * mintája), mert a kijelentkezés bukása némán maradna észrevétlen.
 */

export type AccountNavVariant = 'header' | 'drawer'

export interface AccountNavProps {
  /** Szerver-oldalon megállapított állapot (lásd header-user.ts). */
  signedIn: boolean
  /** Elhelyezés: fejléc-sáv (asztali) vagy mobil drawer. */
  variant: AccountNavVariant
  /** Drawerben: a menü zárása navigációkor (a MobileNav adja). */
  onNavigate?: () => void
}

export const ACCOUNT_NAV_LABELS = {
  /** §3.2 #5 – bevett, egyszavas címke (P-1c). */
  signIn: ctaLabel('sign-in'),
  /** A fiókmenü menüpontjának NEVE (N-3: menücímke, nem CTA) — nem szótári sor. */
  myCourses: 'Kurzusaim',
  /** §3.2 #32 – a #5 szabályos párja, ugyanaz a P-1c kivétel. */
  signOut: ctaLabel('sign-out'),
  /** L-1 folyamatban-felirat: három pont (U+2026), gondolatjel nélkül. */
  signOutPending: CTA_PROGRESS_LABELS['sign-out'],
} as const

export function AccountNav({ signedIn, variant, onNavigate }: AccountNavProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = async () => {
    setError(null)
    setPending(true)
    const result = await logoutUser()
    if (result.ok) {
      /**
       * TELJES oldalletöltés a kezdőlapra, három okból:
       *
       * 1. A fejléc a KÖZÖS layoutban ül, és a hitelesítési állapotot a SZERVER
       *    állítja elő (header-user.ts). A kliens-oldali navigáció a közös
       *    layoutot részleges rendereléssel átemeli, tehát a fejléc a régi,
       *    „bejelentkezett" alakjában maradna.
       * 2. A kilépésnek MINDEN, sessionhöz kötött kliens-állapotot el kell
       *    dobnia (React-állapot, memóriabeli gyorsítótárak, analitikai
       *    azonosítás). Ezt csak új dokumentum-betöltés garantálja.
       * 3. A BELÉPÉS ugyanígy működik a repóban (LoginForm:
       *    `window.location.href = …`), tehát a két irány szimmetrikus.
       *
       * A kezdőlap a cél, mert a védett oldalak (/kurzusaim, /fiok) kilépve a
       * /belepes-re dobnának, ami kilépés után zavaró volna.
       *
       * A `useRouter()` szándékosan NEM szerepel itt: attól a komponens csak
       * felcsatolt app-routerrel renderelne, és a repó nav-tesztjei
       * (nav-submenu-ui.test.tsx, fejlec-belepes-ui.test.tsx) épp a
       * szerver-renderelt kimenetet mérik `renderToStaticMarkup`-pel.
       *
       * Az alábbi szabály a lassabb, teljes betöltés ellen szól — itt viszont a
       * teljes betöltés a SZÁNDÉK (2. pont), ezért pontosan erre az egy sorra
       * kikapcsolva, indoklással.
       */
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/'
      return
    }
    setPending(false)
    setError(result.message ?? null)
  }

  const base = variant === 'header' ? 'kc-account-nav' : 'kc-account-nav kc-account-nav--drawer'

  if (!signedIn) {
    return (
      <div className={base}>
        <Link className="kc-account-nav__link" href="/belepes" onClick={onNavigate}>
          {ACCOUNT_NAV_LABELS.signIn}
        </Link>
      </div>
    )
  }

  return (
    <div className={base}>
      <Link className="kc-account-nav__link" href="/kurzusaim" onClick={onNavigate}>
        {ACCOUNT_NAV_LABELS.myCourses}
      </Link>
      <button
        aria-busy={pending}
        className="kc-account-nav__signout"
        disabled={pending}
        onClick={handleSignOut}
        type="button"
      >
        {pending ? ACCOUNT_NAV_LABELS.signOutPending : ACCOUNT_NAV_LABELS.signOut}
      </button>
      {error === null ? null : (
        <p aria-live="assertive" className="kc-account-nav__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
