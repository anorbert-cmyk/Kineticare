/**
 * Az időpontkérő szekció SZERVER-OLDALI környezete (űrlap-azonosító és
 * Turnstile site key), tiszta, Payload-független alakban.
 *
 * MIÉRT PROP ÉS NEM A KOMPONENS SAJÁT LEKÉRDEZÉSE: a `RenderBlocks` szinkron
 * komponens, és a szekció-blokkok tesztjei `renderToStaticMarkup`-pel futnak,
 * ami aszinkron komponenst nem tud renderelni. A repóban emiatt eleve az a
 * minta, hogy az adatvezérelt blokkok (courseCards, knowledge, testimonials) az
 * ADATOT propként kapják a route-tól — az időpontkérő szekció ugyanezt követi.
 *
 * A modul szándékosan NEM importál Payloadot vagy konfigot: így kliens- és
 * teszt-oldalról is behúzható. A tényleges lekérdezés a `section.ts`-ben él.
 */

export interface AppointmentSectionContext {
  /** Az „Időpontkérés" form-builder űrlap azonosítója; null = az űrlap letiltva renderel. */
  formId: string | null
  /** TURNSTILE_SITE_KEY (szerver-oldalon olvasva); null/üres = a widget rejtve marad. */
  turnstileSiteKey: string | null
}

/**
 * Alapállapot: nincs űrlap és nincs spam-ellenőrzés. A szekció ilyenkor is
 * megjelenik (a rendelő elérhetőségeivel), csak az űrlap renderel letiltva,
 * magyar magyarázattal — így a lap sosem lesz zsákutca.
 */
export const EMPTY_APPOINTMENT_CONTEXT: AppointmentSectionContext = {
  formId: null,
  turnstileSiteKey: null,
}

/** A szekció-rendszer blokk-azonosítója (egy helyen, elgépelés ellen). */
export const APPOINTMENT_BLOCK_TYPE = 'appointment'

/** Az űrlap-kapcsoló olvasásához elég blokk-alak (a teljes típus nem kell). */
export interface AppointmentFormToggle {
  urlapMutatasa?: boolean | null
}

/**
 * Látszik-e az ŰRLAP ebben az időpontkérő szekcióban?
 *
 * MIÉRT `!== false` ÉS NEM `=== true`: a mező nem kötelező (`boolean | null`),
 * tehát HIÁNYOZHAT. Aki hiányzó értékkel érkezik, az nem azt mondta, hogy
 * „ne legyen űrlap" — csak nem nyilatkozott. A `=== true` vizsgálat ezért néma
 * tartalomvesztés lenne: egy mezőt kihagyó seed, JSON-import vagy kézzel
 * összerakott blokk-objektum eltüntetné az űrlapot anélkül, hogy bárki kérte
 * volna. Így viszont az űrlap eltüntetése mindig SZÁNDÉKOS: kizárólag
 * kifejezett `false` kapcsolja ki.
 *
 * A már MENTETT sorokat ez nem érinti: a migráció `ADD COLUMN … boolean
 * DEFAULT true`, és a Postgres a nem-volatilis alapértéket visszatölti a
 * meglévő sorokba (helyben mérve: a művelet után a régi sor értéke `true`,
 * nem `NULL`). A kód-oldali szabály tehát a második védvonal, nem az első.
 *
 * A tulajdonos döntése (2026-08-17): a /kapcsolat lapon az időpontot telefonon
 * egyeztetik, nem üzenetben, ezért ott ez a kapcsoló `false`. A szekció ettől
 * nem tűnik el: a rendelők címe, a telefonszámok és az e-mail-cím marad, és a
 * telefon lesz az egyetlen út. Ez az NN/g kapcsolat-oldal irányelvének a
 * MEGENGEDETT iránya: „Offer a contact form only in addition to telephone
 * numbers, not as a replacement" — az űrlap a kiegészítő, a telefonszám a
 * kötelező elem (https://www.nngroup.com/articles/contact-us-pages/).
 */
export function appointmentShowsForm(
  block: AppointmentFormToggle | null | undefined,
): boolean {
  return block?.urlapMutatasa !== false
}

/**
 * Van-e ŰRLAPOT MUTATÓ időpontkérő szekció a lap szekciósorában? A route ebből
 * dönti el, hogy kell-e egyáltalán űrlap-lekérdezést indítani
 * (lekérdezés-takarékosság: a szekciót nem használó lapokon egy kör sem fut).
 *
 * A kapcsolót is nézi, nem csak a blokktípust: űrlap nélküli szekciónál az
 * űrlap-azonosító lekérdezése fölösleges kör lenne, ráadásul hiányzó
 * form-builder űrlapnál félrevezető `warn` sort írna olyan lapról, ahol
 * űrlapnak nyoma sincs.
 */
export function layoutHasAppointmentBlock(
  layout:
    | ReadonlyArray<({ blockType?: string | null } & AppointmentFormToggle) | null | undefined>
    | null
    | undefined,
): boolean {
  return (layout ?? []).some(
    (block) => block?.blockType === APPOINTMENT_BLOCK_TYPE && appointmentShowsForm(block),
  )
}
