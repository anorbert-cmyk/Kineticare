import { hasControlCharacter } from './return-url'

/**
 * CMS-ből érkező URL-ek allowlist-alapú tisztítása.
 *
 * A szerkesztői felületen szabadon gépelhető webcímek (CTA-gombok, szekció-sor
 * hivatkozások, sajtólogó-linkek, richText-linkek, „Külső link" típusú
 * menüpontok) ellenőrzés NÉLKÜL nem kerülhetnek `href` attribútumba: egy
 * `javascript:` sémájú érték a látogató böngészőjében futtatna kódot (XSS), a
 * protokoll-relatív `//idegen.host` pedig észrevétlenül idegen eredetre visz
 * (adathalászat). A CMS-szerkesztő nem fejlesztő — a védelem nem az ő
 * figyelmességén múlhat.
 *
 * Engedélyezett:
 *  - `https:` és `http:` abszolút URL,
 *  - `mailto:` cím (a kapcsolati linkek nyelve),
 *  - gyökér-relatív útvonal (`/kurzusok`) — a protokoll-relatív `//host` NEM,
 *  - lapon belüli horgony (`#ingyenes`) — a hero/CTA navigáció használja.
 *
 * Minden más — `javascript:`, `data:`, `vbscript:`, séma nélküli relatív
 * útvonal, üres/hibás alakú vagy nem szöveg bemenet — `null`. A `null`-t a
 * hívó úgy kezeli, hogy a link NEM renderelődik href-ként: a Button letiltott
 * span-t ad, a blokkok a képet/szöveget link nélkül rendereli, a menüpont
 * pedig kimarad a navigációból.
 *
 * A modul a `sanitizeReturnUrl` (src/lib/return-url.ts) testvére: ott a
 * FELHASZNÁLÓTÓL érkező visszatérési útvonal szűkül azonos eredetűre, itt a
 * SZERKESZTŐTŐL érkező webcím szűkül a rendereltethető sémákra. A közös
 * vezérlőkarakter-vizsgálat ezért onnan jön, nem másolatban.
 */

/** A href-ként rendereltethető abszolút sémák. */
const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:', 'mailto:'])

/**
 * A `\` (backslash) a relatív ágon TILOS.
 *
 * A böngésző URL-értelmezője a relatív feloldáskor a backslasht perjelként
 * kezeli, ezért a `/\idegen.host` ugyanoda visz, mint a `//idegen.host` — a
 * puszta `startsWith('//')` vizsgálat tehát megkerülhető lenne.
 */
function hasBackslash(value: string): boolean {
  return value.includes('\\')
}

/**
 * Egy CMS-ből érkező webcím tisztítása; `null`, ha nem renderelhető href-ként.
 *
 * A bemenet szándékosan `unknown`: a Lexical-csomópontok mezői típus nélkül
 * érkeznek, és a hiányzó/nem szöveg érték ugyanúgy „nincs link", mint a tiltott
 * séma — a hívóknak nem kell előszűrniük.
 */
export function sanitizeCmsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  /*
   * Vezérlőkarakter bárhol → elutasítás.
   *
   * A `trim()` csak a SZÉLEKRŐL szedi le a tabot/soremelést, a böngésző
   * URL-értelmezője viszont a szó BELSEJÉBŐL is kidobja őket. Emiatt a
   * `/<TAB>/idegen.host` a mi szemünkben egyszerű gyökér-relatív útvonal, a
   * böngészőben viszont protokoll-relatív cím — pontosan az, amit a `//`
   * vizsgálat kizárna. Szűrés helyett elutasítás: így sosem térhet el az az
   * érték, amit ELLENŐRIZTÜNK, attól, amit RENDERELÜNK.
   */
  if (hasControlCharacter(trimmed)) {
    return null
  }

  // Lapon belüli horgony. Sémát nem vihet be, de a csupasz '#' nem visz sehová
  // (üres cél), ezért az sem renderelhető linkként.
  if (trimmed.startsWith('#')) {
    return trimmed.length > 1 && !hasBackslash(trimmed) ? trimmed : null
  }

  // Gyökér-relatív útvonal — azonos eredet.
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//') && !hasBackslash(trimmed) ? trimmed : null
  }

  // Innentől csak abszolút, sémás URL jöhet szóba. A séma vizsgálata a
  // FELDOLGOZOTT értéken történik: a `java<TAB>script:` alakot a vezérlőkarakter
  // -szűrő már kizárta, de a kis/nagybetűs és százalék-kódolt változatokat is a
  // parser normalizálja — nyers szövegre illesztett minta ezt nem tenné meg.
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    // Séma nélküli relatív útvonal ('kurzusok/12') vagy hibás alak ('https://').
    return null
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return null
  }

  // A 'mailto:' önmagában érvényes URL, de címzett nélkül üres linket adna.
  if (parsed.protocol === 'mailto:' && parsed.pathname.length === 0) {
    return null
  }

  return trimmed
}
