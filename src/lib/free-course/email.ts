import { escapeHtml, renderLayout } from '../email/templates/layout'
import type { EmailTemplate } from '../email/types'

/**
 * Ingyenes kurzus igénylése — a BELÉPŐ LEVÉL magyar sablonja.
 *
 * A vásárló-import aktiváló leveléből (`src/lib/customer-import/send-invites.ts`
 * `inviteEmail`) nőtt ki, és ugyanazt a mechanikát használja: a link a Payload
 * SAJÁT jelszó-visszaállító tokenje (`disableEmail: true`), tehát nincs külön,
 * párhuzamos token-rendszer, és ugyanaz a `/jelszo-visszaallitas` oldal fogadja.
 *
 * ═══ MIÉRT NEM AZ inviteEmail-t HÍVJUK ═══
 * Az a levél a MIGRÁCIÓ szövege („Elkészült az új Kineticare-fiókod… a korábban
 * megvásárolt kurzusaid már benne vannak"), ami itt hazugság lenne: ez a
 * címzett most kért egy ingyenes kurzust, nem korábbi vásárló. A két levél
 * SZÖVEGE tehát külön él, a MECHANIKA közös.
 *
 * ═══ FIÓK-FELDERÍTÉS ELLENI VÉDELEM A LEVÉLBEN IS ═══
 * A levél nem mondja meg, hogy a fiók MOST jött létre vagy már létezett: a
 * „állíts be jelszót" mondat mindkét esetben igaz és elvégezhető (meglévő
 * fióknál a link új jelszót állít, pontosan úgy, mint az „Elfelejtett jelszó"
 * folyamat). Így a levél tartalma sem árulja el, ki regisztrált korábban.
 * (A levél amúgy is csak a cím tulajdonosához jut el, de a szabályt itt is
 * tartjuk: egyetlen helyen se szivárogjon ki a fiók léte.)
 *
 * MINDEN behelyettesített érték escape-elve (név, kurzuscím, e-mail-cím, link):
 * egy furcsa CMS-cím vagy hosszú e-mail-cím sem törheti szét a HTML-t.
 */

export interface FreeCourseEmailInput {
  /** A címzett neve; üres/hiányzó névnél semleges megszólítás megy ki. */
  readonly name?: string | null
  /** A kurzus megjelenő címe (courseTitle). */
  readonly courseTitle: string
  /** A személyre szóló belépő (jelszó-beállító) link, abszolút URL. */
  readonly activationUrl: string
  /** A címzett e-mail-címe — a levélben is szerepel („erre a címre küldtük"). */
  readonly email: string
  /** A link élettartama napokban. */
  readonly expiresInDays: number
}

/**
 * A belépő levél (tárgy + HTML + plain-text).
 *
 * Egyetlen kért cselekvés (jelszót beállítani), az ingyenesség kimondva, és a
 * „mi van, ha nem működik / nem én kértem" ág is benne van (GOV.UK
 * confirmation-pattern: mondd meg, mi a következő lépés, és mi van, ha
 * elakadsz).
 */
export function freeCourseEmail(input: FreeCourseEmailInput): EmailTemplate {
  const name = input.name?.trim() ?? ''
  const greeting = name ? `Kedves ${name}!` : 'Szia!'
  const validity = `A link ${input.expiresInDays} napig érvényes.`
  const notWorking =
    'Ha a link lejárt vagy nem működik, a belépési oldal „Elfelejtett jelszó" gombjával bármikor ' +
    'kérhetsz újat, ugyanezzel az e-mail-címmel. Ilyenkor a régi link érvénytelenné válik, ' +
    'mindig a legfrissebb levélben lévőt használd.'
  const wrongPerson =
    `Ezt a levelet a(z) ${input.email} címre küldtük, mert ezzel a címmel kérték a kurzust. ` +
    'Ha nem te kérted, ne használd a linket, és nyugodtan töröld ezt a levelet.'

  const intro =
    `A(z) ${input.courseTitle} mostantól a tiéd. Ingyenes, fizetned nem kell érte.`
  const howTo =
    'Nyisd meg az alábbi gombot, adj meg egy jelszót (legalább 12 karakter, kis- és nagybetűvel ' +
    'és számmal), majd a belépés után a Kurzusaim oldalon indíthatod a kurzust.'

  const bodyHtml = [
    escapeHtml(greeting),
    `A(z) <strong>${escapeHtml(input.courseTitle)}</strong> mostantól a tiéd. ` +
      '<strong>Ingyenes</strong>, fizetned nem kell érte.',
    escapeHtml(howTo),
    `<strong>${escapeHtml(validity)}</strong> A link személyre szól, ne add tovább.`,
    escapeHtml(notWorking),
    escapeHtml(wrongPerson),
  ]
  const bodyText = [
    greeting,
    intro,
    howTo,
    `${validity} A link személyre szól, ne add tovább.`,
    notWorking,
    wrongPerson,
  ]

  return {
    subject: `Itt a belépő linked: ${input.courseTitle}`,
    ...renderLayout({
      heading: 'Állítsd be a jelszavad, és indul a kurzus',
      paragraphsHtml: bodyHtml,
      paragraphsText: bodyText,
      // A levél EGYETLEN cselekvése. A felirat a `/jelszo-visszaallitas`
      // oldal tényleges műveletét nevezi meg (a CTA-szótár §3.2 #22 sorának
      // igéjével), nem ígér mást, mint ami a link túloldalán történik.
      cta: { label: 'Beállítom az új jelszót', url: input.activationUrl },
    }),
  }
}
