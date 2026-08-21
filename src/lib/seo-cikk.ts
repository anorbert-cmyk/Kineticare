import { absoluteUrl, faqPageJsonLd, SITE_NAME } from './seo'

/**
 * Tudástár-cikkek strukturált adata (schema.org / GEO-réteg).
 *
 * MIÉRT KÜLÖN MODUL. A `src/lib/seo.ts` az egész storefront közös
 * meta- és JSON-LD segédlete (oldalak, kurzusok, listák). A cikkoldal sémája
 * ennél szűkebb és szigorúbb: egészségügyi (YMYL) tartalomról beszél, ezért
 * szerzőt, lektort és ellenőrzési dátumot is közöl. Ez a modul csak azt tudja,
 * és tisztán — DOM, hálózat és adatbázis nélkül, egységtesztelhetően.
 *
 * ALAPSZABÁLY (docs/seo-geo-llm.md 1. fejezet): a séma minden mezője a LÁTHATÓ
 * tartalomból jön. A strukturált adat legdrágább hibája az, amikor a séma
 * TÖBBET állít, mint amit a lap mutat: a kereső ilyenkor elveti az egészet,
 * és semmilyen hibaüzenet nem jelzi.
 *
 * A KÉT NYILVÁNOS BELÉPÉSI PONT:
 * - `postArticleJsonLd` — a cikk EGY entitása, `['Article', 'MedicalWebPage']`
 *   kettős típussal;
 * - `postFaqItems` + `postFaqJsonLd` — a „Mások ezt is kérdezik" réteg, ahol a
 *   látható lista és a FAQPage séma UGYANABBÓL a tömbből készül.
 *
 * A modul SZÁNDÉKOSAN nem old fel Payload-kapcsolatokat (author, reviewedBy):
 * a hívó adja be a már leszűkített `{ name, credentials }` alakot. Ez nem
 * kényelmi kérdés, hanem a `docs/tudastar-technikai-terv.md` 2.4 biztonsági
 * jegyzete: a populált user-dokumentum a jelszó-hasht és a session-listát is
 * viszi, ezért a séma-rétegnek soha nem szabad a nyers objektumot látnia.
 *
 * Ellenőrzött források (2026-08-21):
 * - schema.org, MedicalWebPage: https://schema.org/MedicalWebPage
 * - schema.org, lastReviewed (domain: WebPage, érték: **Date**):
 *   https://schema.org/lastReviewed
 * - schema.org, reviewedBy (domain: WebPage, érték: Person vagy Organization):
 *   https://schema.org/reviewedBy
 * - Google Search Central, Article structured data:
 *   https://developers.google.com/search/docs/appearance/structured-data/article
 * - Google Search Central, FAQPage:
 *   https://developers.google.com/search/docs/appearance/structured-data/faqpage
 * - Google Search Central, Structured data general policies:
 *   https://developers.google.com/search/docs/appearance/structured-data/sd-policies
 */

/** A cikk-séma nyelve — magyar tartalom, magyar közönségnek. */
const ARTICLE_LANGUAGE = 'hu-HU'

/**
 * A szerző- és lektor-`Person` `url`-je.
 *
 * A látható szerző-blokk „Ismerd meg a hátterünket" linkje a `/rolunk` lapra
 * visz — a séma pontosan azt a címet közli, amit az olvasó is követni tud
 * (a Google strukturált adat irányelve: a séma a látható tartalmat írja le).
 * Amíg a `/rolunk` nem ad személyenkénti horgonyt, a két gyógytornász
 * ugyanarra a lapra mutat; személyenkénti URL-t kitalálni tilos lenne.
 */
const PROFILE_PATH = '/rolunk'

/**
 * A cikkhez kiírható GYIK-tételek felső korlátja.
 *
 * A `posts.faq` mező `maxRows: 6` beállítása az admin-szerkesztőt fogja meg;
 * ez a konstans a RENDERELÉST fogja meg, mert a seed, az import és a REST-API
 * a maxRows-t nem futtatja. Mivel a látható lista és a FAQPage séma ugyanebből
 * a tömbből készül, a plafon mindkettőre azonosan érvényes — a séma nem tud
 * többet hirdetni, mint amennyi a lapon látszik.
 * (Forrás a 6-os számhoz: NHS felsorolás-plafon, docs/tudastar-technikai-terv.md 2.2.)
 */
export const POST_FAQ_MAX_ITEMS = 6

/**
 * A cikk-séma szempontjából lényeges poszt-mezők.
 *
 * SZÁNDÉKOSAN strukturális típus (nem `Pick<Post, …>`), a `SeoDoc` bevált
 * mintája szerint: így a modul nem függ a generált `payload-types.ts`
 * aktuális állapotától, és fixture-ökkel, adatbázis nélkül tesztelhető.
 * Egy valódi `Post` szerkezetileg illeszkedik rá.
 */
export interface ArticleSeoPost {
  /** A cikk címe — a lap H1-e. */
  title: string
  /** Bevezető; a hero lead bekezdése. */
  excerpt?: string | null
  /** Első közzététel ISO-időbélyege. */
  publishedAt?: string | null
  /** Utolsó dokumentum-módosítás ISO-időbélyege (CMS `updatedAt`). */
  updatedAt?: string | null
}

/**
 * Egy megnevezett szakember a sémában (szerző vagy lektor).
 *
 * A `credentials` a `Person.jobTitle` mezőbe kerül, NEM a névbe: a Google
 * Article-dokumentációja szó szerint kiköti, hogy az `author.name` „only
 * specify the name of the author. Don't add any other piece of information",
 * a titulushoz pedig a `jobTitle` tulajdonságot kell használni.
 */
export interface SchemaPerson {
  /** A megjelenített név, ahogy a byline-ban is áll. */
  name: string
  /** Végzettség/titulus, pl. „gyógytornász, kézterapeuta". */
  credentials?: string | null
}

/** Egy nyers GYIK-sor a CMS-ből (a mezők üresen is jöhetnek). */
export interface PostFaqSource {
  question?: string | null
  answer?: string | null
}

/** Egy megjelenítésre és sémába egyaránt kész kérdés-válasz pár. */
export interface PostFaqItem {
  question: string
  answer: string
}

/** Levágott, nem üres szöveg — minden más (üres, csupa szóköz, nem string) `undefined`. */
function trimmedText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const text = value.trim()
  return text.length > 0 ? text : undefined
}

/**
 * ISO-időbélyeg → naptári nap (`YYYY-MM-DD`), érvénytelen értéknél `undefined`.
 *
 * MIÉRT CSAK NAP. A `lastReviewed` várt értéktípusa a schema.org szerint
 * **Date** (nem DateTime) — ellenőrizve 2026-08-21, https://schema.org/lastReviewed.
 * A `datePublished`/`dateModified` ezzel szemben Date ÉS DateTime értéket is
 * elfogad (https://schema.org/datePublished), ezért azokat változtatás nélkül,
 * időzónástul adjuk tovább — a Google Article-dokumentációja kifejezetten
 * ajánlja az időzóna közlését.
 *
 * A naptári nap UTC szerint számolódik, nem a futtató gép helyi zónája
 * szerint. Ez tudatos: a strukturált adatnak minden render-csomóponton
 * ugyanazt kell állítania, egy több régióban futó telepítés nem hirdethet
 * ugyanarról a cikkről két különböző ellenőrzési napot.
 */
function schemaDateOnly(value: unknown): string | undefined {
  const raw = trimmedText(value)
  if (raw === undefined) {
    return undefined
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }
  return parsed.toISOString().slice(0, 10)
}

/** A kiadó — minden cikken ugyanaz az entitás, mint a kezdőlapi Organization. */
function publisherNode(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
  }
}

/** `Person` node a szerzőhöz/lektorhoz; név nélkül `undefined` (nincs üres Person). */
function personNode(person: SchemaPerson | undefined): Record<string, unknown> | undefined {
  const name = trimmedText(person?.name)
  if (name === undefined) {
    return undefined
  }
  const jobTitle = trimmedText(person?.credentials)
  return {
    '@type': 'Person',
    name,
    ...(jobTitle !== undefined ? { jobTitle } : {}),
    url: absoluteUrl(PROFILE_PATH),
  }
}

/**
 * A cikkoldal strukturált adata: EGY entitás, `['Article', 'MedicalWebPage']`
 * kettős típussal.
 *
 * MIÉRT KETTŐS TÍPUS ÉS NEM KÉT NODE. A cikkoldal egyetlen dolgot ír le; két
 * külön ld+json blokk ugyanarról a lapról KÉT entitásnak látszana a gépi
 * olvasó szemében (ugyanaz a hiba, amit a kezdőlapon a duplikált
 * `Organization` okozott — a kurzusoldali `['Course', 'Product']` a repó
 * bevált precedense). A `MedicalWebPage` a `WebPage` altípusa, a `WebPage` és
 * az `Article` egyaránt `CreativeWork`-leszármazott, tehát a kettős típus
 * érvényes. Az `Article`-tag viszi a Google Article rich result jogosultságát,
 * a `MedicalWebPage`-tag pedig két dolgot ad:
 *
 * 1. kimondja a gépi olvasónak, hogy egészségügyi (YMYL) tartalom — E-E-A-T
 *    kontextus;
 * 2. ÉRVÉNYESSÉ TESZI a `lastReviewed` és a `reviewedBy` tulajdonságot, mert
 *    azok a schema.org szerint `WebPage`-tulajdonságok. Pusztán `Article`
 *    típuson mindkettő érvénytelen lenne.
 *
 * A KÉT DÁTUM JELENTÉSE KÜLÖN VAN VÁLASZTVA:
 * - `dateModified` = a dokumentum utolsó módosítása (CMS `updatedAt`),
 * - `lastReviewed` = az utolsó SZAKMAI ellenőrzés napja (`posts.reviewedAt`).
 *
 * A kettő nem keverhető: egy vessző-javítás nem szakmai ellenőrzés. Le nem
 * ellenőrzött cikken `lastReviewed` egyszerűen nincs — ellenőrzés-dátumot
 * ellenőrzés nélkül kiírni tilos.
 *
 * SZERZŐ-TARTALÉK. Szerző nélkül a séma NEM ír `Person`-t a márkanévvel (a
 * Kineticare nem személy — ez volt a korábbi `articleJsonLd` típushibája),
 * hanem `Organization`-re esik vissza; a schema.org `author`-ja mindkét
 * típust engedi.
 *
 * AMI TUDATOSAN NINCS BENNE: `about: MedicalCondition` (gépi formában kódolt
 * klinikai állítás lenne), `citation` (a Lexical-fából nem azonosítható
 * megbízhatóan a forrásjegyzék; a hibás kinyerés rosszabb, mint a hiány),
 * `aggregateRating`/`review` (nincs értékelés-adat, kitalálni tilos),
 * `speakable` és `medicalAudience` (nincs látható megfelelőjük a lapon).
 */
export function postArticleJsonLd(args: {
  post: ArticleSeoPost
  /** A cikk relatív útvonala, pl. `/blog/gipsz-utan`. */
  path: string
  /** A szerző a látható byline-ból; hiányában Organization-tartalék. */
  author?: SchemaPerson
  /** A szakmai lektor (`posts.reviewedBy`) — csak ha tényleg van. */
  reviewer?: SchemaPerson
  /** Az utolsó szakmai ellenőrzés (`posts.reviewedAt`) ISO-értéke. */
  lastReviewed?: string | null
  /** A megosztási kép abszolút URL-je (`resolveOgImageUrl`). */
  imageUrl?: string
}): Record<string, unknown> {
  const { post, path, author, reviewer, lastReviewed, imageUrl } = args
  const description = trimmedText(post.excerpt)
  const datePublished = trimmedText(post.publishedAt)
  const dateModified = trimmedText(post.updatedAt)
  const reviewedBy = personNode(reviewer)
  const reviewedOn = schemaDateOnly(lastReviewed)

  return {
    '@context': 'https://schema.org',
    '@type': ['Article', 'MedicalWebPage'],
    headline: post.title,
    ...(description !== undefined ? { description } : {}),
    inLanguage: ARTICLE_LANGUAGE,
    mainEntityOfPage: absoluteUrl(path),
    ...(datePublished !== undefined ? { datePublished } : {}),
    ...(dateModified !== undefined ? { dateModified } : {}),
    ...(imageUrl !== undefined ? { image: [imageUrl] } : {}),
    author: personNode(author) ?? publisherNode(),
    ...(reviewedBy !== undefined ? { reviewedBy } : {}),
    ...(reviewedOn !== undefined ? { lastReviewed: reviewedOn } : {}),
    publisher: publisherNode(),
  }
}

/**
 * A cikk GYIK-tételei megjelenítésre kész alakban — a látható lista ÉS a
 * FAQPage séma KÖZÖS forrása.
 *
 * MIÉRT EGY FÜGGVÉNY MINDKETTŐRE. Ha a szekció és a séma külön szűrne, a
 * kettő idővel szétcsúszna, és a Google pontosan az ilyen eltérés miatt veti
 * el a strukturált adatot. Így a szétcsúszás szerkezetileg lehetetlen: a
 * komponens egyszer hívja meg, és ugyanazt a tömböt rendereli ki, amit a
 * sémába ad (a `FaqBlock` bevált precedense).
 *
 * Hiányos tétel (üres kérdés VAGY üres válasz) mindkettőből kimarad. A
 * válasz sosem csonkolódik: a csonkolt válasz félreidézhető, és az AI-válaszok
 * pontosan ezeket a kérdés-válasz párokat emelik ki.
 */
export function postFaqItems(faq: ReadonlyArray<PostFaqSource> | null | undefined): PostFaqItem[] {
  const items: PostFaqItem[] = []
  for (const entry of faq ?? []) {
    const question = trimmedText(entry.question)
    const answer = trimmedText(entry.answer)
    if (question === undefined || answer === undefined) {
      continue
    }
    items.push({ question, answer })
    if (items.length === POST_FAQ_MAX_ITEMS) {
      break
    }
  }
  return items
}

/**
 * FAQPage JSON-LD a cikk GYIK-jéhez — üres listánál `undefined`.
 *
 * Az `undefined` nem formalitás: nulla elemű GYIK meghirdetése pontosan az az
 * eltérés a látható tartalomtól, ami miatt a keresők elvetik a strukturált
 * adatot. A hívó komponens ilyenkor sem szekciót, sem sémát nem renderel.
 *
 * ELVÁRÁS-KEZELÉS, KIMONDVA: a Google a FAQ rich resultot 2023 augusztusa óta
 * csak „well-known, authoritative government and health websites" körben
 * jeleníti meg (ellenőrizve 2026-08-21). A Kineticare-nek tehát a találati
 * kártya NEM cél; a FAQPage haszna a GEO-oldal: a kérdés-válasz pár a
 * leggyakrabban kivonatolt egység az AI-válaszokban.
 *
 * A node előállítása a KÖZÖS `faqPageJsonLd`-re megy (kezdőlap, kurzusoldal,
 * FaqBlock): egy séma-alak, egy karbantartási pont.
 */
export function postFaqJsonLd(
  items: ReadonlyArray<PostFaqItem>,
): Record<string, unknown> | undefined {
  if (items.length === 0) {
    return undefined
  }
  return faqPageJsonLd(items)
}
