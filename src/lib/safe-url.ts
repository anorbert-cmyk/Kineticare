import { hasControlCharacter } from './return-url'

/**
 * CMS-ből érkező URL-ek allowlist-alapú tisztítása.
 *
 * A szerkesztői felületen szabadon gépelhető webcímek (CTA-gombok, szekció-sor
 * hivatkozások, sajtólogó-linkek, richText-linkek, „Külső link" típusú
 * menüpontok) ellenőrzés NÉLKÜL nem kerülhetnek `href` attribútumba. A CMS-
 * szerkesztő nem fejlesztő — a védelem nem az ő figyelmességén múlhat.
 *
 * MI A TÉNYLEGES FENYEGETÉS (és mi NEM az)
 *
 * 1. Open redirect / adathalászat. Egy elgépelt, félreértett vagy rosszhiszemű
 *    abszolút cím a látogatót tetszőleges IDEGEN hosztra viszi — a Kineticare
 *    oldaláról, a Kineticare gombjának kinézetében. Ez a legvalószínűbb valós
 *    kár: a látogató bizalma a mi felületünkhöz tapad, nem a célhoszthoz.
 * 2. Protokoll-relatív cím (`//idegen.example`). Ránézésre gyökér-relatív
 *    útvonal, valójában IDEGEN eredetre visz. A „belsőnek látszó, kívülre vivő"
 *    alak azért külön tétel, mert emberi szemrevételezéssel nem szűrhető ki
 *    megbízhatóan (ugyanez a `/\idegen.example` és a vezérlőkarakterrel
 *    álcázott `/<TAB>/idegen.example` alak).
 * 3. Nem navigációs sémák: `data:`, `blob:`, `file:`, `tel:`, `intent:` és
 *    társaik. Ezek nem weblapra visznek: dokumentumot injektálnak (`data:`),
 *    helyi fájlt nyitnak (`file:`), vagy alkalmazást indítanak a látogató
 *    készülékén (`tel:`, `intent:`). Egyik sem az, amit egy „gomb" ígér —
 *    az allowlist ezért zárt, nem tiltólista.
 * 4. Determinisztikus, tesztelhető viselkedés. A `null` egyértelmű szerződés:
 *    a hívó tudja, hogy nincs cél, és nem sodródik el ágakon.
 *
 * NEM fenyegetés ezen a stacken a `javascript:` séma XSS-ként. A React 19.2.8
 * a PRODUKCIÓS bundle-ben is szűri: `isJavaScriptProtocol` + `sanitizeURL`
 * (node_modules/react-dom/cjs/react-dom-server.node.production.js:282-288 és
 * ugyanez a kliens-runtime react-dom-client.production.js:1410-1414-ben), ami
 * a href-et `javascript:throw new Error('React has blocked a javascript:
 * URL…')`-re cseréli. Ez egy MÁSODIK, tőlünk FÜGGETLEN réteg, amire NEM
 * támaszkodunk — nem React-úton renderelő külső library vagy nyers DOM-írás
 * nincs alatta —, de a fenyegetés súlyát helyre teszi: a `javascript:` itt
 * ugyanolyan „nem működő, félrevezető link", mint a `data:`, nem kódfuttatás.
 *
 * Engedélyezett:
 *  - `https:` és `http:` abszolút URL,
 *  - `mailto:` cím (a kapcsolati linkek nyelve),
 *  - gyökér-relatív útvonal (`/kurzusok`) — a protokoll-relatív `//host` NEM,
 *  - lapon belüli horgony (`#ingyenes`) — a hero/CTA navigáció használja.
 *
 * Minden más — `javascript:`, `data:`, `tel:`, séma nélküli relatív útvonal,
 * üres/hibás alakú vagy nem szöveg bemenet — `null`. A `null`-t a hívó úgy
 * kezeli, hogy a link NEM renderelődik href-ként: a Button letiltott span-t ad,
 * a blokkok a képet/szöveget link nélkül renderelik, a menüpont pedig kimarad
 * a navigációból.
 *
 * SZERKESZTŐI VISSZAJELZÉS: a néma eltűnés önmagában rossz élmény, ezért a két
 * központi beviteli hely (src/blocks/link-fields.ts `url`, src/collections/
 * Menus.ts `url`) szerver-oldali `validate`-tel MENTÉSKOR, magyar üzenettel
 * elutasítja a tiltott alakot — a szerkesztő ott javítja, ahol elrontotta.
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

  /*
   * A NORMALIZÁLT alakot adjuk vissza, nem a nyerset.
   *
   * A hívók az „ez külső cím?" kérdést a /^https?:\/\//i mintával döntik el
   * (Button, Services, PressLogos, LexicalContent, serialize) — attól függ, hogy
   * `<a>` lesz-e belőle `next/link` helyett, és hogy megkapja-e az „új ablak +
   * rel=noopener noreferrer" ágat. A nyers érték ezt elronthatja: a
   * `https:evil.example` és a `http:\\evil.example` az URL-értelmező szerint
   * IDEGEN hosztra mutató abszolút cím, a fenti mintára viszont NEM illeszkedik,
   * tehát belsőként, next/link-kel renderelődne. A `parsed.href` az az alak,
   * amit a böngésző ténylegesen felold — így nem térhet el az, amit
   * ELLENŐRIZTÜNK, attól, amit RENDERELÜNK (ugyanaz az elv, mint a
   * vezérlőkarakter-ágnál).
   *
   * A horgony- és a gyökér-relatív ág szándékosan NYERS marad: azoknak nincs
   * bázis-URL nélkül értelmezhető abszolút alakjuk, és a `next/link` a relatív
   * útvonalat pontosan így várja.
   *
   * A NORMALIZÁLÁS LÁTHATÓ MELLÉKHATÁSAI (mind funkcionálisan azonos célra
   * mutat, tehát nem törés — de a renderelt `href` SZÖVEGE megváltozik, amin
   * egy pontos egyezésre néző HTML-snapshot vagy e2e elbukhat):
   *  - percent-kódolás: `/kézrehabilitáció` → `/k%C3%A9zrehabilit%C3%A1ci%C3%B3`,
   *    és ugyanígy a query is (`?subject=Kérdés` → `?subject=K%C3%A9rd%C3%A9s`);
   *  - punycode: `https://példa.hu/x` → `https://xn--plda-bpa.hu/x`;
   *  - alapértelmezett port elhagyása: `https://pelda.hu:443/x` → `https://pelda.hu/x`;
   *  - üres útvonal kiegészítése: `https://pelda.hu?q=1` → `https://pelda.hu/?q=1`;
   *  - a hoszt kisbetűsítése.
   * A látogató ebből semmit nem lát: a link FELIRATA külön mező.
   */
  return parsed.href
}

/**
 * A szerkesztőnek szóló, MAGYAR hibaüzenet a tiltott alakú webcímre.
 *
 * Nem „hibás formátum", hanem MEGMONDJA, mi a jó alak — a szerkesztő nem
 * fejlesztő, a puszta elutasításból nem tudná, mit gépeljen helyette.
 */
export const CMS_URL_VALIDATION_MESSAGE =
  'Ez a webcím nem használható. Saját oldalra a perjellel kezdődő rész való (pl. /kurzusok), ' +
  'másik weboldalra a teljes cím https://-sel kezdve (pl. https://pelda.hu), e-mail-címhez ' +
  'mailto:valaki@pelda.hu, lapon belüli ugráshoz pedig #horgony.'

/** Kötelező, de üresen hagyott webcím üzenete. */
export const CMS_URL_REQUIRED_MESSAGE = 'A webcím megadása kötelező.'

/**
 * Payload szerver-oldali `validate` a CMS-es webcím-mezőkhöz.
 *
 * MIÉRT KELL a renderelés-oldali szűrés MELLETT: a `sanitizeCmsUrl` a tiltott
 * címet CSENDBEN ejti — a publikus oldalon egyszerűen nem lesz link. A
 * szerkesztő ebből semmit nem lát: elmenti, „sikeres" visszajelzést kap, és
 * csak jóval később derül ki, hogy a gomb nem működik. Ez a validate a
 * MENTÉSNÉL, a mező mellett szól — ott, ahol a hiba keletkezett.
 *
 * A validate NEM váltja ki a renderelés-oldali szűrést: a régi, már mentett
 * rekordokra sosem futott le, és a Payload local API / seed / import útvonalain
 * megkerülhető. A kettő együtt ad teljes fedést.
 *
 * FIGYELEM: a Payload a saját ALAPÉRTELMEZETT mező-validációját (benne a
 * `required` vizsgálattal) CSAK akkor teszi be, ha a mezőn nincs `validate`
 * (node_modules/payload/dist/fields/config/sanitize.js:153-167) — ezért kell a
 * kötelezőséget itt is kezelni.
 *
 * @param options.required kötelező-e a mező (a `required: true` mezőkhöz)
 */
export function validateCmsUrl(value: unknown, options: { required?: boolean } = {}): string | true {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0)

  if (isEmpty) {
    // Az ÜRES érték ott marad érvényes, ahol a mező nem kötelező — a
    // szerkesztőnek nem kell kitöltenie minden opcionális gomb-célt.
    return options.required ? CMS_URL_REQUIRED_MESSAGE : true
  }

  return sanitizeCmsUrl(value) === null ? CMS_URL_VALIDATION_MESSAGE : true
}
