/**
 * A „nem található" oldal SZÖVEGE és CÉLLISTÁJA — egyetlen igazságforrás.
 *
 * Miért külön modul: ugyanez a tartalom KÉT különböző Next-konvención jelenik
 * meg (lásd `src/components/error/NotFoundView.tsx` fejlécét), és a két helyen
 * elcsúszó szöveg pontosan az a fajta néma inkonzisztencia, amit a WCAG 2.2
 * 3.2.4 (Consistent Identification) tilt: ugyanaz a funkció ugyanúgy nevezendő
 * meg a felület minden pontján.
 * https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
 *
 * A szöveg CMS-FÜGGETLEN. A hibaoldal akkor is helyt kell álljon, amikor épp
 * az adatbázis vagy a Payload-példány nem érhető el — ezért itt nincs
 * lekérdezés, csak konstans.
 *
 * MIKROSZÖVEG-FORRÁSOK
 *
 * 1. GOV.UK Design System, „Page not found pages":
 *    https://design-system.service.gov.uk/patterns/page-not-found-pages/
 *    A minta szó szerint három dolgot mondat el a látogatóval:
 *      - ha begépelte a címet, ellenőrizze, jól írta-e,
 *      - ha bemásolta, ellenőrizze, a TELJES cím bekerült-e,
 *      - ha a cím jó volt, vagy linkről érkezett, vegye fel velünk a kapcsolatot.
 *    És kimondottan TILTJA: a „404"/„bad request" szakzsargont, az „oops"-féle
 *    bratyizást, a piros riasztást, a morzsamenüt és minden olyan szöveget,
 *    amely a látogatót hibáztatja. Ezért nincs a látható szövegben „404".
 *
 * 2. Nielsen Norman Group, „Improving the Dreaded 404 Error Message":
 *    https://www.nngroup.com/articles/improving-dreaded-404-error-message/
 *    Kimondja, hogy a lap kezdődjön rövid, bocsánatkérő mondattal, kerülje a
 *    technikai zsargont és a felhasználó hibáztatását, és legyen KONSTRUKTÍV:
 *    adjon továbbvezető, kattintható célokat. (Keresőmezőt is kér; a
 *    Kineticare-nek jelenleg nincs oldalkeresője, ezért a helyét a legfontosabb
 *    célok listája veszi át (gombok + `NOT_FOUND_DESTINATIONS`).)
 *
 * 3. NN/g, „Error-Message Guidelines" (közérthető, pontos, konstruktív):
 *    https://www.nngroup.com/articles/error-message-guidelines/
 *
 * A magyar írásmód a `docs/ui-sztenderdek.md` 3.1 mikroszöveg-szabályzatát
 * követi: gondolatjel csak valódi közbevetésnél, itt egy sem kell.
 */

/** A lap egyetlen h1-e. A GOV.UK mintacíme magyarul. */
export const NOT_FOUND_TITLE = 'Ez az oldal nem található'

/** Bocsánatkérő, nem hibáztató nyitómondat (NN/g). */
export const NOT_FOUND_LEAD =
  'Elnézést kérünk. A megnyitott cím nálunk nem létezik, vagy időközben másik helyre került.'

/**
 * A GOV.UK-minta három ellenőrző mondata magyarul. Sorrend és tartalom a
 * mintáé; a harmadik pont vezeti át a látogatót a kapcsolatfelvételre.
 */
export const NOT_FOUND_CHECKS = [
  'Ha kézzel írtad be a címet, nézd meg, nem maradt-e benne elgépelés.',
  'Ha bemásoltad, ellenőrizd, hogy a teljes cím bekerült-e.',
  'Ha jó a cím, vagy egy linkről jutottál ide, írj nekünk, és megkeressük a tartalmat.',
] as const

/**
 * A KÉT gombos cselekvés: egy elsődleges, egy másodlagos.
 *
 * A feliratok a `docs/gomb-inventar.md` CTA-szótárából valók, hogy ugyanaz a
 * cselekvés mindenhol ugyanúgy hívódjon (WCAG 2.2 · 3.2.4). Az elsődleges a
 * kurzuslista: az értékesítési cél-hierarchia teteje
 * (`docs/ertekesitesi-ux-skill.md`), és a hibaoldalról ez a leghasznosabb
 * továbblépés.
 */
export const NOT_FOUND_PRIMARY_ACTION = { href: '/kurzusok', label: 'Nézd meg a kurzusokat' }
export const NOT_FOUND_SECONDARY_ACTION = { href: '/', label: 'Vissza a kezdőlapra' }

/** A további célokat bevezető sor. */
export const NOT_FOUND_DESTINATIONS_LABEL = 'Vagy folytasd innen'

/**
 * A TOVÁBBI célok. Szándékosan NEM ismétlik a két gombot: az NN/g szerint a
 * hibaoldal legyen konstruktív és áttekinthető, az ugyanarra a célra mutató
 * kettőzött hivatkozás viszont csak zajt ad
 * (https://www.nngroup.com/articles/improving-dreaded-404-error-message/).
 *
 * Mind KÓD-ÚTVONAL (`src/app/(frontend)/…`), nem CMS-oldal: így a lista akkor
 * sem mutathat 404-re, ha a szerkesztő átnevez vagy visszavon egy CMS-oldalt.
 * A `/szolgaltatasok` és a `/rolunk` épp ezért marad ki: azok a `[slug]`
 * CMS-route-on élnek.
 */
export const NOT_FOUND_DESTINATIONS = [
  {
    href: '/blog',
    label: 'Tudástár',
    hint: 'Cikkek a kéz gyógyulásáról és a mindennapi használatról.',
  },
  {
    href: '/kapcsolat',
    label: 'Kapcsolat',
    hint: 'Írj nekünk, ha nem találod, amit keresel.',
  },
] as const

/**
 * Kapcsolatfelvételi e-mail.
 *
 * Szándékosan NEM a `Footer.tsx` konstansát importáljuk: a lábléc modulja
 * magával hozná a `NewsletterSignup`-ot és rajta keresztül a teljes
 * Payload-példányt, a `global-not-found` viszont a Next dokumentációja szerint
 * kifejezetten könnyű lapnak való
 * (https://nextjs.org/docs/app/api-reference/file-conventions/not-found).
 * A két érték egyezését őr-teszt tartja szinkronban
 * (`src/__tests__/hibaoldal.test.tsx`).
 */
export const NOT_FOUND_CONTACT_EMAIL = 'info@kineticare.hu'
