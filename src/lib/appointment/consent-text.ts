/**
 * Az időpontkérés hozzájárulásának JOGI SZÖVEGE — egyetlen forrásból.
 *
 * Ugyanaz a mondat két helyen jelenik meg, és nem csúszhatnak szét:
 *  - a szekció űrlapján, LINKKEL az adatkezelési tájékoztatóra (a GDPR
 *    tájékoztatási követelménye: a látogató a hozzájárulás előtt egy
 *    kattintással elérje a tájékoztatót);
 *  - az adminban, az „Időpontkérés" űrlap checkbox-mezőjének feliratában (a
 *    szerkesztő ott látja, mihez járult hozzá a beküldő) — ott a link nem
 *    renderelhető, ezért kell a sima szöveges változat is.
 *
 * MIÉRT NEM CMS-MEZŐ: a szekció minden VEVŐI szövege szerkeszthető az
 * adminból, ez az egy azonban jogi nyilatkozat. Ha a szerkesztő átírhatná, a
 * hozzájárulás tartalma és a ténylegesen kezelt adatok köre némán szétcsúszna
 * (a beküldött adat a kódból jön). A tájékoztató SZÖVEGE az /adatvedelem
 * oldalon szerkeszthető, ott a helye.
 *
 * A szöveg tartalmi elemei és a forrásuk:
 *
 *  - CÉLHOZ KÖTÖTTSÉG („időpontkérésem intézése céljából") — GDPR 5. cikk (1) b).
 *  - AZ EGÉSZSÉGÜGYI ADAT NEVESÍTÉSE („az általam esetlegesen leírt
 *    egészségügyi adatokat is") — a GDPR 9. cikk (1) szerint a „data
 *    concerning health" kezelése tiltott, kivéve, ha a 9. cikk (2) a) szerinti
 *    KIFEJEZETT hozzájárulás megvan; a kifejezett hozzájárulás pedig csak akkor
 *    érvényes, ha nevesíti az érintett adatkategóriát.
 *    Forrás: https://gdpr-info.eu/art-9-gdpr/
 *  - A TÁJÉKOZTATÓRA MUTATÁS és a VISSZAVONHATÓSÁG — GDPR 7. cikk (3).
 *
 * A megfogalmazás natív magyar, gondolatjel-halmozás nélkül (tulajdonosi
 * kikötés): a tagolást vessző és kettőspont adja.
 */

/** Az adatkezelési tájékoztató útvonala (a lábléc jogi linkjeivel azonos). */
export const APPOINTMENT_PRIVACY_POLICY_PATH = '/adatvedelem'

export const APPOINTMENT_CONSENT_TEXT = {
  before:
    'Hozzájárulok, hogy a Kineticare az itt megadott adataimat, beleértve az általam esetlegesen leírt egészségügyi adatokat is, az időpontkérésem intézése céljából kezelje az ',
  linkLabel: 'Adatkezelési és adatvédelmi szabályzat',
  after: ' szerint. A hozzájárulás bármikor visszavonható.',
} as const

/** Link nélküli, összefűzött változat (admin-mezőfelirat). */
export const APPOINTMENT_CONSENT_LABEL = `${APPOINTMENT_CONSENT_TEXT.before}${APPOINTMENT_CONSENT_TEXT.linkLabel}${APPOINTMENT_CONSENT_TEXT.after}`
