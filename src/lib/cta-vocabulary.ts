/**
 * CTA-szótár – a `docs/ui-sztenderdek.md` §3.2 táblázatának EGYETLEN kódbeli
 * igazságforrása.
 *
 * MIÉRT EZ A FÁJL LÉTEZIK
 * -----------------------
 * A tulajdonos két panasza (2026-08-16) mérhetően igazolódott: ugyanarra a
 * cselekvésre több felirat él a felületen (a „menj a kurzuslistára" cselekvésre
 * NYOLC, a „saját kurzusaidhoz"-ra NÉGY – mérés: `docs/gomb-inventar.md` §5),
 * és az ingyenes kurzuson „Megveszem" áll. Az első WCAG 2.2 **3.2.4 Consistent
 * Identification** sérülés, a második a „link is a promise" elv megszegése
 * (NN/g). Mindkettő ellen ugyanaz a gyógyszer: a feliratok EGY helyen élnek,
 * és őr-teszt (G-UI1) védi őket.
 *
 * A NYELVTANI SZEMÉLY (P-1) – vezetői döntés, 2026-08-16
 * ------------------------------------------------------
 * Normatív forrás: `.claude/skills/termektervezes/SKILL.md` 2. pont; kifejtés:
 * `docs/ui-sztenderdek.md` 1.4/Ü5 és 3.1.5.
 *
 *   - P-1a  a látogató SAJÁT, elkötelező cselekvése (pénz, adat, hozzáférés,
 *           fájl változik)                                    → E/1
 *   - P-1b  puszta navigáció (csak máshol leszek)             → E/2 (tegező)
 *   - P-1c  bevett, egyszavas felületi címke                  → főnévi
 *   - P-1d  folyamatban-felirat (RENDSZERÁLLAPOT, nem a látogató cselekvése,
 *           NN/g 1. heurisztika + WCAG 4.1.3)                 → semleges + „…"
 *
 * A határeset eldöntése egy kérdéssel: a kattintás után változik-e bármi a
 * látogató dolgaiban, vagy csak máshol lesz? Változik → E/1. Csak máshol
 * lesz → E/2. Az elem technikai típusa (gomb vagy link) ezt NEM dönti el.
 *
 * Az E/1 melletti MÉRÉS: a régi `www.kineticare.hu` – amit a meglévő vevők
 * megszoktak – 100%-ban E/1-es gombfeliratokat használt (`KÉREM A PROGRAMOT`,
 * `MEGRENDELEM`, `MEGNÉZEM`, `ELKÜLDÖM`; egyetlen felszólító alak sincs).
 * Mérés: `docs/regi-oldal-osszehasonlitas.md` 3.1 és 3.4. Jakob törvénye (NN/g).
 *
 * HASZNÁLAT
 * ---------
 * Új gombfelirat kitalálása TILOS: előbb a §3.2-t kell bővíteni (forrással),
 * és a bővítés ide is bekerül. A hívóhelyek átírása külön kör – ez a modul
 * jelenleg a szótár igazságforrása, a `resolveCourseCta`, a `CourseCta`, a
 * `CartView` és a `penztar/page.tsx` bevezetése a következő lépés.
 *
 * ŐR: `src/__tests__/cta-vocabulary-guard.test.ts` (G-UI1).
 */

/** Melyik §3.2-beli cselekvésre vonatkozik a bejegyzés. Kulcsonként PONTOSAN egy felirat. */
export type CtaAction =
  | 'course-buy'
  | 'checkout-submit'
  | 'free-course-claim'
  | 'sign-in'
  | 'sign-up'
  | 'course-continue'
  | 'course-start'
  | 'my-courses-open'
  | 'course-list-open'
  | 'contact-submit'
  | 'newsletter-subscribe'
  | 'invoice-download'
  | 'back-to-courses'
  | 'course-unavailable-notice'
  | 'retry'
  | 'consent-accept-all'
  | 'consent-essential-only'
  | 'cart-remove-item'
  | 'cart-to-checkout'
  | 'password-reset-request'
  | 'password-reset-set'
  | 'call-specialist'
  | 'appointment-request-link'
  | 'appointment-submit'

/** A P-1 szabály szerinti nyelvtani alak – auditálható, ezért a szótár tárolja. */
export type CtaPerson =
  /** P-1a – egyes szám első személy: a látogató saját, elkötelező cselekvése. */
  | 'e1'
  /** P-1b – egyes szám második személy (tegező): puszta navigáció. */
  | 'e2'
  /** P-1c – bevett, egyszavas felületi címke főnévi alakban. */
  | 'nominal'
  /** P-1e – magyarázó mondat (nem gomb), tegező. */
  | 'explanatory'

/**
 * Vizuális súly (`docs/ui-sztenderdek.md` §2.2 és C-2: ugyanaz a cselekvés
 * mindenhol ugyanazt a súlyt kapja).
 */
export type CtaWeight = 'primary' | 'secondary' | 'ghost' | 'link' | 'none'

/** A folyamatban-feliratok (L-1) kulcsai. A lista ZÁRT – lásd `CTA_PROGRESS_LABELS`. */
export type CtaProgressKey = 'sign-in' | 'sign-up' | 'send' | 'save' | 'processing' | 'loading'

export interface CtaEntry {
  /** A `docs/ui-sztenderdek.md` §3.2 táblázat sorszáma – a visszakereshetőség miatt kötelező. */
  readonly section: string
  readonly action: CtaAction
  /** A jóváhagyott, látható magyar szöveg. Bitre egyezik a §3.2 „Jóváhagyott felirat" oszlopával. */
  readonly label: string
  readonly person: CtaPerson
  readonly weight: CtaWeight
  /** Melyik L-1 folyamatban-feliratot kapja a gomb küldés közben; `null`, ha nincs ilyen állapota. */
  readonly progress: CtaProgressKey | null
  /**
   * `true`, ha a felirat MINTÁZAT (WCAG 3.2.4 megengedi: „Go to page 4" /
   * „Go to page 5"), tehát a tárgy cserélhető ugyanazzal a szerkezettel.
   * A §3.2 C-6 szabálya.
   */
  readonly patterned: boolean
}

/**
 * A jóváhagyott feliratok. A sorrend a §3.2 táblázatét követi.
 *
 * FONTOS: a §3.2 #11 (kurzuskártya CTA-ja) SZÁNDÉKOSAN hiányzik – ott a
 * jóváhagyott megoldás az, hogy NINCS gomb: a kártya egésze link, a jelölő a
 * cím és a nyíl (NN/g: „don't make nonclickable items look like buttons").
 * Felirat nélküli szabályt nem tárolunk feliratként.
 */
export const CTA_VOCABULARY = [
  {
    // §3.2 #1 – fizetős kurzus vásárlása (kurzusoldal, buybox).
    // E/1: elkötelezés. A tárgy kötelező (Carbon/Polaris {ige}+{főnév};
    // NN/g „Substantial": a felirat a környezete nélkül is legyen érthető).
    section: '#1',
    action: 'course-buy',
    label: 'Megveszem a kurzust',
    person: 'e1',
    weight: 'primary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #2 – a pénztár beküldő gombja. Ez a visszavonhatatlan lépés.
    // GOV.UK: a fizetésre „Pay", a záró lépésre „Confirm and send".
    // Baymard: explicit felirat a homályos „Continue" helyett.
    // A régi oldal szava: MEGRENDELEM. A Barion neve a gomb MELLÉ kerül, nem rá (M-6).
    section: '#2',
    action: 'checkout-submit',
    label: 'Megrendelem és fizetek',
    person: 'e1',
    weight: 'primary',
    progress: 'processing',
    patterned: false,
  },
  {
    // §3.2 #3 és #4 – ingyenes kurzus igénylése (kurzusoldal ÉS kezdőlapi sáv).
    // EGY cselekvés, EGY felirat (WCAG 3.2.4) – ezért egyetlen bejegyzés.
    // A mai „Ingyenes — azonnal eléred" háromszorosan hibás: nem ige, U+2014-et
    // használ elválasztóként (§3.1.1), és ígéretet tesz (M-8).
    // Az ingyenesség BADGE-ként jelenik meg, nem a gombban.
    section: '#3, #4',
    action: 'free-course-claim',
    label: 'Elindítom ingyen',
    person: 'e1',
    weight: 'secondary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #5 – belépés. P-1c: bevett, egyszavas címke.
    // Carbon és Polaris ugyanígy mentesíti a rövid parancsokat (Done, Close, Cancel).
    section: '#5',
    action: 'sign-in',
    label: 'Belépés',
    person: 'nominal',
    weight: 'primary',
    progress: 'sign-in',
    patterned: false,
  },
  {
    // §3.2 #6 – regisztráció. P-1c, a #5 párja: a nav-menü is így nevezi,
    // tehát a menüpont és a beküldő gomb ugyanazt mondja (WCAG 3.2.4).
    section: '#6',
    action: 'sign-up',
    label: 'Regisztráció',
    person: 'nominal',
    weight: 'primary',
    progress: 'sign-up',
    patterned: false,
  },
  {
    // §3.2 #7 – megkezdett kurzus folytatása. P-1b: a lejátszó megnyílik,
    // semmi nem változik. A folytatás ≠ indítás, ezért külön felirat.
    section: '#7',
    action: 'course-continue',
    label: 'Folytasd a kurzust',
    person: 'e2',
    weight: 'primary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #8 – még el nem kezdett, de már MEGLÉVŐ kurzus megnyitása.
    // Megkülönböztetendő a #3-tól: ott a hozzáférés keletkezik (E/1),
    // itt a meglévő kurzus nyílik meg (E/2).
    section: '#8',
    action: 'course-start',
    label: 'Kezdd el a kurzust',
    person: 'e2',
    weight: 'primary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #9 – a saját kurzusok listájára. Ma NÉGY felirat él erre.
    // „Ugorj" helyett „Nyisd meg": az „Ugrás" szót a skip-link foglalja
    // („Ugrás a tartalomra"), és a C-4 szerint egy szó egy jelentés.
    section: '#9',
    action: 'my-courses-open',
    label: 'Nyisd meg a kurzusaidat',
    person: 'e2',
    weight: 'secondary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #10 – a kurzuskínálatra. Ma NYOLC felirat él erre (A/6).
    // Kivétel: a főmenü menüpontjának neve marad „Kurzusok" (menücímke, nem CTA – N-3).
    section: '#10',
    action: 'course-list-open',
    label: 'Nézd meg a kurzusokat',
    person: 'e2',
    weight: 'primary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #12 – kapcsolat-űrlap beküldése. E/1: adat megy el.
    // A régi oldal kapcsolat-űrlapján szó szerint ELKÜLDÖM állt (mérve).
    // A puszta „Küldés"/„Submit" tiltott (Atlassian).
    section: '#12',
    action: 'contact-submit',
    label: 'Elküldöm az üzenetet',
    person: 'e1',
    weight: 'primary',
    progress: 'send',
    patterned: false,
  },
  {
    // §3.2 #13 – hírlevél-feliratkozás. A SKILL.md 2. pontjának szó szerinti példája.
    // Egyszavas, de nem „puszta": önmagában megmondja, mi történik.
    section: '#13',
    action: 'newsletter-subscribe',
    label: 'Feliratkozom',
    person: 'e1',
    weight: 'secondary',
    progress: 'send',
    patterned: false,
  },
  {
    // §3.2 #14 – letöltés. E/1: fájl kerül a látogató gépére.
    // MINTÁZAT (C-6): `Letöltöm a <mit>` – pl. „Letöltöm az igazolást".
    // A fájl megnevezése kötelező (NN/g „Substantial").
    section: '#14',
    action: 'invoice-download',
    label: 'Letöltöm a számlát',
    person: 'e1',
    weight: 'secondary',
    progress: null,
    patterned: true,
  },
  {
    // §3.2 #15 – vissza-navigáció. MINTÁZAT (C-6): `Vissza a <hova>`.
    // A puszta „Vissza" nem „Substantial" (NN/g 4 S).
    section: '#15',
    action: 'back-to-courses',
    label: 'Vissza a kurzusokhoz',
    person: 'e2',
    weight: 'ghost',
    progress: null,
    patterned: true,
  },
  {
    // §3.2 #16 – archivált / nem elérhető termék. NINCS GOMB, csak ez a mondat.
    // GOV.UK: „Disabled buttons have poor contrast and can confuse some users,
    // so avoid them if possible." A mai kód szürke, letiltott „Megveszem"-et
    // rajzol – hamis ígéret (NN/g: a link ígéret). → A/1.
    section: '#16',
    action: 'course-unavailable-notice',
    label: 'Ez a kurzus jelenleg nem vásárolható meg.',
    person: 'explanatory',
    weight: 'none',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #17 – újrapróbálkozás hiba után. Ma HÁROM alak él.
    // Ahol több újrapróbálható dolog van egy képernyőn, a cél a HOZZÁFÉRHETŐ
    // NÉVBE kerül rejtett szöveggel (WCAG 2.5.3), nem a látható feliratba.
    section: '#17',
    action: 'retry',
    label: 'Újrapróbálom',
    person: 'e1',
    weight: 'secondary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #18 – süti-sáv, elfogadó ág. A két gomb AZONOS SÚLYÚ (nem dark pattern).
    section: '#18',
    action: 'consent-accept-all',
    label: 'Elfogadom mindet',
    person: 'e1',
    weight: 'secondary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #18 – süti-sáv, elutasító ág. Elliptikus: az igét („fogadom el") az
    // első tagból veszi át, így a két gomb hossza és súlya is azonos marad.
    section: '#18',
    action: 'consent-essential-only',
    label: 'Csak a szükségeseket',
    person: 'e1',
    weight: 'secondary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #19 (ÚJ) – tétel kivétele a kosárból.
    // MIÉRT NEM „Törlés": Carbon szerint a remove ≠ delete – „Deletion is the
    // most common type of removal and is destructive" –, és a helyreállítható
    // műveletre a remove alak való. A kosárból kivett tétel nem semmisül meg.
    // A tétel neve a hozzáférhető névbe kerül (több tételnél a puszta felirat
    // nem egyedi – WCAG 2.4.4).
    section: '#19',
    action: 'cart-remove-item',
    label: 'Kiveszem a kosárból',
    person: 'e1',
    weight: 'ghost',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #20 (ÚJ) – kosárból a pénztárba. P-1b: itt még semmi nem történik,
    // a vállalás a #2 gombnál van. A mai „Tovább a penztárhoz" puszta
    // „Tovább"-bal kezd (M-7) ÉS el van gépelve.
    section: '#20',
    action: 'cart-to-checkout',
    label: 'Menj a pénztárhoz',
    person: 'e2',
    weight: 'primary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #21 (ÚJ) – jelszó-visszaállító link kérése. E/1: e-mail indul.
    // A régi oldal ugyanezt a szerkezetet használta: KÉREM A PROGRAMOT,
    // KÉREM A HOZZÁFÉRÉST, KÉREM AZ ÉRTESÍTÉST (mérve).
    // FIGYELEM: ez az E/1-es „kérem" ige, NEM a §2.7-ben tiltott „Kérjük".
    section: '#21',
    action: 'password-reset-request',
    label: 'Kérem a visszaállító linket',
    person: 'e1',
    weight: 'primary',
    progress: 'send',
    patterned: false,
  },
  {
    // §3.2 #22 (ÚJ) – új jelszó beállítása. A fiók megváltozik → E/1, ige + tárgy.
    // A folyamatban-felirat `Mentés…` (nem „Beállítás…"): a Polaris kimondja,
    // hogy a szinonimákat fel kell számolni, és a /fiok mentése is ezt írja.
    section: '#22',
    action: 'password-reset-set',
    label: 'Beállítom az új jelszót',
    person: 'e1',
    weight: 'primary',
    progress: 'save',
    patterned: false,
  },
  {
    // §3.2 #23 (ÚJ) – közvetlen telefonhívás a szakemberhez (`tel:` hivatkozás).
    // MINTÁZAT (C-6): `Hívd <Nevet>` – a név nélkül két szakembernél a felirat
    // nem egyedi (WCAG 2.4.4), és a képernyőolvasós link-listában sem lenne az.
    // P-1b → E/2: a hívás a telefon-alkalmazásnak adja át a látogatót, a
    // Kineticare-nél tárolt dolgaiban semmi nem változik (nincs foglalás).
    section: '#23',
    action: 'call-specialist',
    label: 'Hívd Kocsis Katát',
    person: 'e2',
    weight: 'secondary',
    progress: null,
    patterned: true,
  },
  {
    // §3.2 #24 (ÚJ) – írásos időpontkérés a szakember-szekcióból. P-1b → E/2:
    // a kattintás a /kapcsolat időpontkérő szekciójára VISZ, maga a vállalás
    // ott, a #25 gombbal történik. A kettő SZÁNDÉKOSAN külön sor: aki
    // „egységesítené", az a navigációt és a beküldést mosná össze.
    // NN/g egészségügyi kutatás: az írásos út a hívás mellett kötelező, mert a
    // válaszadók jelentős része kerüli a telefonálást.
    section: '#24',
    action: 'appointment-request-link',
    label: 'Kérj időpontot üzenetben',
    person: 'e2',
    weight: 'secondary',
    progress: null,
    patterned: false,
  },
  {
    // §3.2 #25 (ÚJ) – az időpontkérő űrlap BEKÜLDÉSE. P-1a → E/1: a beküldéssel
    // időpontkérés keletkezik, tehát a látogató dolgaiban változik valami.
    // Ezért E/1, szemben a #24 navigációs sorával.
    section: '#25',
    action: 'appointment-submit',
    label: 'Időpontot kérek',
    person: 'e1',
    weight: 'primary',
    progress: 'send',
    patterned: false,
  },
] as const satisfies readonly CtaEntry[]

/**
 * L-1 – folyamatban-feliratok. ZÁRT lista, három ponttal (U+2026), gondolatjel
 * nélkül. Ez RENDSZERÁLLAPOT, nem a látogató cselekvése (NN/g 1. heurisztika;
 * WCAG 4.1.3 Status Messages), ezért soha nem E/1: a „Megveszem…" alak
 * nyelvtanilag is értelmetlen volna.
 *
 * A `Beállítás…` SZÁNDÉKOSAN nincs a listán: a `/jelszo-visszaallitas` űrlapja
 * a `Mentés…`-t használja. A „beállítás" és a „mentés" ugyanazt a műveletet
 * nevezi meg (a bevitt adat tartósan eltárolódik), a Polaris pedig előírja a
 * szinonimák felszámolását („identify and eliminate synonyms").
 */
export const CTA_PROGRESS_LABELS = {
  'sign-in': 'Belépés…',
  'sign-up': 'Regisztráció…',
  send: 'Küldés…',
  save: 'Mentés…',
  processing: 'Feldolgozás…',
  loading: 'Betöltés…',
} as const satisfies Record<CtaProgressKey, string>

/**
 * Cselekvés-kulcs → bejegyzés index, duplikátum-ellenőrzéssel.
 *
 * Azért EXPORTÁLT, mert a G-UI1 őr így tudja a duplikátum-ágat közvetlenül,
 * szintetikus bemenettel is ellenőrizni. Ha csak a modulbetöltéskor dőlne ki,
 * a duplikátum-teszt maga sosem futna le (a fájl importja szállna el előbb):
 * a `guard-files-integrity` őr tanulsága: a némán ki nem futó ellenőrzés
 * ugyanolyan rossz, mint a hiányzó.
 */
export function buildCtaIndex(entries: readonly CtaEntry[]): ReadonlyMap<CtaAction, CtaEntry> {
  const index = new Map<CtaAction, CtaEntry>()
  for (const entry of entries) {
    const existing = index.get(entry.action)
    if (existing) {
      // C-1 / WCAG 3.2.4: egy cselekvésre PONTOSAN egy felirat. Ha valaki
      // mégis kettőt vesz fel, az modulbetöltéskor dől ki, nem élesben.
      throw new Error(
        `CTA-szótár: a(z) "${entry.action}" cselekvésre két felirat került be ` +
          `("${existing.label}" és "${entry.label}"). Egy cselekvés = egy felirat ` +
          `(docs/ui-sztenderdek.md §3.2, C-1, WCAG 3.2.4).`,
      )
    }
    index.set(entry.action, entry)
  }
  return index
}

const CTA_INDEX = buildCtaIndex(CTA_VOCABULARY)

/** A cselekvéshez tartozó teljes szótári bejegyzés (felirat, súly, személy, folyamatban-kulcs). */
export function ctaEntry(action: CtaAction): CtaEntry {
  const entry = CTA_INDEX.get(action)
  if (!entry) {
    throw new Error(
      `CTA-szótár: a(z) "${action}" cselekvésre nincs jóváhagyott felirat. ` +
        `Új feliratot előbb a docs/ui-sztenderdek.md §3.2 táblázatába kell felvenni, forrással.`,
    )
  }
  return entry
}

/** A cselekvéshez tartozó jóváhagyott, látható magyar felirat. */
export function ctaLabel(action: CtaAction): string {
  return ctaEntry(action).label
}

/** A gomb folyamatban-felirata (L-1); `null`, ha a gombnak nincs ilyen állapota. */
export function ctaProgressLabel(action: CtaAction): string | null {
  const { progress } = ctaEntry(action)
  return progress === null ? null : CTA_PROGRESS_LABELS[progress]
}
