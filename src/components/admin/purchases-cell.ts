import type { CourseStudentStatus } from '../../lib/admin/course-progress-stats'
import type { UserCourseProgressEntry } from '../../lib/admin/user-progress-contract'
import { statusLabel } from './course-progress-view'

/**
 * A „Megvásárolt kurzusok" admin-megjelenítés TISZTA (mellékhatásmentes)
 * segédfüggvényei — a Felhasználók lista-oszlopához és a felhasználó lapján
 * lévő áttekintő panelhez.
 *
 * Külön modulban él a kliens-komponensektől, hogy egységtesztelhető legyen (a
 * @payloadcms/ui-s komponensek node-környezetű tesztben nem tölthetők be — az
 * order-items-cell.ts mintája).
 *
 * MIÉRT KELL EGYÁLTALÁN: a Payload gyári relationship-cellája a kapcsolt
 * collection `useAsTitle` mezőjével címkéz, ami a kurzusoknál szándékosan a
 * `sku` (technikai azonosító). A tulajdonosnak viszont a KURZUS CÍME mond
 * valamit — ezért a cella a `displayTitle` → `sku` → `Kurzus #id` láncot
 * használja, pontosan úgy, ahogy a storefront `courseTitle` (src/lib/courses.ts).
 * A két lánc egyezését teszt rögzíti (purchases-cell.test.ts), hogy ne
 * csússzanak szét.
 */

/** Üres/hiányzó hozzáférés-lista helyőrzője. */
export const PURCHASES_EMPTY_PLACEHOLDER = '—'

/** A kurzus-címkéhez szükséges minimális termék-alak. */
export interface PurchaseProductLike {
  id: number | string
  sku?: unknown
  displayTitle?: unknown
}

/**
 * Egy kurzus megjelenő neve: `displayTitle` → `sku` → `Kurzus #id`.
 * (A storefront `courseTitle` láncával azonos.)
 */
export function formatCourseLabel(product: PurchaseProductLike): string {
  const displayTitle = typeof product.displayTitle === 'string' ? product.displayTitle.trim() : ''
  if (displayTitle.length > 0) {
    return displayTitle
  }
  const sku = typeof product.sku === 'string' ? product.sku.trim() : ''
  return sku.length > 0 ? sku : `Kurzus #${product.id}`
}

/**
 * A hozzáférés-lista azonosítói.
 *
 * A bemenet futásidőben többféle: a lista-nézet nyers azonosítókat ad
 * (`[11, 12]`), a szerkesztő-nézet feloldott dokumentumokat is adhat
 * (`[{ id: 11, … }]`), polimorf kapcsolatnál pedig `{ relationTo, value }`
 * alakot. Mindhármat elviseli, ismeretlen elemet némán kihagy — egy hibás
 * elem nem omlaszthatja el a listát.
 */
export function readPurchaseIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const ids: string[] = []
  for (const entry of value) {
    if (typeof entry === 'number' || typeof entry === 'string') {
      const id = String(entry).trim()
      if (id !== '') {
        ids.push(id)
      }
      continue
    }
    if (typeof entry !== 'object' || entry === null) {
      continue
    }
    const record = entry as Record<string, unknown>
    const candidate = 'value' in record ? record.value : record.id
    if (typeof candidate === 'number' || typeof candidate === 'string') {
      const id = String(candidate).trim()
      if (id !== '') {
        ids.push(id)
      }
      continue
    }
    if (typeof candidate === 'object' && candidate !== null) {
      const nested = (candidate as Record<string, unknown>).id
      if (typeof nested === 'number' || typeof nested === 'string') {
        ids.push(String(nested))
      }
    }
  }
  return ids
}

/**
 * A termék-lekérdezés (`GET /api/products`) válaszából azonosító → cím térkép.
 * Hibás vagy hiányos elemet kihagy.
 */
export function readProductTitles(body: unknown): Map<string, string> {
  const titles = new Map<string, string>()
  if (typeof body !== 'object' || body === null) {
    return titles
  }
  const docs = (body as Record<string, unknown>).docs
  if (!Array.isArray(docs)) {
    return titles
  }
  for (const doc of docs) {
    if (typeof doc !== 'object' || doc === null) {
      continue
    }
    const record = doc as Record<string, unknown>
    const id = record.id
    if (typeof id !== 'number' && typeof id !== 'string') {
      continue
    }
    titles.set(String(id), formatCourseLabel({ id, sku: record.sku, displayTitle: record.displayTitle }))
  }
  return titles
}

/**
 * A megjelenítendő sorok CÍMEI (haladás nélkül).
 *
 * - üres lista → egyetlen „—",
 * - ismert azonosító → a kurzus címe,
 * - még be nem töltött (vagy törölt) kurzus → `Kurzus #<id>`, hogy a sor
 *   akkor is azonosítható maradjon, ha a cím nem érhető el.
 *
 * A `formatPurchaseRows` cím-oszlopát adja vissza, tehát a két függvény nem
 * tud szétcsúszni: a haladás-kiegészítés bevezetésekor ez volt a KOCKÁZAT
 * (két, egymástól független címképző lánc), ezért egyetlen forrásra vezettük
 * vissza. A felhasználó lapján lévő áttekintő panel változatlanul ezt hívja:
 * ott nincs haladás-adat, és nem is kell.
 */
export function formatPurchaseLabels(
  value: unknown,
  titles: ReadonlyMap<string, string>,
): string[] {
  return formatPurchaseRows(value, titles, null).map((row) => row.title)
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HALADÁS A KURZUS MELLETT (Felhasználók lista)
 *
 * A vezetői döntés (`docs/statisztika-audit-2026-08-21.md` §2): a MEGLÉVŐ
 * „Megvásárolt kurzusok" oszlop bővül, új oszlop NEM jön, és a haladás
 * KURZUSONKÉNTI sorban áll, nem átlagként. A sor alakja ott szó szerint:
 *
 *   Otthoni KézRehab Program · 45% · folyamatban
 *   SOS KézRelax · 0% · nem kezdte el
 *
 * Miért nincs átlag: három kurzusnál a súlyozott átlag olyan számot mutatna,
 * ami egyetlen kurzusra sem igaz. A kérdés („hol tart?") kurzusonként
 * értelmes, tehát kurzusonként is válaszolunk rá.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * A sor három adatát elválasztó jel: KÖZÉPPONT (U+00B7), szóközök között.
 *
 * NEM gondolatjel és NEM kvirtmínusz: a magyar mikroszöveg-szabályzat szerint
 * a kvirtmínusz (U+2014) magyar szövegben nem írásjel, töltelék-elválasztóként
 * pedig a gondolatjel is tilos (`docs/ui-sztenderdek.md` §3.1.1–3.1.3). A
 * középpont semleges listaelválasztó, a repó doksijai is ezt használják, és a
 * vezetői döntés mintasora is ezzel íródott.
 */
export const PROGRESS_SEPARATOR = '·'

/** Igaz, ha az érték a három ismert állapot egyike. */
export function isCourseStudentStatus(value: unknown): value is CourseStudentStatus {
  return value === 'nem-kezdte' || value === 'folyamatban' || value === 'befejezte'
}

/**
 * Azonosító olvasása ISMERETLEN értékből: pozitív egész, vagy `null`.
 *
 * A Postgres-adapter számot ad, de a Payload `rowData.id` típusa
 * `Record<string, any>`-ből jön (node_modules/payload/dist/admin/elements/
 * Cell.d.ts), és a REST-válaszok szöveges azonosítót is hordozhatnak — a
 * szám alakú szöveget ezért elfogadjuk. Ami nem pozitív egész, az `null`:
 * hibás azonosítóval nem indítunk kérést.
 */
export function readEntityId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

/**
 * A lista-sor felhasználó-azonosítója a Payload `rowData` propjából.
 *
 * MÉRVE (@payloadcms/ui 3.88.0, providers/TableColumns/buildColumnState/
 * renderCell.js): az egyedi Cell a `cellClientProps`-ot kapja, amelyben
 * `rowData: doc` — a sor TELJES dokumentuma. A prop mégis `unknown`-ként
 * érkezik ide, mert a Payload típusa `Record<string, any>`, az `any` pedig
 * tilos (CLAUDE.md, kódolási konvenciók). Hiányzó vagy hibás `rowData`
 * esetén `null`: a cella ilyenkor haladás nélkül, a mai alakjában jelenik
 * meg, és nem indít kérést.
 */
export function readRowUserId(rowData: unknown): number | null {
  if (typeof rowData !== 'object' || rowData === null) {
    return null
  }
  return readEntityId((rowData as Record<string, unknown>).id)
}

/**
 * Egy haladás-bejegyzés ELLENŐRZÖTT alakja, vagy `null`.
 *
 * Ez az EGYETLEN hely, ahol a bejegyzés érvényessége eldől — a betöltő
 * (user-progress-client.ts) és a formázó is ezt hívja, tehát nem tud
 * kétféle „érvényes" fogalom kialakulni.
 *
 * Hiányzó vagy ismeretlen `status`, nem szám `percent`, hibás `productId`:
 * a bejegyzés kiesik, a kurzus sora pedig a haladás előtti alakját hozza
 * (csak a cím). Ez SZÁNDÉKOS: a `statusLabel` `default` ága „Nem kezdte el"-t
 * adna egy ismeretlen értékre is, vagyis a felület egy konkrét emberről
 * állítana valótlant. Inkább nem mondunk semmit, mint rosszat.
 *
 * A százalék szorítása (0–100) és egészre kerekítése MEGJELENÍTÉS, nem
 * számítás: a haladást a szerver adja készen, itt csak azt biztosítjuk, hogy
 * egy szerződésszegő érték se rajzolhasson „−4%"-ot vagy „45,6%"-ot a
 * listába. Ugyanezt a szorítást végzi a panel `ringGeometry`-je is
 * (course-progress-view.ts).
 */
export function normalizeProgressEntry(value: unknown): UserCourseProgressEntry | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const record = value as Record<string, unknown>
  const productId = readEntityId(record.productId)
  if (productId === null) {
    return null
  }
  const status = record.status
  if (!isCourseStudentStatus(status)) {
    return null
  }
  const rawPercent = record.percent
  if (typeof rawPercent !== 'number' || !Number.isFinite(rawPercent)) {
    return null
  }
  const percent = Math.round(Math.min(100, Math.max(0, rawPercent)))
  return { productId, percent, status }
}

/**
 * Az állapot MONDATKÖZI, kisbetűs alakja („folyamatban", „nem kezdte el").
 *
 * A szótár NEM íródik újra: a felirat a Kurzus-haladás panel `statusLabel`
 * függvényéből jön, csak a kezdőbetűje lesz kicsi. Így a lista és a panel
 * ugyanazt a szót használja ugyanarra az állapotra (WCAG 2.2 SC 3.2.4,
 * Consistent Identification:
 * https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html),
 * és egy jövőbeli átfogalmazás egyszerre viszi mindkét felületet.
 *
 * Miért kicsi a kezdőbetű: a felirat itt nem önálló címke, hanem egy sor
 * harmadik tagmondata („Otthoni KézRehab Program · 45% · folyamatban") — a
 * mondat közepén nagy kezdőbetű a magyar helyesírás szerint hibás volna.
 *
 * A bontás kódpontonként történik (`[...label]`), nem `charAt(0)`-lal: így
 * egy jövőbeli, BMP-n kívüli kezdőkarakter sem szakadna ketté.
 */
export function inlineStatusLabel(status: CourseStudentStatus): string {
  const [first = '', ...rest] = statusLabel(status)
  return first.toLocaleLowerCase('hu-HU') + rest.join('')
}

/** Egy megjelenítendő sor a „Megvásárolt kurzusok" cellában. */
export interface PurchaseRow {
  /** A kurzus címe (`displayTitle` → `sku` → `Kurzus #id`). */
  title: string
  /** Kerekített százalék, ha van értelmezhető haladás-adat; egyébként `null`. */
  percent: number | null
  /** Az állapot, ha van értelmezhető haladás-adat; egyébként `null`. */
  status: CourseStudentStatus | null
  /** A sor teljes, megjelenítendő szövege — a komponens ezt írja ki. */
  text: string
}

/** Kurzus-azonosító → haladás, csak az ÉRVÉNYES bejegyzésekből. */
function indexProgress(
  progress: readonly UserCourseProgressEntry[] | null | undefined,
): Map<string, UserCourseProgressEntry> {
  const byProduct = new Map<string, UserCourseProgressEntry>()
  if (!Array.isArray(progress)) {
    return byProduct
  }
  for (const candidate of progress) {
    const entry = normalizeProgressEntry(candidate)
    if (entry !== null) {
      byProduct.set(String(entry.productId), entry)
    }
  }
  return byProduct
}

/**
 * A cella sorai, kurzusonként, a haladással kiegészítve.
 *
 * A haladást minden sor a SAJÁT `productId`-je alapján keresi meg. Ha arra a
 * kurzusra nincs (még be nem töltött, a szerver nem ismeri, vagy értelmezhetetlen)
 * bejegyzés, a sor a haladás előtti viselkedést hozza: csak a cím. Ezért nincs
 * betöltés-jelző és helyfoglaló sem — a cella a betöltés alatt pontosan úgy néz
 * ki, mint eddig, majd a szöveg kiegészül. Ugrálás (layout shift) így nem
 * keletkezik a lista sűrűjében.
 *
 * A haladás-bejegyzések között lehet olyan kurzus is, amit a felhasználó nem
 * vett meg (vagy már nem szerepel a hozzáférés-listáján): az ilyen bejegyzés
 * egyszerűen nem talál sort, tehát nem jelenik meg. A sorokat MINDIG a
 * hozzáférés-lista határozza meg, nem a haladás-válasz.
 *
 * @param value a `purchases` cellData (nyers azonosítók vagy feloldott dokumentumok)
 * @param titles azonosító → kurzuscím (`loadCourseTitles`)
 * @param progress a felhasználó kurzus-haladásai, vagy `null`, ha nincs (még) adat
 */
export function formatPurchaseRows(
  value: unknown,
  titles: ReadonlyMap<string, string>,
  progress: readonly UserCourseProgressEntry[] | null | undefined,
): PurchaseRow[] {
  const ids = readPurchaseIds(value)
  if (ids.length === 0) {
    return [
      {
        title: PURCHASES_EMPTY_PLACEHOLDER,
        percent: null,
        status: null,
        text: PURCHASES_EMPTY_PLACEHOLDER,
      },
    ]
  }
  const byProduct = indexProgress(progress)
  return ids.map((id) => {
    const title = titles.get(id) ?? `Kurzus #${id}`
    const entry = byProduct.get(id)
    if (entry === undefined) {
      return { title, percent: null, status: null, text: title }
    }
    const text = [
      title,
      `${String(entry.percent)}%`,
      inlineStatusLabel(entry.status),
    ].join(` ${PROGRESS_SEPARATOR} `)
    return { title, percent: entry.percent, status: entry.status, text }
  })
}
