import { describe, expect, it } from 'vitest'

import {
  CTA_PROGRESS_LABELS,
  CTA_VOCABULARY,
  ctaEntry,
  type CtaAction,
} from '@/lib/cta-vocabulary'

import {
  BEJARASI_GYOKEREK,
  KIHAGYOTT_RESZFAK,
  gyujtsCtaFeliratokat,
  type CtaTalalat,
} from './helpers/cta-forras'
import { BARE_FORBIDDEN_LABELS, EM_DASH, EN_DASH, pusztaAlak } from './helpers/cta-mikroszoveg'

/**
 * G-UI2 — CTA-ŐR A TERMÉKEN (`docs/ui-sztenderdek.md` §3.2, §6.3).
 *
 * ═══ MIÉRT KELLETT MEGÍRNI ═══
 * A G-UI1 őr (`cta-vocabulary-guard.test.ts`) HÁROM fájlt olvas:
 * `src/lib/cta-vocabulary.ts`, `docs/ui-sztenderdek.md`, `docs/gomb-inventar.md`.
 * Egyetlen komponenst sem. Vagyis azt bizonyítja, hogy a szótár egyezik
 * önmagával — a felületről semmit nem mond.
 *
 * MUTÁCIÓS BIZONYÍTÉK (2026-08-17, futtatva): a `CartView.tsx` és a
 * `ThankYouView.tsx` gombfeliratát elrontva a TELJES tesztkészlet zöld maradt.
 * Következmény: a felületen ma 67 olyan felirat él, amely nem a jóváhagyott
 * §3.2 szótárból való — köztük a `Tovább a penztárhoz` elgépelés, amelyet a
 * `docs/gomb-inventar.md` 2026-08-16 óta névvel rögzít, mégsem tört meg tőle
 * semmi.
 *
 * Ez az őr a hiányzó felet adja: a TERMÉK forrásából olvassa ki a vevőnek
 * megjelenő cselekvés-feliratokat (a bejáró:
 * `src/__tests__/helpers/cta-forras.ts`), és négy dolgot állít:
 *
 *   1. minden élő felirat VAGY a §3.2 szótárból való, VAGY rajta van az
 *      indoklással ellátott kivétel-listán;
 *   2. egy cselekvés-célhoz (`href`) EGY felirat tartozik
 *      (WCAG 2.2 · 3.2.4 Consistent Identification);
 *   3. nincs puszta („Tovább…", „Küldés", „Bővebben"…) felirat — M-7;
 *   4. nincs kvirtmínusz/gondolatjel a vevői feliratokban — §3.1.1–3.1.2.
 *
 * ═══ MIÉRT VAN KIVÉTEL-LISTA, ÉS MIÉRT NEM SZŐNYEG ALÁ SÖPRÉS ═══
 * A 67 eltérés javítása VEVŐI SZÖVEG: tulajdonosi jóváhagyást kér, nem
 * mérnöki döntés. Az őr ezért a MAI állapotot rögzíti, soronként egy mondat
 * indoklással. Így ZÖLDEN indul, de ÚJ eltérést nem enged be — és a lista
 * három szabály miatt csak CSÖKKENHET:
 *
 *   - minden kivétel-sornak ÉLNIE kell (ha a felirat eltűnt vagy megjavult, a
 *     sor elavul, és az őr hangosan kéri a törlését);
 *   - a `szotartol-elter` sorok KÖTELEZŐEN megnevezik, melyik §3.2 sorra
 *     kellene vezetni őket — a lista tehát MUNKALISTA, nem mentesítés;
 *   - a lista mérete felső korláttal van rögzítve (`KIVETEL_LISTA_FELSO_KORLAT`),
 *     amelyet csak lefelé szabad átírni.
 *
 * ═══ MIT NEM CSINÁL EZ AZ ŐR ═══
 * Nem javít feliratot, és nem dönt el tervezési kérdést. A CMS-ből felülírható
 * CTA-kat (ahol a szerkesztő mezője legyőzi a kódot, tehát a kódbeli javítás
 * élesben hatástalan) felderíti és jelenti, de nem nyúl hozzájuk: hogy a kód
 * nyerjen-e a szótári cselekvéseknél, tulajdonosi döntés.
 */

const { talalatok, dinamikusHelyek, bejartFajlok, kihagyottFajlok } = gyujtsCtaFeliratokat()

/** A ZÁRT L-1 folyamatban-lista feliratai (P-1d: rendszerállapot, nem cselekvés). */
const L1_FELIRATOK: ReadonlySet<string> = new Set<string>(Object.values(CTA_PROGRESS_LABELS))

/** A §3.2 szótár + a zárt L-1 folyamatban-lista — ezek a jóváhagyott feliratok. */
const JOVAHAGYOTT_FELIRATOK: ReadonlySet<string> = new Set<string>([
  ...CTA_VOCABULARY.map((entry) => entry.label),
  ...Object.values(CTA_PROGRESS_LABELS),
])

/**
 * A kivétel-sor kategóriája. A kategória nem dísz: eldönti, milyen további
 * bizonyítást kér az őr a sortól.
 */
type KivetelKategoria =
  /** Van rá §3.2 sor, a felirat mégis más. KÖTELEZŐ megnevezni a célzott sort. */
  | 'szotartol-elter'
  /** A §3.2 MINTÁZAT-sorának (C-6) alakját követi; a mintázat-illesztés még nincs kódban. */
  | 'mintazat-jelolt'
  /** Valódi cselekvés, de a §3.2-ben nincs rá sor — a szótár bővítése tervezési kérdés. */
  | 'nincs-szotari-sor'
  /** Nem cselekvés-felirat: menücímke, morzsa, folyószövegbe ágyazott hivatkozás, logó, cím. */
  | 'nem-cta'

interface FeliratKivetel {
  /** A vevőnek megjelenő felirat, bitre. */
  readonly felirat: string
  /** A `src/`-hez képest relatív fájl — ugyanaz a felirat máshol MÁS elbírálást kaphat. */
  readonly fajl: string
  readonly kategoria: KivetelKategoria
  /** `szotartol-elter` és `mintazat-jelolt` esetén kötelező: melyik §3.2 sorra kell vezetni. */
  readonly celzottAkcio?: CtaAction
  /** Egy mondat, amiért ma még így áll. Üresen hagyni nem lehet — az őr méri. */
  readonly indok: string
}

/** A 2026-08-16-i, párhuzamosan javítás alatt álló fájlokra közös megjegyzés. */
const PARHUZAMOS =
  'A 2026-08-17-i körben MÁSIK ügynök birtokolja ezt a fájlt: ha a sor elavulttá vált, a javítás megtörtént — töröld ezt a sort.'

/**
 * A MAI ÁLLAPOT, soronként indokolva (2026-08-17-i audit).
 *
 * A sorrend: előbb a szótártól eltérő valódi CTA-k (ez a munkalista), utána a
 * mintázat-jelöltek, a szótári sor nélküli cselekvések, végül a nem-CTA
 * feliratok. A `fajl` mező a `src/`-hez képest relatív, sorszám NÉLKÜL: egy
 * fölötte beszúrt sor ne buktassa a listát.
 */
const FELIRAT_KIVETELEK: readonly FeliratKivetel[] = [
  // ── 1. SZÓTÁRTÓL ELTÉRŐ CTA-k — a javítandók listája ───────────────────────
  {
    felirat: 'Belépés a fizetéshez',
    fajl: 'components/checkout/CartView.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'sign-in',
    indok: `A §3.2 #5 szerint a belépés felirata „Belépés"; a cél megnevezése a környező szövegbe való. ${PARHUZAMOS}`,
  },
  {
    felirat: 'Tovább a kurzusaimhoz',
    fajl: 'components/checkout/ThankYouView.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'my-courses-open',
    indok:
      'Puszta „Tovább"-bal kezd (M-7), és ugyanabban a komponensben a /kurzusaim cél MÁSIK feliratot is kap — a §3.2 #9 szerint „Nyisd meg a kurzusaidat".',
  },
  {
    felirat: 'Nézd meg a kurzusaimat',
    fajl: 'components/checkout/ThankYouView.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'my-courses-open',
    indok:
      'A „Tovább a kurzusaimhoz" párja UGYANEBBEN a komponensben, ugyanarra a /kurzusaim célra — WCAG 2.2 · 3.2.4 sértés; a §3.2 #9 az egyetlen jóváhagyott alak.',
  },
  {
    felirat: 'Kurzusaim',
    fajl: 'components/checkout/ThankYouView.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'my-courses-open',
    indok:
      'A köszönőoldal HÁROM gombja főnévi címkével visz a /kurzusaim-ra, miközben ugyanott két másik felirat is ugyanoda mutat; a §3.2 #9 az egyetlen jóváhagyott alak.',
  },
  {
    felirat: 'Nézd meg a kurzusainkat',
    fajl: 'components/account/AccountView.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-list-open',
    indok:
      'Birtokos alak a §3.2 #10 „Nézd meg a kurzusokat" helyett; a kettő ugyanarra a célra két felirat (WCAG 2.2 · 3.2.4).',
  },
  {
    felirat: 'Számla letöltése',
    fajl: 'components/account/AccountView.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'invoice-download',
    indok:
      'Főnévi alak a §3.2 #14 „Letöltöm a számlát" helyett; a letöltés a látogató gépén hoz létre fájlt, tehát P-1a → E/1.',
  },
  {
    felirat: 'Megveszem',
    fajl: 'lib/courses.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-buy',
    indok:
      'A `resolveCourseCta` állapotgépe tárgy nélküli feliratot ad; a §3.2 #1 szerint „Megveszem a kurzust" (Carbon/Polaris {ige}+{főnév}).',
  },
  {
    felirat: 'Ingyenes — azonnal eléred',
    fajl: 'lib/courses.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'free-course-claim',
    indok:
      'Háromszorosan hibás: nem ige, U+2014-et használ elválasztóként (§3.1.1), és ígéretet tesz (M-8); a §3.2 #3 szerint „Elindítom ingyen".',
  },
  {
    felirat: 'Tovább a kurzusaimhoz',
    fajl: 'lib/courses.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'my-courses-open',
    indok:
      'A megvásárolt kurzus CTA-ja puszta „Tovább"-bal kezd (M-7); a §3.2 #9 szerint „Nyisd meg a kurzusaidat".',
  },
  {
    felirat: 'Elfogadom',
    fajl: 'components/analytics/ConsentBanner.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'consent-accept-all',
    indok:
      'A §3.2 #18 szerint „Elfogadom mindet" — a mai felirat nem mondja meg, mire vonatkozik az elfogadás (NN/g „Substantial").',
  },
  {
    felirat: 'Elutasítom',
    fajl: 'components/analytics/ConsentBanner.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'consent-essential-only',
    indok:
      'A §3.2 #18 szerint „Csak a szükségeseket" — a szükséges sütik nem utasíthatók el, tehát a mai felirat félrevezet.',
  },
  {
    felirat: 'Megrendelés és fizetés',
    fajl: 'components/checkout/CheckoutForm.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'checkout-submit',
    indok:
      'Főnévi alak a §3.2 #2 „Megrendelem és fizetek" helyett; a visszavonhatatlan lépés P-1a → E/1 (a régi oldal szava: MEGRENDELEM).',
  },
  {
    felirat: 'Üzenet küldése',
    fajl: 'app/(frontend)/kapcsolat/_components/ContactForm.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'contact-submit',
    indok:
      'Főnévi alak a §3.2 #12 „Elküldöm az üzenetet" helyett; a régi oldal kapcsolat-űrlapján szó szerint ELKÜLDÖM állt.',
  },
  {
    felirat: 'Visszaállító link küldése',
    fajl: 'components/auth/ForgotPasswordForm.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'password-reset-request',
    indok: 'Főnévi alak a §3.2 #21 „Kérem a visszaállító linket" helyett (e-mail indul → E/1).',
  },
  {
    felirat: 'Jelszó beállítása',
    fajl: 'components/auth/ResetPasswordForm.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'password-reset-set',
    indok: 'Főnévi alak a §3.2 #22 „Beállítom az új jelszót" helyett (a fiók megváltozik → E/1).',
  },
  {
    felirat: 'Beállítás…',
    fajl: 'components/auth/ResetPasswordForm.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'password-reset-set',
    indok:
      'A folyamatban-felirat nincs a ZÁRT L-1 listán; a §3.2 #22 `progress` mezője szerint `Mentés…` jár ide (a Polaris a szinonimák felszámolását írja elő).',
  },
  {
    felirat: 'Lépj be',
    fajl: 'app/(frontend)/regisztracio/page.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'sign-in',
    indok: 'A §3.2 #5 szerint a belépés felirata mindenütt „Belépés" (P-1c, bevett egyszavas címke).',
  },
  {
    felirat: 'Regisztrálj',
    fajl: 'app/(frontend)/belepes/page.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'sign-up',
    indok: 'A §3.2 #6 szerint a regisztráció felirata mindenütt „Regisztráció" (a nav-menü is így nevezi).',
  },
  {
    felirat: 'Próbáld újra',
    fajl: 'app/(frontend)/error.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'retry',
    indok: 'A §3.2 #17 szerint „Újrapróbálom" — ma három alak él ugyanerre a cselekvésre.',
  },
  {
    felirat: 'Újratöltés folyamatban…',
    fajl: 'app/(frontend)/error.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'retry',
    indok: 'A folyamatban-felirat nincs a ZÁRT L-1 listán; oda a `Betöltés…` való (P-1d).',
  },
  {
    felirat: 'Próbáld újra',
    fajl: 'app/global-error.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'retry',
    indok: 'A §3.2 #17 szerint „Újrapróbálom"; a globális hibaoldal ugyanazt a cselekvést kínálja.',
  },
  {
    felirat: 'Újrapróbálom a fizetést',
    fajl: 'app/(frontend)/sikertelen/page.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'retry',
    indok:
      'A §3.2 #17 `patterned: false`, tehát a tárgy nem cserélhető; a cél megnevezése a hozzáférhető névbe való (WCAG 2.5.3).',
  },
  {
    felirat: 'Kezdés',
    fajl: 'components/account/course-list-order.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-start',
    indok: 'A kurzuskártya CTA-ja; a §3.2 #8 szerint „Kezdd el a kurzust" (P-1b, tárgy kötelező).',
  },
  {
    felirat: 'Folytatás',
    fajl: 'components/account/course-list-order.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-continue',
    indok: 'A §3.2 #7 szerint „Folytasd a kurzust"; a puszta főnév nem „Substantial" (NN/g).',
  },
  {
    felirat: 'A kurzus megnyitása',
    fajl: 'components/account/course-list-order.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-start',
    indok:
      'Tananyag nélküli kurzus megnyitása — ugyanaz a cselekvés, mint a §3.2 #8, csak főnévi alakban és harmadik feliratként.',
  },
  {
    felirat: 'Kurzusok megnézése',
    fajl: 'components/account/course-list-order.ts',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-list-open',
    indok: 'Az üres kurzuslista CTA-ja; a §3.2 #10 szerint „Nézd meg a kurzusokat".',
  },
  {
    felirat: 'Kurzusok megnézése',
    fajl: 'components/account/CourseList.tsx',
    kategoria: 'szotartol-elter',
    celzottAkcio: 'course-list-open',
    indok: 'Az `EMPTY_CTA_LABEL` hívóhelye; a §3.2 #10 szerint „Nézd meg a kurzusokat".',
  },

  // ── 2. MINTÁZAT-JELÖLTEK (§3.2 C-6) ───────────────────────────────────────
  // A §3.2 #15 `patterned: true`: a `Vissza a <hova>` alak a TÁRGY cseréjével
  // is jóváhagyott (WCAG 2.2 · 3.2.4 kifejezetten megengedi: „Go to page 4" /
  // „Go to page 5"). A mintázat-illesztés viszont a szótárban NINCS
  // megfogalmazva — a szabály alakját (mi a rögzített előtag, mi cserélhető)
  // tervezői döntés kimondani. NYITOTT KÉRDÉS a vezetőnek; addig kivétel.
  {
    felirat: 'Vissza a kezdőlapra',
    fajl: 'app/(frontend)/error.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 `Vissza a <hova>` mintázatának alakja; a mintázat-illesztés kódban még nincs kimondva.',
  },
  {
    felirat: 'Vissza a kezdőlapra',
    fajl: 'app/(frontend)/kapcsolat/_components/ContactForm.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 mintázatának alakja a kapcsolat-űrlap sikeres beküldése után.',
  },
  {
    felirat: 'Vissza a kezdőlapra',
    fajl: 'app/global-error.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 mintázatának alakja a globális hibaoldalon.',
  },
  {
    felirat: 'Vissza a kezdőlapra',
    fajl: 'components/checkout/ThankYouView.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 mintázatának alakja a köszönőoldal másodlagos gombján.',
  },
  {
    felirat: 'Vissza a kezdőlapra',
    fajl: 'components/error/NotFoundView.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 mintázatának alakja a 404-oldal másodlagos gombján.',
  },
  {
    felirat: 'Vissza a kezdőlapra',
    fajl: 'components/error/not-found-content.ts',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A 404-oldal szövegmodulja — a `NotFoundView` gombjának forrása, ugyanaz a mintázat.',
  },
  {
    felirat: 'Vissza a belépéshez',
    fajl: 'app/(frontend)/elfelejtett-jelszo/page.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 `Vissza a <hova>` mintázatának alakja a jelszó-visszaállító lapon.',
  },
  {
    felirat: 'Vissza a kurzusaimhoz',
    fajl: 'components/account/CoursePlayer.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok:
      'A §3.2 #15 mintázatának alakja a lejátszó kapu-állapotaiban; a #9 („Nyisd meg a kurzusaidat") NAVIGÁCIÓS, ez VISSZA-lépés.',
  },
  {
    felirat: 'Vissza a Tudástárba',
    fajl: 'components/content/PostsEmptyState.tsx',
    kategoria: 'mintazat-jelolt',
    celzottAkcio: 'back-to-courses',
    indok: 'A §3.2 #15 mintázatának alakja az üres tudástár-lista visszalépő gombján.',
  },

  // ── 3. NINCS §3.2 SOR — a szótár bővítése tervezési kérdés ────────────────
  {
    felirat: 'A kurzus megtekintése',
    fajl: 'components/account/CoursePlayer.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'Lejárt/hiányzó hozzáférésnél a kurzus ÉRTÉKESÍTŐ oldalára visz; a §3.2-ben nincs sor a „vissza a kurzusoldalra" cselekvésre.',
  },
  {
    felirat: 'A kurzus megtekintése',
    fajl: 'components/account/course-list-order.ts',
    kategoria: 'nincs-szotari-sor',
    indok: 'A lejárt hozzáférésű kurzuskártya CTA-ja; ugyanaz a cselekvés, mint a lejátszó kapujában.',
  },
  {
    felirat: 'Újranézés',
    fajl: 'components/account/course-list-order.ts',
    kategoria: 'nincs-szotari-sor',
    indok:
      'Befejezett kurzus újranézése; a §3.2 #7 (folytatás) és #8 (kezdés) egyike sem ez, külön sort kér.',
  },
  {
    felirat: 'Kurzus befejezése',
    fajl: 'components/account/player/navigation.ts',
    kategoria: 'nincs-szotari-sor',
    indok: 'A lejátszó záró lépése (az utolsó lecke után); a §3.2-ben nincs rá sor.',
  },
  {
    felirat: 'Mentés',
    fajl: 'components/account/AccountView.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A fiókadatok mentése; a §3.2-ben nincs sor a profil-mentésre (a L-1 `Mentés…` viszont már itt fut).',
  },
  {
    felirat: 'Kijelentkezés',
    fajl: 'components/layout/AccountNav.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A §3.2-ben nincs kijelentkezés-sor, pedig a #5 (belépés) párja volna.',
  },
  {
    felirat: 'Kijelentkezés…',
    fajl: 'components/layout/AccountNav.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A kijelentkezés folyamatban-felirata; a ZÁRT L-1 listán sincs rá kulcs.',
  },
  {
    felirat: 'Hozzáférés megnyitása',
    fajl: 'components/checkout/CheckoutForm.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'A pénztár INGYENES ága; a §3.2 #2 a fizetésre szól, a #26 az ingyenes ŰRLAP beküldésére — erre az ágra nincs sor.',
  },
  {
    felirat: 'Megnézem a programot',
    fajl: 'components/content/ProductCard.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'A kurzuskártya alapértelmezett CTA-felirata; a §3.2 #11 szerint a kártyán NINCS gomb (a kártya egésze link) — a felirat megszüntetése tervezési döntés.',
  },
  {
    felirat: 'Ingyenes SOS gyakorlatok',
    fajl: 'components/content/home/HeroCta.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'Lapon belüli ugrás a kezdőlap ingyenes sávjára; a §3.2 #27 a KURZUSOLDAL űrlapjához vivő ugrásra szól, erre nincs sor.',
  },
  {
    felirat: 'Bővebben a szakmai hátterünkről',
    fajl: 'components/content/home/CredentialsStrip.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'A „rólunk" oldalra vivő CTA; a §3.2-ben nincs rá sor. A „Bővebben" itt NEM puszta (M-7): a tárgyat megnevezi.',
  },
  {
    felirat: 'Összes bejegyzés a tudástárban',
    fajl: 'components/content/home/KnowledgeSection.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A tudástár-listára vivő CTA a kezdőlapról; a §3.2-ben nincs tudástár-sor.',
  },
  {
    felirat: 'Kapcsolat',
    fajl: 'components/content/PostsEmptyState.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'Az üres tudástár-lista harmadik ajánlata gombként; a §3.2-ben nincs kapcsolatfelvétel-sor.',
  },
  {
    felirat: 'Kapcsolat',
    fajl: 'app/(frontend)/sikertelen/page.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A sikertelen fizetés utáni segítség-gomb; a §3.2-ben nincs kapcsolatfelvétel-sor.',
  },
  {
    felirat: 'Kapcsolat',
    fajl: 'components/checkout/ThankYouView.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A köszönőoldal hiba-ágának segítség-gombja; a §3.2-ben nincs kapcsolatfelvétel-sor.',
  },
  {
    felirat: 'Segítséget kérek',
    fajl: 'components/checkout/ThankYouView.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'Ugyanarra a /kapcsolat célra MÁSIK felirat ugyanabban a komponensben, mint a „Kapcsolat" — a §3.2 bővítése rendezné.',
  },
  {
    felirat: 'Írj nekünk a kapcsolati oldalon',
    fajl: 'components/courses/FreeCourseRequestForm.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'Az „nincs e-mailem" ág kisegítő hivatkozása; a §3.2-ben nincs kapcsolatfelvétel-sor.',
  },
  {
    felirat: 'Süti-beállítások',
    fajl: 'components/analytics/ConsentSettingsButton.tsx',
    kategoria: 'nincs-szotari-sor',
    indok: 'A süti-sáv újranyitása a láblécből; a §3.2 #18 csak a sáv két gombjáról rendelkezik.',
  },
  {
    felirat: 'Elfelejtetted a jelszavad?',
    fajl: 'app/(frontend)/belepes/page.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'A jelszó-visszaállító lapra vivő LINK; a §3.2 #21 a beküldő gombra szól, a navigációs lépésre nincs sor.',
  },
  {
    felirat: 'Új link kérése',
    fajl: 'app/(frontend)/jelszo-visszaallitas/page.tsx',
    kategoria: 'nincs-szotari-sor',
    indok:
      'Lejárt visszaállító linknél új igénylésre visz; ugyanarra a célra másik felirat, mint a belépőlapon — a §3.2 bővítése rendezné.',
  },

  // ── 4. NEM CTA — menücímke, morzsa, folyószöveg, logó, cím ────────────────
  // A §3.2 N-3 kifejezetten kimondja: a főmenü menüpontjának neve NEM CTA.
  // Ugyanez áll a morzsára, a folyószövegbe ágyazott hivatkozásra, a logóra és
  // az e-mail-címre: ezek nem cselekvésgombok, tehát nem a §3.2 hatálya alá
  // esnek. A puszta („Tovább", „Bővebben"…) és a gondolatjeles feliratok
  // viszont ITT SEM engedettek — arra külön, szűkebb kivétel-lista van.
  {
    felirat: 'Kurzusok',
    fajl: 'components/layout/Header.tsx',
    kategoria: 'nem-cta',
    indok: 'A főmenü menüpontja — a §3.2 #10 kifejezett kivétele („menücímke, nem CTA — N-3").',
  },
  {
    felirat: 'Kurzusok',
    fajl: 'app/(frontend)/kurzusok/[slug]/page.tsx',
    kategoria: 'nem-cta',
    indok: 'Morzsa (breadcrumb) elem a kurzusoldalon — helyjelölő, nem cselekvés.',
  },
  {
    felirat: 'Kurzusaim',
    fajl: 'components/layout/AccountNav.tsx',
    kategoria: 'nem-cta',
    indok: 'A fiókmenü menüpontja — N-3 szerint menücímke, nem CTA.',
  },
  {
    felirat: 'Kurzusaim',
    fajl: 'components/account/CoursePlayer.tsx',
    kategoria: 'nem-cta',
    indok: 'A lejátszó fejlécének morzsa-szerepű vissza-linkje (nyíl + cím), nem cselekvésgomb.',
  },
  {
    felirat: 'Kurzusaim',
    fajl: 'app/(frontend)/kosar/page.tsx',
    kategoria: 'nem-cta',
    indok: `Folyószövegbe ágyazott hivatkozás („a Kurzusaim oldalon éred el"), nem gomb. ${PARHUZAMOS}`,
  },
  {
    felirat: 'Kurzusaim',
    fajl: 'app/(frontend)/penztar/page.tsx',
    kategoria: 'nem-cta',
    indok: `Folyószövegbe ágyazott hivatkozás, nem gomb. ${PARHUZAMOS}`,
  },
  {
    felirat: 'Kapcsolat',
    fajl: 'components/layout/Footer.tsx',
    kategoria: 'nem-cta',
    indok: 'Lábléc-menüpont — N-3 szerint menücímke.',
  },
  {
    felirat: 'Kapcsolat',
    fajl: 'components/error/not-found-content.ts',
    kategoria: 'nem-cta',
    indok: 'A 404-oldal „vagy folytasd innen" cél-listájának menüpontja, nem cselekvésgomb.',
  },
  {
    felirat: 'Tudástár',
    fajl: 'components/error/not-found-content.ts',
    kategoria: 'nem-cta',
    indok:
      'A 404-oldal „vagy folytasd innen" cél-listájának menüpontja — helyjelölő névsor, nem cselekvésgomb.',
  },
  {
    felirat: 'Összes',
    fajl: 'app/(frontend)/kurzusok/page.tsx',
    kategoria: 'nem-cta',
    indok:
      'A kurzuslista kategóriaszűrőjének „minden kategória" címkéje — szűrő-állapot, nem cselekvés-felirat.',
  },
  {
    felirat: 'Összes',
    fajl: 'components/content/CategoryFilter.tsx',
    kategoria: 'nem-cta',
    indok:
      'A tudástár kategóriaszűrőjének „minden kategória" címkéje — szűrő-állapot, nem cselekvés-felirat.',
  },
  {
    felirat: 'Kineti care',
    fajl: 'components/layout/Header.tsx',
    kategoria: 'nem-cta',
    indok: 'A logó szövege (két tipográfiai elemre bontva), nem felirat.',
  },
  {
    felirat: 'Kineti care',
    fajl: 'app/global-not-found.tsx',
    kategoria: 'nem-cta',
    indok: 'A logó szövege a keretek nélküli 404-oldalon.',
  },
  {
    felirat: 'Kineticare kezdőlap',
    fajl: 'components/layout/Header.tsx',
    kategoria: 'nem-cta',
    indok: 'A logó hozzáférhető neve (WCAG 2.2 · 4.1.2), nem látható gombfelirat.',
  },
  {
    felirat: 'Kineticare — kezdőlap',
    fajl: 'app/global-not-found.tsx',
    kategoria: 'nem-cta',
    indok:
      'A logó hozzáférhető neve a 404-oldalon. FIGYELEM: U+2014-et tartalmaz (§3.1.1) — külön kivétel-soron is szerepel.',
  },
  {
    felirat: 'Ugrás a tartalomra',
    fajl: 'app/(frontend)/layout.tsx',
    kategoria: 'nem-cta',
    indok: 'Skip-link (WCAG 2.2 · 2.4.1 Bypass Blocks) — kötelező elem, nem termék-CTA.',
  },
  {
    felirat: 'Ugrás a tartalomra',
    fajl: 'app/global-not-found.tsx',
    kategoria: 'nem-cta',
    indok: 'Skip-link a keretek nélküli 404-oldalon.',
  },
  {
    felirat: 'Menü megnyitása',
    fajl: 'components/layout/MobileNav.tsx',
    kategoria: 'nem-cta',
    indok: 'A mobilmenü kapcsolójának hozzáférhető neve (állapotfüggő), nem termék-CTA.',
  },
  {
    felirat: 'Menü bezárása',
    fajl: 'components/layout/MobileNav.tsx',
    kategoria: 'nem-cta',
    indok: 'A mobilmenü kapcsolójának zárt állapotú hozzáférhető neve.',
  },
  {
    felirat: 'Tananyag bezárása',
    fajl: 'components/account/CoursePlayer.tsx',
    kategoria: 'nem-cta',
    indok: 'A lejátszó tananyag-paneljének bezáró gombja (rejtett szöveg az ikon mellett), felületi kapcsoló.',
  },
  {
    felirat: 'Minden lecke kész',
    fajl: 'components/account/player/navigation.ts',
    kategoria: 'nem-cta',
    indok: 'A lejátszó LETILTOTT gombjának állapotszövege, nem cselekvés (`disabled: true` a mezői közt).',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzat',
    fajl: 'components/layout/Footer.tsx',
    kategoria: 'nem-cta',
    indok: 'Jogi dokumentum hivatkozása a láblécben — dokumentumnév, nem cselekvés.',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzat',
    fajl: 'app/global-not-found.tsx',
    kategoria: 'nem-cta',
    indok: 'Jogi dokumentum hivatkozása a 404-oldal láblécében.',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzat',
    fajl: 'components/blocks/AppointmentForm.tsx',
    kategoria: 'nem-cta',
    indok: 'A hozzájáruló mondat dokumentum-hivatkozása az időpontkérő űrlapon.',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzat',
    fajl: 'components/courses/FreeCourseRequestForm.tsx',
    kategoria: 'nem-cta',
    indok: 'A hozzájáruló mondat dokumentum-hivatkozása az ingyenes kurzus űrlapján.',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzat',
    fajl: 'components/layout/NewsletterForm.tsx',
    kategoria: 'nem-cta',
    indok: 'A hírlevél hozzájáruló mondatának dokumentum-hivatkozása.',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzatban',
    fajl: 'app/(frontend)/kapcsolat/_components/ContactForm.tsx',
    kategoria: 'nem-cta',
    indok: 'Folyószövegbe ragozott dokumentum-hivatkozás a kapcsolat-űrlap alatt.',
  },
  {
    felirat: 'Általános szerződési feltételek',
    fajl: 'components/layout/Footer.tsx',
    kategoria: 'nem-cta',
    indok: 'Jogi dokumentum hivatkozása a láblécben.',
  },
  {
    felirat: 'Általános szerződési feltételek',
    fajl: 'app/global-not-found.tsx',
    kategoria: 'nem-cta',
    indok: 'Jogi dokumentum hivatkozása a 404-oldal láblécében.',
  },
  {
    felirat: 'Általános szerződési feltételek',
    fajl: 'components/checkout/CheckoutForm.tsx',
    kategoria: 'nem-cta',
    indok: 'Az ÁSZF-elfogadó jelölőnégyzet melletti dokumentum-hivatkozás a pénztárban.',
  },
  {
    felirat: 'Impresszum',
    fajl: 'components/layout/Footer.tsx',
    kategoria: 'nem-cta',
    indok: 'Jogi dokumentum menüpontja a láblécben — dokumentumnév, nem cselekvés-felirat.',
  },
  {
    felirat: 'Impresszum',
    fajl: 'app/global-not-found.tsx',
    kategoria: 'nem-cta',
    indok: 'Jogi dokumentum menüpontja a 404-oldal láblécében — dokumentumnév, nem cselekvés.',
  },
  {
    felirat: 'adatvédelmi tájékoztatóban',
    fajl: 'components/analytics/ConsentBanner.tsx',
    kategoria: 'nem-cta',
    indok: 'A süti-sáv magyarázó mondatába ágyazott hivatkozás, nem gomb.',
  },
  {
    felirat: 'be is jelentkezhetsz',
    fajl: 'components/checkout/CheckoutForm.tsx',
    kategoria: 'nem-cta',
    indok: 'Folyószövegbe ágyazott hivatkozás a pénztár magyarázó mondatában.',
  },
  {
    felirat: 'kapcsolati oldalon',
    fajl: 'app/(frontend)/error.tsx',
    kategoria: 'nem-cta',
    indok: 'Folyószövegbe ágyazott hivatkozás a hibaoldal magyarázatában.',
  },
  {
    felirat: 'kapcsolati oldalon',
    fajl: 'app/global-error.tsx',
    kategoria: 'nem-cta',
    indok: 'Folyószövegbe ágyazott hivatkozás a globális hibaoldalon.',
  },
  {
    felirat: 'info@kineticare.hu',
    fajl: 'components/layout/Footer.tsx',
    kategoria: 'nem-cta',
    indok: 'E-mail-cím `mailto:` hivatkozásként — a cím maga a felirat, nem CTA.',
  },
  {
    felirat: 'info@kineticare.hu',
    fajl: 'components/error/NotFoundView.tsx',
    kategoria: 'nem-cta',
    indok: 'E-mail-cím `mailto:` hivatkozásként a 404-oldalon.',
  },
  {
    felirat: 'Általános szerződési feltételeket (új lapon nyílik)',
    fajl: 'components/checkout/CheckoutForm.tsx',
    kategoria: 'nem-cta',
    indok:
      'A pénztári ÁSZF-elfogadó jelölőnégyzet FELIRATÁBA ágyazott jogi hivatkozás, nem cselekvés-gomb: a mondat tárgya, nem CTA. A zárójeles toldat a képernyőolvasónak szóló rejtett figyelmeztetés (WCAG 2.2 · 3.2.5, G201), nem látható felirat.',
  },
  {
    felirat: 'Adatkezelési és adatvédelmi szabályzatot (új lapon nyílik)',
    fajl: 'components/checkout/CheckoutForm.tsx',
    kategoria: 'nem-cta',
    indok:
      'Ugyanannak a jelölőnégyzet-feliratnak a második beágyazott jogi hivatkozása. Az ÁSZF 22. bekezdése EGY jelölőnégyzetet ír le két dokumentumra, ezért a felirat két linket tartalmaz.',
  },
]
/**
 * FELSŐ KORLÁT. A 2026-08-17-i mérés 98 sort talált; ezt a számot csak LEFELÉ
 * szabad átírni. Ha egy javítás elfogyaszt egy sort, a korlát is csökken —
 * így a lista visszahízása külön, látható mozdulatot kíván.
 */
const KIVETEL_LISTA_FELSO_KORLAT = 96

/**
 * A „Tovább…"-tilalom (M-7) MAI sértései. SZŰK lista: az őr megköveteli, hogy
 * minden ide felvett felirat a fő kivétel-listán is szerepeljen, ÉS ott
 * `szotartol-elter` kategóriájú legyen. Ok: egy puszta „Tovább" sosem
 * legitimálható „nem CTA"-ként — legfeljebb elismerhető, hogy még nem javult.
 */
const TOVABB_KIVETELEK: readonly { readonly felirat: string; readonly fajl: string }[] = [
  { felirat: 'Tovább a kurzusaimhoz', fajl: 'components/checkout/ThankYouView.tsx' },
  { felirat: 'Tovább a kurzusaimhoz', fajl: 'lib/courses.ts' },
]

/**
 * A kvirtmínusz/gondolatjel-tilalom (§3.1.1–3.1.2) MAI sértései. Szintén szűk
 * lista, és minden sorának szerepelnie kell a fő kivétel-listán is.
 */
const GONDOLATJEL_KIVETELEK: readonly { readonly felirat: string; readonly fajl: string }[] = [
  { felirat: 'Ingyenes — azonnal eléred', fajl: 'lib/courses.ts' },
  { felirat: 'Kineticare — kezdőlap', fajl: 'app/global-not-found.tsx' },
]

/**
 * WCAG 2.2 · 3.2.4 — MAI cél-ütközések: egy `href`, több felirat.
 *
 * A `nem-cta` besorolású előfordulások NEM számítanak bele: egy morzsa, egy
 * menücímke és egy folyószöveges hivatkozás nem „ugyanaz a komponens" a
 * sikerkritérium értelmében (W3C Understanding SC 3.2.4). Ami itt marad, az
 * valódi, mérhető ütközés.
 *
 * A `feliratok` mező a TELJES mai halmaz — ha akár egy új felirat kerül
 * ugyanarra a célra, az őr kidől.
 */
const HREF_UTKOZES_KIVETELEK: readonly {
  readonly href: string
  readonly feliratok: readonly string[]
  readonly indok: string
}[] = [
  {
    href: '/kurzusaim',
    feliratok: [
      'Ingyenes — azonnal eléred',
      'Kurzusaim',
      'Nézd meg a kurzusaimat',
      'Tovább a kurzusaimhoz',
      'Vissza a kurzusaimhoz',
    ],
    indok:
      'A mért „NÉGY felirat egy célra" hiba (docs/gomb-inventar.md §5) ma is él; a §3.2 #9 az egyetlen jóváhagyott alak, a „Vissza a…" pedig mintázat-jelölt.',
  },
  {
    href: '/kurzusok',
    feliratok: [
      'Kurzusok megnézése',
      'Nézd meg a kurzusainkat',
      'Nézd meg a kurzusokat',
      'Vissza a kurzusokhoz',
    ],
    indok:
      'A mért „NYOLC felirat egy célra" hiba maradéka. A `Nézd meg a kurzusokat` (#10) és a `Vissza a kurzusokhoz` (#15) SZÁNDÉKOSAN két sor: böngészés vs. visszalépés — a többi három javítandó.',
  },
  {
    href: '/kapcsolat',
    feliratok: ['Kapcsolat', 'Segítséget kérek', 'Írj nekünk a kapcsolati oldalon'],
    indok: 'A §3.2-ben nincs kapcsolatfelvétel-sor, ezért három hívóhely három feliratot használ.',
  },
  {
    href: '/belepes',
    feliratok: ['Belépés', 'Vissza a belépéshez'],
    indok: 'A #5 („Belépés") mellett a #15 mintázatának alakja áll a jelszó-visszaállító lapon.',
  },
  {
    href: '/blog',
    feliratok: ['Vissza a Tudástárba', 'Összes bejegyzés a tudástárban'],
    indok: 'A tudástárra nincs §3.2 sor; egy visszalépő és egy böngésző felirat él ugyanarra a célra.',
  },
  {
    href: '/elfelejtett-jelszo',
    feliratok: ['Elfelejtetted a jelszavad?', 'Új link kérése'],
    indok: 'A jelszó-visszaállítás KEZDEMÉNYEZÉSÉRE nincs §3.2 sor, ezért két lap két feliratot használ.',
  },
]

/**
 * CMS-BŐL FELÜLÍRHATÓ CTA-k — a 2026-08-17-i mérés.
 *
 * Itt a kódbeli felirat csak TARTALÉK: ha a szerkesztő kitölti a mezőt, az
 * övé nyer (`cmsErtek?.label?.trim() || KODBELI_FELIRAT`). Következmény: a
 * kódbeli javítás ÉLESBEN HATÁSTALAN lehet, tehát a szótár betartatása
 * önmagában a kódban NEM elég.
 *
 * Ez a lista RÖGZÍTETT: új felülírható hely felvétele tudatos döntés kell
 * legyen (a szerkesztő legyőzheti-e a szótárt?), ezért az őr kidől tőle.
 * A kérdés eldöntése tulajdonosi/vezetői hatáskör — ez az őr csak jelent.
 */
const CMS_FELULIRHATO_HELYEK: readonly { readonly fajl: string; readonly felirat: string }[] = [
  { fajl: 'components/blocks/AppointmentForm.tsx', felirat: 'Időpontot kérek' },
  { fajl: 'components/blocks/AppointmentForm.tsx', felirat: 'Küldés…' },
  { fajl: 'components/content/home/FreeSos.tsx', felirat: 'Elindítom ingyen' },
  { fajl: 'components/content/home/FreeSos.tsx', felirat: 'Nézd meg a kurzusokat' },
]

// ---------------------------------------------------------------------------
// Segédek
// ---------------------------------------------------------------------------

/**
 * Összetett kulcs (felirat + fájl) elválasztója: U+001F (unit separator).
 * Azért nem szóköz, mert a feliratban is van szóköz — így két különböző
 * (felirat, fájl) pár soha nem eshet egybe.
 */
const KULCS_ELVALASZTO = '\u001F'

const kivetelKulcs = (felirat: string, fajl: string): string =>
  `${felirat}${KULCS_ELVALASZTO}${fajl}`

const KIVETEL_INDEX: ReadonlyMap<string, FeliratKivetel> = new Map(
  FELIRAT_KIVETELEK.map((kivetel) => [kivetelKulcs(kivetel.felirat, kivetel.fajl), kivetel]),
)

const kivetelhez = (talalat: CtaTalalat): FeliratKivetel | undefined =>
  KIVETEL_INDEX.get(kivetelKulcs(talalat.felirat, talalat.fajl))

const hely = (talalat: CtaTalalat): string =>
  `${talalat.fajl}:${talalat.sor} — „${talalat.felirat}" (${talalat.forras}/${talalat.elem})`

// ---------------------------------------------------------------------------
// 0. HATÓKÖR — a bejáró ne tudjon némán összemenni
// ---------------------------------------------------------------------------

/**
 * Egy hatókör-szűkítés (egy gyökér elhagyása, egy kihagyó-előtag tágítása) az
 * őrt látszólag zölden hagyná, miközben megszűnne mérni. Ezért a hatókör maga
 * is mért: gyökerek, fájlszám-küszöb és névvel megnevezett őrszem-fájlok.
 */
const ORSZEM_FAJLOK: readonly string[] = [
  'components/checkout/CartView.tsx',
  'components/checkout/ThankYouView.tsx',
  'components/checkout/CheckoutForm.tsx',
  'components/analytics/ConsentBanner.tsx',
  'components/content/home/FreeSos.tsx',
  'components/account/course-list-order.ts',
  'app/(frontend)/penztar/page.tsx',
  'app/(frontend)/kosar/page.tsx',
  'lib/courses.ts',
]

describe('G-UI2 — hatókör: a bejáró tényleg végigméri a felületet', () => {
  it('a bejárási gyökerek halmaza pontosan a rögzített három', () => {
    // Közvetlen hatókör-őr: ha valaki kiveszi az `app`-ot a bejárásból, az őr
    // látszólag zöld maradna, miközben a fél felületet nem méri. Mérve: az
    // `app` elhagyásával hét állítás dől ki, de EZ mondja ki, MI a baj.
    expect([...BEJARASI_GYOKEREK].sort(), 'a bejárás gyökerei megváltoztak').toEqual([
      'app',
      'components',
      'lib',
    ])
  })

  it('mindhárom bejárási gyökér ad fájlt (components, app, lib)', () => {
    const uresGyokerek = BEJARASI_GYOKEREK.filter(
      (gyoker) => !bejartFajlok.some((fajl) => fajl.startsWith(`${gyoker}/`)),
    )
    expect(uresGyokerek, 'olyan bejárási gyökér, amelyből egyetlen fájl sem jött').toEqual([])
  })

  it('a bejárt fájlok száma nem esett a küszöb alá (hatókör-szűkülés elleni őr)', () => {
    // 2026-08-17-i mérés: 303 fájl. A küszöb alatta van, hogy a normál
    // fájltörlés ne buktassa, de egy egész könyvtár elvesztése igen.
    expect(bejartFajlok.length, `bejárt fájlok: ${bejartFajlok.length}`).toBeGreaterThanOrEqual(260)
  })

  it('minden őrszem-fájl bent van a bejárásban', () => {
    const hianyzo = ORSZEM_FAJLOK.filter((fajl) => !bejartFajlok.includes(fajl))
    expect(hianyzo, 'őrszem-fájl kimaradt a bejárásból').toEqual([])
  })

  it('minden kihagyott részfához tartozik valódi fájl (elavult kivétel nem tágíthat)', () => {
    const ureskezu = KIHAGYOTT_RESZFAK.filter(
      ({ eloTag }) => !kihagyottFajlok.some((fajl) => fajl.startsWith(eloTag)),
    ).map(({ eloTag }) => eloTag)
    expect(ureskezu, 'olyan kihagyott részfa, amelyhez egyetlen fájl sem tartozik').toEqual([])
  })

  it('a kiolvasott feliratok száma nem esett a küszöb alá', () => {
    // 2026-08-17-i mérés: 136 találat. Ha az elemző elromlik (pl. egy
    // kifejezés-ág némán dinamikussá válik), ez a szám zuhan.
    expect(talalatok.length, `kiolvasott feliratok: ${talalatok.length}`).toBeGreaterThanOrEqual(115)
  })
})

// ---------------------------------------------------------------------------
// 1. MINDEN ÉLŐ FELIRAT: szótárból vagy kivétellel
// ---------------------------------------------------------------------------

describe('G-UI2 — minden élő felirat a §3.2 szótárból való vagy indokolt kivétel', () => {
  it('nincs számon nem tartott felirat a felületen', () => {
    const ismeretlenek = talalatok
      .filter(
        (talalat) =>
          !JOVAHAGYOTT_FELIRATOK.has(talalat.felirat) && kivetelhez(talalat) === undefined,
      )
      .map(hely)
    expect(
      [...new Set(ismeretlenek)],
      'ÚJ, számon nem tartott felirat. Vagy a §3.2 szótárból vegyél feliratot ' +
        '(`ctaLabel(...)`), vagy — ha tervezési döntést kér — vedd fel a ' +
        'FELIRAT_KIVETELEK listára indoklással, és emeld a felső korlátot csak ' +
        'akkor, ha a vezető jóváhagyta.',
    ).toEqual([])
  })

  it('a kivétel-lista minden sora ÉL (elavult sort törölni kell — a lista csak csökkenhet)', () => {
    const eloKulcsok = new Set(
      talalatok.map((talalat) => kivetelKulcs(talalat.felirat, talalat.fajl)),
    )
    const elavultak = FELIRAT_KIVETELEK.filter(
      (kivetel) => !eloKulcsok.has(kivetelKulcs(kivetel.felirat, kivetel.fajl)),
    ).map((kivetel) => `${kivetel.fajl} — „${kivetel.felirat}" (${kivetel.indok})`)
    expect(
      elavultak,
      'ELAVULT kivétel-sor: a felirat már nem él ezen a helyen. Ez JÓ HÍR — ' +
        'a javítás megtörtént. Töröld a sort a FELIRAT_KIVETELEK listáról, és ' +
        'vidd lejjebb a KIVETEL_LISTA_FELSO_KORLAT értékét.',
    ).toEqual([])
  })

  it('nincs kivétel olyan feliratra, amely már a szótárban van (halott sor)', () => {
    const feleslegesek = FELIRAT_KIVETELEK.filter((kivetel) =>
      JOVAHAGYOTT_FELIRATOK.has(kivetel.felirat),
    ).map((kivetel) => `${kivetel.fajl} — „${kivetel.felirat}"`)
    expect(feleslegesek, 'a §3.2-ben szereplő feliratra nem kell kivétel').toEqual([])
  })

  it(`a kivétel-lista ma ${FELIRAT_KIVETELEK.length} soros, a felső korlát ${KIVETEL_LISTA_FELSO_KORLAT}`, () => {
    expect(
      FELIRAT_KIVETELEK.length,
      `A kivétel-lista MEGNŐTT (${FELIRAT_KIVETELEK.length} > ${KIVETEL_LISTA_FELSO_KORLAT}). ` +
        'A korlátot csak LEFELÉ szabad átírni; a növelés vezetői jóváhagyást kér.',
    ).toBeLessThanOrEqual(KIVETEL_LISTA_FELSO_KORLAT)
  })

  it('nincs két azonos kivétel-sor (felirat + fájl párra pontosan egy)', () => {
    expect(KIVETEL_INDEX.size, 'duplikált kivétel-sor a FELIRAT_KIVETELEK listán').toBe(
      FELIRAT_KIVETELEK.length,
    )
  })
})

// ---------------------------------------------------------------------------
// 2. A KIVÉTEL-LISTA HIGIÉNIÁJA — hogy munkalista maradjon, ne mentesítés
// ---------------------------------------------------------------------------

describe('G-UI2 — a kivétel-lista higiéniája', () => {
  it('minden sornak van érdemi indoklása', () => {
    const gyengek = FELIRAT_KIVETELEK.filter((kivetel) => kivetel.indok.trim().length < 40).map(
      (kivetel) => `${kivetel.fajl} — „${kivetel.felirat}"`,
    )
    expect(gyengek, 'túl rövid (érdemi tartalom nélküli) indoklás').toEqual([])
  })

  it('a „szotartol-elter" sorok megnevezik a §3.2 célsort, és az létezik', () => {
    const hibasak = FELIRAT_KIVETELEK.filter(
      (kivetel) => kivetel.kategoria === 'szotartol-elter',
    ).filter((kivetel) => {
      if (kivetel.celzottAkcio === undefined) return true
      try {
        ctaEntry(kivetel.celzottAkcio)
        return false
      } catch {
        return true
      }
    }).map((kivetel) => `${kivetel.fajl} — „${kivetel.felirat}"`)
    expect(
      hibasak,
      'a szótártól eltérő sornak meg KELL neveznie, melyik §3.2 cselekvésre kell vezetni',
    ).toEqual([])
  })

  it('a „mintazat-jelolt" sorok MINTÁZATOS (§3.2 C-6) szótári sorra hivatkoznak', () => {
    const hibasak = FELIRAT_KIVETELEK.filter((kivetel) => kivetel.kategoria === 'mintazat-jelolt')
      .filter(
        (kivetel) =>
          kivetel.celzottAkcio === undefined || !ctaEntry(kivetel.celzottAkcio).patterned,
      )
      .map((kivetel) => `${kivetel.fajl} — „${kivetel.felirat}"`)
    expect(
      hibasak,
      'mintázat-jelöltnek csak `patterned: true` szótári sorra szabad hivatkoznia',
    ).toEqual([])
  })

  it('a „nem-cta" és a „nincs-szotari-sor" sorok NEM neveznek meg célsort', () => {
    const hibasak = FELIRAT_KIVETELEK.filter(
      (kivetel) =>
        (kivetel.kategoria === 'nem-cta' || kivetel.kategoria === 'nincs-szotari-sor') &&
        kivetel.celzottAkcio !== undefined,
    ).map((kivetel) => `${kivetel.fajl} — „${kivetel.felirat}"`)
    expect(hibasak, 'ezeknél a kategóriáknál a célsor megnevezése ellentmondás').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. M-7 — puszta és „Tovább…" kezdetű feliratok
// ---------------------------------------------------------------------------

describe('G-UI2 — M-7: a felirat mondja meg, mi történik', () => {
  it('egyetlen élő felirat sem puszta tiltott szó (Tovább, Küldés, OK, Bővebben, Részletek…)', () => {
    // A ZÁRT L-1 lista (`Küldés…`, `Mentés…`…) SZÁNDÉKOSAN kimarad: az M-7 a
    // CSELEKVÉS feliratára szól, a folyamatban-felirat viszont RENDSZERÁLLAPOT
    // (P-1d; NN/g 1. heurisztika, WCAG 4.1.3), és a §3.2 jóváhagyta. Enélkül az
    // őr a saját szótárára riasztana — mérve: öt hívóhely `Küldés…` gombján.
    const vetok = talalatok
      .filter((talalat) => !L1_FELIRATOK.has(talalat.felirat))
      .filter((talalat) => BARE_FORBIDDEN_LABELS.includes(pusztaAlak(talalat.felirat)))
      .map(hely)
    expect([...new Set(vetok)], 'puszta, célt nem nevező felirat a felületen').toEqual([])
  })

  it('egyetlen élő felirat sem kezdődik „Tovább"-bal (a mai sértések szűk listán)', () => {
    const engedett = new Set(
      TOVABB_KIVETELEK.map((kivetel) => kivetelKulcs(kivetel.felirat, kivetel.fajl)),
    )
    const vetok = talalatok
      .filter((talalat) => talalat.felirat.toLocaleLowerCase('hu').startsWith('tovább'))
      .filter((talalat) => !engedett.has(kivetelKulcs(talalat.felirat, talalat.fajl)))
      .map(hely)
    expect(
      [...new Set(vetok)],
      'ÚJ „Tovább…" kezdetű felirat. A §3.2 M-7 szerint a puszta „Tovább" nem ' +
        'mondja meg, mi történik — a szótárból válassz feliratot.',
    ).toEqual([])
  })

  it('a „Tovább…" kivételek MIND élnek, és mind elismert szótár-eltérések', () => {
    const eloKulcsok = new Set(
      talalatok.map((talalat) => kivetelKulcs(talalat.felirat, talalat.fajl)),
    )
    const bajok: string[] = []
    for (const kivetel of TOVABB_KIVETELEK) {
      const kulcs = kivetelKulcs(kivetel.felirat, kivetel.fajl)
      if (!eloKulcsok.has(kulcs)) {
        bajok.push(`ELAVULT (megjavult, töröld): ${kivetel.fajl} — „${kivetel.felirat}"`)
        continue
      }
      const fo = KIVETEL_INDEX.get(kulcs)
      if (fo === undefined || fo.kategoria !== 'szotartol-elter') {
        bajok.push(
          `„Tovább…" felirat csak szotartol-elter sorként ismerhető el: ${kivetel.fajl} — „${kivetel.felirat}"`,
        )
      }
    }
    expect(bajok, 'a „Tovább…" kivétel-lista nem áll rendben').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. §3.1.1–3.1.2 — kvirtmínusz és gondolatjel a vevői feliratokban
// ---------------------------------------------------------------------------

describe('G-UI2 — §3.1: nincs kvirtmínusz/gondolatjel a vevői feliratokban', () => {
  it('egyetlen élő felirat sem tartalmaz U+2014-et vagy U+2013-at (a mai kettő szűk listán)', () => {
    const engedett = new Set(
      GONDOLATJEL_KIVETELEK.map((kivetel) => kivetelKulcs(kivetel.felirat, kivetel.fajl)),
    )
    const vetok = talalatok
      .filter(
        (talalat) => talalat.felirat.includes(EM_DASH) || talalat.felirat.includes(EN_DASH),
      )
      .filter((talalat) => !engedett.has(kivetelKulcs(talalat.felirat, talalat.fajl)))
      .map(hely)
    expect(
      [...new Set(vetok)],
      'ÚJ gondolatjeles/kvirtmínuszos vevői felirat. A magyar tipográfiában a ' +
        'kvirtmínusz nem írásjel, gombszövegben a gondolatjel is tiltott (§3.1.1–3.1.2).',
    ).toEqual([])
  })

  it('a gondolatjel-kivételek MIND élnek, és a fő kivétel-listán is rajta vannak', () => {
    const eloKulcsok = new Set(
      talalatok.map((talalat) => kivetelKulcs(talalat.felirat, talalat.fajl)),
    )
    const bajok = GONDOLATJEL_KIVETELEK.flatMap((kivetel) => {
      const kulcs = kivetelKulcs(kivetel.felirat, kivetel.fajl)
      if (!eloKulcsok.has(kulcs)) {
        return [`ELAVULT (megjavult, töröld): ${kivetel.fajl} — „${kivetel.felirat}"`]
      }
      return KIVETEL_INDEX.has(kulcs)
        ? []
        : [`hiányzik a fő kivétel-listáról: ${kivetel.fajl} — „${kivetel.felirat}"`]
    })
    expect(bajok, 'a gondolatjel-kivétel lista nem áll rendben').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 5. WCAG 2.2 · 3.2.4 — egy cél, egy felirat
// ---------------------------------------------------------------------------

/**
 * A cél szerinti csoportosítás. A `nem-cta` besorolású előfordulások kimaradnak:
 * a morzsa, a menücímke és a folyószöveges hivatkozás nem „ugyanaz a
 * komponens" a sikerkritérium értelmében.
 */
function feliratokCelonkent(): ReadonlyMap<string, ReadonlySet<string>> {
  const terkep = new Map<string, Set<string>>()
  for (const talalat of talalatok) {
    if (talalat.href === null) continue
    if (kivetelhez(talalat)?.kategoria === 'nem-cta') continue
    const meglevo = terkep.get(talalat.href) ?? new Set<string>()
    meglevo.add(talalat.felirat)
    terkep.set(talalat.href, meglevo)
  }
  return terkep
}

describe('G-UI2 — WCAG 2.2 · 3.2.4: egy cselekvés-célhoz egy felirat', () => {
  const celonkent = feliratokCelonkent()

  it('nincs olyan cél, amelyre nem rögzített feliratkészlet mutat', () => {
    const kivetelIndex = new Map(
      HREF_UTKOZES_KIVETELEK.map((kivetel) => [kivetel.href, [...kivetel.feliratok].sort()]),
    )
    const bajok: string[] = []
    for (const [href, feliratok] of [...celonkent.entries()].sort()) {
      if (feliratok.size < 2) continue
      const mai = [...feliratok].sort()
      const rogzitett = kivetelIndex.get(href)
      if (rogzitett === undefined) {
        bajok.push(`${href} ← ${mai.join(' | ')} (nincs rögzítve)`)
        continue
      }
      if (rogzitett.join(KULCS_ELVALASZTO) !== mai.join(KULCS_ELVALASZTO)) {
        bajok.push(`${href} ← mai: ${mai.join(' | ')} ; rögzített: ${rogzitett.join(' | ')}`)
      }
    }
    expect(
      bajok,
      'ÚJ vagy megváltozott cél-ütközés: ugyanahhoz a `href`-hez több felirat ' +
        'tartozik (WCAG 2.2 SC 3.2.4 Consistent Identification). Ha egy felirat ' +
        'ELTŰNT a listáról, az javítás — vezesd át a HREF_UTKOZES_KIVETELEK sorát.',
    ).toEqual([])
  })

  it('minden rögzített cél-ütközés ÉL (elavult sort törölni kell)', () => {
    const elavultak = HREF_UTKOZES_KIVETELEK.filter(
      (kivetel) => (celonkent.get(kivetel.href)?.size ?? 0) < 2,
    ).map((kivetel) => kivetel.href)
    expect(elavultak, 'a cél már nem ütközik — töröld a HREF_UTKOZES_KIVETELEK sorát').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. CMS-FELÜLÍRÁS — felderítés és jelentés (javítás NÉLKÜL)
// ---------------------------------------------------------------------------

describe('G-UI2 — CMS-ből felülírható CTA-feliratok (jelentés)', () => {
  const felulirhatoak = talalatok.filter((talalat) => talalat.cmsFelulirhato)

  it(`ma ${new Set(felulirhatoak.map((talalat) => talalat.fajl)).size} komponensben ${felulirhatoak.length} felirat írható felül CMS-ből`, () => {
    const mai = [...new Set(felulirhatoak.map((talalat) => `${talalat.fajl}${KULCS_ELVALASZTO}${talalat.felirat}`))].sort()
    const rogzitett = [
      ...new Set(CMS_FELULIRHATO_HELYEK.map((hely) => `${hely.fajl}${KULCS_ELVALASZTO}${hely.felirat}`)),
    ].sort()
    expect(
      mai.map((sor) => sor.replace(KULCS_ELVALASZTO, ' — ')),
      'A CMS-ből felülírható CTA-k halmaza megváltozott. ÚJ felülírható hely ' +
        'tudatos döntés kell legyen: ott a szerkesztő mezője LEGYŐZI a §3.2 ' +
        'szótárt, tehát a kódbeli javítás élesben hatástalan. A döntés ' +
        '(nyerjen-e a kód) tulajdonosi/vezetői hatáskör — ez az őr csak jelent.',
    ).toEqual(rogzitett.map((sor) => sor.replace(KULCS_ELVALASZTO, ' — ')))
  })

  it('a felülírható helyek feliratai ma a szótárból valók (a tartalék ág rendben van)', () => {
    const rosszTartalek = felulirhatoak
      .filter((talalat) => !JOVAHAGYOTT_FELIRATOK.has(talalat.felirat))
      .map(hely)
    expect(
      [...new Set(rosszTartalek)],
      'a CMS-felülírás TARTALÉK feliratának legalább a kódban a jóváhagyott ' +
        'alaknak kell lennie — különben sem a CMS, sem a kód nem a szótárt követi',
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 7. AMIT A BEJÁRÓ NEM LÁT — a korlát kimondva, nem elhallgatva
// ---------------------------------------------------------------------------

describe('G-UI2 — a bejáró vak foltjai kimondva', () => {
  it(`ma ${dinamikusHelyek.length} olyan hely van, ahol a felirat futásidőben dől el`, () => {
    // Ez NEM hiba, hanem KORLÁT: adatbázisból jövő cím, CMS-mező,
    // `${}`-behelyettesítés statikusan nem oldható fel. A szám azért van
    // állításban, hogy a növekedése látszódjon: minél több a futásidőben
    // eldőlő felirat, annál kevesebbet ér a szótár betartatása a kódban.
    expect(
      dinamikusHelyek.length,
      `Futásidőben eldőlő feliratok: ${dinamikusHelyek.length}. Ha ez a szám ` +
        'megugrott, a felületről feliratok csúsztak át kódon kívülre — ' +
        'ellenőrizd, nem CMS-ből jön-e egy szótári cselekvés felirata.',
    ).toBeLessThanOrEqual(75)
  })
})
