/**
 * A hírlevél-hozzájárulás JOGI SZÖVEGE — egyetlen forrásból (C9).
 *
 * Ugyanaz a mondat két helyen jelenik meg, és nem csúszhatnak szét:
 *  - a láblécben, LINKKEL az adatkezelési tájékoztatóra (a GDPR
 *    tájékoztatási követelménye: a látogató a hozzájárulás előtt egy
 *    kattintással elérje a tájékoztatót);
 *  - az adminban, a „Hírlevél" űrlap checkbox-mezőjének feliratában (a
 *    szerkesztő ott látja, mihez járult hozzá a feliratkozó) — ott a link
 *    nem renderelhető, ezért kell a sima szöveges változat is.
 *
 * A szöveg tartalmi elemei (miért pont ezek — lásd docs/hirlevel.md):
 * célhoz kötöttség („hírlevelet küldjön"), a címzett adat („a megadott
 * e-mail-címemre"), a tájékoztatóra mutatás és a visszavonhatóság.
 */

/** Az adatkezelési tájékoztató útvonala (a lábléc jogi linkjeivel azonos). */
export const PRIVACY_POLICY_PATH = '/adatvedelem'

export const NEWSLETTER_CONSENT_TEXT = {
  before:
    'Hozzájárulok, hogy a Kineticare hírlevelet küldjön a megadott e-mail-címemre, és hogy adataimat az ',
  linkLabel: 'Adatkezelési és adatvédelmi szabályzat',
  after: ' szerint kezelje. A hozzájárulás bármikor visszavonható.',
} as const

/** Link nélküli, összefűzött változat (admin-mezőfelirat). */
export const NEWSLETTER_CONSENT_LABEL = `${NEWSLETTER_CONSENT_TEXT.before}${NEWSLETTER_CONSENT_TEXT.linkLabel}${NEWSLETTER_CONSENT_TEXT.after}`
