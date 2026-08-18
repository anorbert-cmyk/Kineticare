/**
 * Ingyenes kurzus igénylése — a LÁTOGATÓNAK MEGJELENŐ szövegek, egy helyen.
 *
 * MIÉRT KÜLÖN MODUL: ugyanaz a mondat több helyen jelenik meg (űrlap,
 * siker-nézet, teszt), és a mikroszöveg-szabályokat (docs/ui-sztenderdek.md
 * §2.7 és §3.1) csak akkor lehet ŐRIZNI, ha a szöveg nem a JSX-be van
 * szétszórva. A hírlevél `consent-text.ts`-ének mintája, kibővítve a folyamat
 * összes állapotüzenetével.
 *
 * A SZABÁLYOK, amiket ezek a szövegek betartanak:
 *  - töltelék gondolatjel (– vagy —) SEHOL (§3.1.1–3.1.2, tulajdonosi kikötés);
 *  - „Kérjük" SEHOL: a GOV.UK szerint a „please" választást sugall ott, ahol
 *    nincs választás (§2.7, A/9);
 *  - a hibaüzenet megmondja, MI történt és MI a következő lépés (§2.7);
 *  - a magyarázó szöveg TEGEZ (E/2, P-1b), a beküldő gomb E/1 (P-1a) — a
 *    felirat indoklása és forrásai a `FREE_COURSE_SUBMIT_LABEL` kommentjében;
 *  - a folyamatban-felirat a ZÁRT L-1 készletből jön
 *    (`src/lib/cta-vocabulary.ts` `CTA_PROGRESS_LABELS.send` = „Küldés…").
 */

import { ctaLabel } from '../cta-vocabulary'

/**
 * ═══ A BEKÜLDŐ GOMB FELIRATA ═══
 *
 * `Kérem a kurzust` — E/1, ige + tárgy, három szó, gondolatjel nélkül.
 *
 * MIÉRT NEM A §3.2 #3 SORA („Elindítom ingyen"): az a sor NAVIGÁCIÓS
 * cselekvésé — a kezdőlapi ingyenes sáv és a kurzuskártya gombjáé, amely az
 * ingyenes kurzus OLDALÁRA visz. Ez a gomb ellenben maga a VÁLLALÁS: a
 * beküldéssel fiók keletkezik, hozzáférés íródik be és levél indul. A §3.2
 * ugyanezt a kettősséget már kimondta a #24 (navigáció az időpontkérő
 * szekcióhoz) és a #25 (az űrlap beküldése) párral, vezetői pontosítással:
 * „aki egységesítené a kettőt, az a navigációt és a vállalást mosná össze".
 * Ez a felirat tehát a §3.2 ÚJ sorának javaslata, nem a #3 felülírása.
 *
 * MIÉRT PONTOSAN EZ A SZÓ (mérés, nem ízlés):
 *  - a régi `www.kineticare.hu` ingyenes útján a beküldő gomb `KÉREM`, az oda
 *    vezető gombok `KÉREM A VILLÁMKURZUST` (4×), `KÉREM A PROGRAMOT` (2×) és
 *    `KÉREM A HOZZÁFÉRÉST` (2×) voltak — mérve, nyers HTML-ből:
 *    `docs/regi-oldal-osszehasonlitas.md` §3.1. A meglévő ~274 vevő ezt a szót
 *    szokta meg (Jakob törvénye, NN/g);
 *  - a tulajdonos szó szerinti kérése ugyanez: „ide kellene egy olyan hogy
 *    kérem a kurzust";
 *  - a §3.2 #21 sora ugyanezt a szerkezetet használja („Kérem a visszaállító
 *    linket"), tehát a szótár nyelvébe illeszkedik. FIGYELEM: ez az E/1-es
 *    „kérem" ige, NEM a §2.7-ben tiltott udvariaskodó „Kérjük";
 *  - NN/g „4S": specifikus és önmagában is érthető, és SINCERE — nincs benne
 *    ár, fizetés vagy olyan ígéret, amit a kattintás nem tart be
 *    (`docs/regi-oldal-osszehasonlitas.md` §3.3/4. pont pontosan ezt méri a
 *    mai „Megveszem" hibájaként).
 *
 * MIÉRT NEM „Kérem a villámkurzust": a komponens MINDEN ingyenes kurzuson
 * megjelenhet, a „villámkurzus" viszont EGY termék neve. A tárgy általános
 * alakja tartja a feliratot igaznak akkor is, ha holnap egy másik ingyenes
 * anyag kerül ki. (A §3.2 C-6 mintázatos alakja — `Kérem a <mit>` — később
 * bevezethető, ha a szerkesztő terméknevet akar a gombra.)
 *
 * A gomb VIZUÁLIS SÚLYA `primary`: az ingyenes kurzus saját oldalán ez a lap
 * EGYETLEN elsődleges cselekvése (nincs mellette vásárlás), a §3.2 #3 sorának
 * kötelező `secondary` súlya pedig a KEZDŐLAPRA szól, ahol a fizetős hero-CTA
 * mellett állna (K-3).
 *
 * VEZETŐI DÖNTÉS (2026-08-17): a felirat felkerült a NORMATÍV CTA-szótárba
 * (`docs/ui-sztenderdek.md` §3.2 #26, kódbeli forrás:
 * `src/lib/cta-vocabulary.ts` `free-course-request`), ezért innentől NEM
 * literál, hanem onnan olvasott érték — így a G-UI1 őr-teszt is védi, és a
 * felirat nem tud két helyen szétcsúszni (WCAG 2.2 3.2.4).
 */
export const FREE_COURSE_SUBMIT_LABEL = ctaLabel('free-course-request')

/** Az adatkezelési tájékoztató útvonala (a lábléc jogi linkjeivel azonos). */
export const PRIVACY_POLICY_PATH = '/adatvedelem'

/** A kapcsolati oldal — ide küldjük a látogatót, ha a levél nem tud kimenni. */
export const CONTACT_PATH = '/kapcsolat'

/**
 * Az űrlap bevezetője. Kimondja, hogy INGYENES (a felirat és a valóság
 * egyezzen), és megmondja, mi történik a beküldés után. GOV.UK: a lap mondja
 * el előre a következő lépést, ne a beküldés után derüljön ki.
 */
export const FREE_COURSE_INTRO =
  'A kurzus ingyenes, fizetned nem kell érte. Add meg a neved és az e-mail-címed, a belépő linket pedig e-mailben küldjük.'

/** Mezőfeliratok — a kapcsolat-űrlap szóhasználatával azonos (WCAG 3.2.4). */
export const FREE_COURSE_NAME_LABEL = 'Név'
export const FREE_COURSE_EMAIL_LABEL = 'E-mail-cím'

/**
 * Az e-mail-mező súgója. Baymard: mondd meg, MIRE használod a mezőt; ez a
 * bizalmi kifogást („mit fogtok küldeni?") a mező mellett oldja fel.
 */
export const FREE_COURSE_EMAIL_HINT = 'Erre a címre küldjük a belépő linket.'

/**
 * Az adatkezelési hozzájárulás szövege, linkkel a tájékoztatóra. A GDPR
 * tájékoztatási követelménye: a látogató a hozzájárulás ELŐTT, egy
 * kattintással érje el a tájékoztatót.
 */
export const FREE_COURSE_CONSENT_TEXT = {
  before:
    'Hozzájárulok, hogy a Kineticare a nevemet és az e-mail-címemet a kurzus-hozzáférés létrehozásához és a belépő link kiküldéséhez kezelje az ',
  linkLabel: 'Adatkezelési és adatvédelmi szabályzat',
  after: ' szerint. A hozzájárulás bármikor visszavonható.',
} as const

/**
 * A hozzájárulás alatti megnyugtató sor. Egészségügyi kontextusban ez nem
 * díszítés: a látogató jogosan tart attól, hogy panaszt vagy diagnózist kell
 * megadnia. Az űrlap TÉNYLEG nem kér ilyet (GDPR 9. cikk szerinti különleges
 * adatot nem kezelünk ebben a folyamatban), tehát a mondat igaz.
 */
export const FREE_COURSE_CONSENT_HINT = 'Egészségi állapotra vonatkozó adatot nem kérünk.'

/** Siker, KIKÜLDÖTT levéllel. */
export const FREE_COURSE_SUCCESS_TITLE = 'Elküldtük a belépő linket'
export const FREE_COURSE_SUCCESS_BODY =
  'Nyisd meg a postaládád: a levélben találsz egy linket, azzal állíthatsz be jelszót, utána pedig a Kurzusaim oldalon indul a kurzus. Ha pár percen belül nem érkezik meg, nézd meg a levélszemét mappát is.'

/**
 * Siker, de a levél NEM ment ki (nincs beállított levelező-szolgáltató, vagy a
 * szolgáltató elutasította a küldést).
 *
 * MIÉRT SAJÁT ÁLLAPOT: a hozzáférés ilyenkor is létrejön, tehát „hiba" üzenetet
 * írni hazugság lenne; a „elküldtük a linket" viszont ugyanúgy hazugság. A
 * látogatónak azt kell megtudnia, MI történt és MI a következő lépése (§2.7).
 */
export const FREE_COURSE_NO_EMAIL_TITLE = 'A hozzáférésed elkészült'
export const FREE_COURSE_NO_EMAIL_BODY =
  'A belépő linket viszont most nem tudjuk kiküldeni, mert a levélküldésünk éppen nem működik. Írj nekünk ugyanerről az e-mail-címről, és kézzel elküldjük a linket.'
/**
 * A „nem ment ki a levél" ág kisegítő hivatkozásának felirata.
 *
 * A §3.2 #33 szótári sorából olvas: a `/kapcsolat` oldalra vivő cselekvés
 * felirata a felület MINDEN pontján ugyanaz (WCAG 2.2 · 3.2.4). A korábbi
 * „Írj nekünk a kapcsolati oldalon" öt szó volt (M-3), és a köszönőoldal
 * „Segítséget kérek" / „Kapcsolat" gombjaival együtt HÁROM feliratot adott
 * ugyanarra a célra.
 */
export const FREE_COURSE_NO_EMAIL_LINK_LABEL = ctaLabel('contact-open')

/** Általános szerverhiba — a szerver válasza felülírhatja. */
export const FREE_COURSE_GENERIC_ERROR =
  'Az igénylés most nem sikerült. Próbáld újra néhány perc múlva, vagy írj nekünk a kapcsolati oldalon.'

/** Turnstile-kulcs mellett, még token nélküli állapotban ez az üzenet megy ki. */
export const FREE_COURSE_TURNSTILE_PENDING_ERROR =
  'Várd meg a spam-ellenőrzés befejezését, majd küldd el újra.'

/** Az űrlap fölött álló hiba-összefoglaló általános sora (mezőhibáknál). */
export const FREE_COURSE_ERROR_SUMMARY = 'Nézd át a megjelölt mezőket, majd küldd el újra.'

/**
 * ═══ A PÉNZTÁR INGYENES-KAPUJA (2026-08-17) ═══
 *
 * A `/penztar?termek=<ingyenes-id>` eddig teljes értékű, de SOSEM sikerülő
 * űrlapot rendelt: a beküldést a `POST /api/checkout/start` ár-kapuja
 * garantáltan elutasítja („A termékhez nem tartozik érvényes ár…"), mert az
 * ingyenes terméken a `coursePriceHuf` `null`. A lap most az űrlap helyett
 * tájékoztató állapotot mutat, egyetlen továbblépéssel.
 *
 * A SZÖVEG SZABÁLYAI (a modul fejlécében felsoroltakon túl):
 *  - NN/g, Error-Message Guidelines: „Concisely and precisely describe the
 *    issue"; „Take a positive tone and don't blame the user"; „Offer
 *    constructive advice. Merely stating the problem is also not enough; offer
 *    some potential remedies." A mondat ezért ELŐBB az okot mondja ki (ingyenes,
 *    tehát nincs mit fizetni), UTÁNA az utat.
 *    https://www.nngroup.com/articles/error-message-guidelines/
 *  - GOV.UK Design System, Button: „Avoid using multiple default buttons on a
 *    single page." Egyetlen továbblépés van, a §3.2 szótárból.
 *    https://design-system.service.gov.uk/components/button/
 *  - A MEZŐKET SZÁNDÉKOSAN NEM SOROLJA FEL. Ugyanaz a vezetői javítás, ami a
 *    `FREE_COURSE_FORM_LINK_TEXT`-et átírta: az űrlapnak HÁROM kötelező eleme
 *    van (név, e-mail, adatkezelési jelölőnégyzet), a kettőt említő mondat tehát
 *    ALULMONDANÁ a ráfordítást. Helyette az marad, ami minden mezőre igaz és
 *    ellenőrizhető: rövid, és fizetni nem kell.
 */
export const FREE_COURSE_NOT_CHECKOUT_TEXT =
  'Ez a kurzus ingyenes, ezért nem a pénztáron át jár. A kurzus oldalán igényelheted: az űrlap rövid, és fizetned nem kell érte.'

/**
 * Ugyanaz az állapot annak, aki a hozzáférést MÁR megkapta. Igényelnie nincs
 * mit, tehát a továbblépés a Kurzusaim (§3.2 #9) — a mondat pedig megmondja,
 * hol találja meg. Vendégként ez az ág nem fut: fiók nélkül nincs mihez
 * hasonlítani (a lap `alreadyPurchased`-e bejelentkezés nélkül mindig hamis).
 */
export const FREE_COURSE_ALREADY_GRANTED_TEXT =
  'Ez a kurzus ingyenes, és a hozzáférésed már megvan. A Kurzusaim oldalon éred el.'
