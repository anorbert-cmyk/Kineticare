/**
 * Barion Pixel — a VÁSÁRLÁSI FOLYAMAT eseményei (Full Pixel).
 *
 * ═══ MIÉRT KÜLÖN, TISZTA MODUL ═══
 * A React-komponensnek nem szabad tudnia, hogyan néz ki egy Barion-esemény.
 * Itt dől el az esemény neve, a KÖTELEZŐ kulcsok készlete és a típusok — a
 * komponens csak annyit mond, hogy „a vevő a pénztárba lépett". A modul
 * DOM-mentes és függőségmentes (a `bp` küldő injektálható), ezért
 * node-környezetben, böngésző nélkül tesztelhető
 * (src/__tests__/barion-esemenyek.test.ts).
 *
 * ═══ A HÍVÁSI ALAK FORRÁSA (nem memóriából, MÉRVE) ═══
 * A docs.barion.com botvédelem mögött van, ezért a szerződést magából a
 * futtatott pixel-kódból olvastuk ki: `curl -s https://pixel.barion.com/bp.js`
 * (VERSION = "0.4.0", 73 518 bájt, olvasható — nem minifikált — forrás).
 * A `handle_message_from_queue(msg)` függvény szerint:
 *   msg[0] = metódus ('track'), msg[1] = eseménynév, msg[2] = adat-objektum,
 * és MINDEN követési ág első sora `if (msg.length !== 3) { hiba }` — vagyis a
 * hívás pontosan három paraméteres: `bp('track', '<esemény>', { … })`.
 *
 * A kulcs-készleteket a `validate(d, event_name, mandatory_keys,
 * type_conversion)` kényszeríti ki, és ez KÉT IRÁNYBAN szigorú:
 *  - hiányzó kötelező kulcs → 10-es hiba, és az esemény EL SEM MEGY
 *    (`return false`, tehát `send_message` nem fut le);
 *  - ISMERETLEN kulcs → 13-as hiba, és a kulcsot a pixel TÖRLI a törzsből
 *    (`delete d[k]`), kivéve az aláhúzással kezdődő saját mezőket.
 * Ezért itt a törzsek nem „bőségesek": pontosan a felismert kulcsokat
 * tartalmazzák. Ami a bp.js `type_conversion` táblájában nincs benne, azt
 * TILOS elküldeni.
 *
 * A bp.js-ből kiolvasott, eseményenkénti szerződés (ezt tükrözik a builderek):
 *  - contentView  — kötelező: id, contentType, name; `contentType: 'Product'`
 *    esetén ezen FELÜL: unitPrice, unit, currency, quantity.
 *    Felismert kulcsok: id, contentType, name, contents, ean, brand, category,
 *    variant, list, positioning, creative, unitPrice, imageUrl, unit, currency,
 *    quantity, step, customerValue.  → `totalItemPrice` és `revenue` NEM!
 *  - initiateCheckout — kötelező: contents, step, revenue, currency.
 *  - addPaymentInfo   — kötelező: contents, step, paymentMethod.
 *  - initiatePurchase / purchase — kötelező: contents, currency, step, revenue.
 *    Ezek felismert kulcsai közt NINCS `id` és NINCS `name` — a tétel-szintű
 *    azonosítás a `contents` tömbben van.
 *  - signUp — kötelező: id, contentType, name. `step`-et NEM ismer.
 *  - contents[] elemei — kötelező: id, contentType, name, unit, unitPrice,
 *    totalItemPrice, currency, quantity.
 *
 * Típus-ellenőrzés (bp.js `type_check`): a `to_str` mezők VALÓDI stringet
 * várnak (a szám-azonosítót tehát stringgé kell alakítani), a `to_float`
 * (unitPrice, totalItemPrice, quantity, revenue) és a `to_int` (step) mezők
 * pedig valódi számot. A `currency` háromkarakteres (format_check), és a
 * `contentType`/`list` értéke kötött listából való.
 *
 * ═══ A KÖVETÉS SOSEM RONTHATJA EL A VÁSÁRLÁST ═══
 * Minden kimenő hívás a `safeSend` burkolóban fut: ha a pixel bármit dob (nincs
 * iframe, blokkolt script, kivételt dobó bővítmény), a hiba itt elnyelődik, és
 * a vásárlási folyamat zavartalanul megy tovább. A builderek `null`-t adnak
 * vissza hiányos adatnál — ilyenkor NEM megy ki csonka esemény (az úgyis a
 * 10-es hibára futna a pixelben).
 *
 * ═══ SZEMÉLYES ADAT ═══
 * Ez a modul e-mailt, nevet, címet, telefonszámot SOHA nem küld. A vevő
 * azonosítása kizárólag a `bp('identity', 'setEncryptedEmail', …)` úton
 * történhet, ami NEM ennek a modulnak a dolga.
 */

import { bp } from './barion-pixel'

/** A Barion Pixel küldő-függvényének alakja (a `bp` globális burkolója). */
export type BarionPixelSend = (...args: readonly unknown[]) => void

/** A követési események metódusa (bp.js: `msg[0]`). */
export const BARION_TRACK_METHOD = 'track'

/** A webshop devizája. Szállítás nincs, ezért `shipping` kulcs sem megy ki. */
export const BARION_CURRENCY = 'HUF'

/**
 * A tétel mennyiségi egysége. Digitális kurzusnál a „darab" a beszédes érték;
 * a mező szabad szöveg (bp.js: `to_str`), a magyar rövidítés a természetes.
 */
export const BARION_UNIT = 'db'

/**
 * A fizetési mód felirata az `addPaymentInfo` eseményhez. Egyetlen mód van: a
 * Barion Smart Gateway bankkártyás fizetése.
 */
export const BARION_PAYMENT_METHOD = 'Bankkártyás fizetés - Barion'

/**
 * A folyamat lépés-sorszámai. A `step` a Barion-tölcsér sorrendjét adja: a
 * pénztár megnyitása az 1., a fizetési mód rögzítése a 2., az átjáróra
 * irányítás a 3., a lezárt vásárlás a 4. lépés.
 *
 * A `purchaseFailed: -1` NEM önkényes: a hivatalos leírás szerint a `purchase`
 * a folyamat UTOLSÓ lépése, és SIKERTELEN fizetésnél `step: -1` megy ki. Ezen
 * a jelzésen múlik, hogy a Barion meg tudja-e különböztetni a bevételt a
 * meghiúsult fizetéstől — elrontva a konverziós adat NÉMÁN hamis lenne.
 */
export const BARION_STEP = {
  initiateCheckout: 1,
  addPaymentInfo: 2,
  initiatePurchase: 3,
  purchase: 4,
  purchaseFailed: -1,
} as const

/** A bp.js által elfogadott `contentType` értékek (in_list ellenőrzés). */
export type BarionContentType =
  | 'Page'
  | 'Product'
  | 'Article'
  | 'Promotion'
  | 'Banner'
  | 'Misc'

/** A bp.js által elfogadott `list` értékek (in_list ellenőrzés). */
export type BarionList =
  | 'HomePage'
  | 'SearchPage'
  | 'ProductPage'
  | 'Recommendation'
  | 'ComparisonPage'
  | 'BasketPage'
  | 'Checkout'
  | 'Misc'

/** Egy tétel a `contents` tömbben — a bp.js kötelező kulcsaival. */
export interface BarionContentItem {
  id: string
  contentType: 'Product'
  name: string
  unit: string
  unitPrice: number
  totalItemPrice: number
  currency: string
  quantity: number
  category?: string
  imageUrl?: string
}

/** A követendő kurzus adatai — ennyit tud a felület minden ponton. */
export interface BarionCourseInput {
  /** A termék adatbázis-azonosítója (a pixelbe stringként megy). */
  id: number
  /** A megjelenített kurzuscím. */
  name: string
  /** Bruttó ár forintban. Ingyenes kurzusnál 0. */
  priceHuf: number
  /** Alapértelmezés 1 — a kurzusból egy darab vásárolható. */
  quantity?: number
  category?: string | null
  imageUrl?: string | null
}

/** A `contentView` esemény törzse (`contentType: 'Product'` ág). */
export interface BarionContentViewPayload {
  contentType: 'Product'
  id: string
  name: string
  currency: string
  quantity: number
  unit: string
  unitPrice: number
  category?: string
  imageUrl?: string
  list?: BarionList
}

/** A tölcsér-események közös törzse (initiateCheckout / initiatePurchase / purchase). */
export interface BarionFunnelPayload {
  contents: BarionContentItem[]
  currency: string
  revenue: number
  step: number
  orderNumber?: string
  list?: BarionList
}

/** Az `addPaymentInfo` törzse — itt a `paymentMethod` a kötelező elem. */
export interface BarionPaymentInfoPayload {
  contents: BarionContentItem[]
  paymentMethod: string
  step: number
  currency?: string
  revenue?: number
  orderNumber?: string
}

/** A `signUp` törzse (`contentType: 'Page'`). */
export interface BarionSignUpPayload {
  contentType: 'Page'
  id: string
  name: string
}

/**
 * Érvényes-e a pénzösszeg. A `null`/`undefined`/NaN/negatív értéket elutasítjuk:
 * a pixel `to_float` mezői valódi számot várnak, és a hibás összeg a
 * bevétel-riportot rontaná el.
 */
function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Érvényes-e a darabszám (pozitív, véges szám). */
function isValidQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Nem üres szöveg → trimmelt érték, egyébként `null`. */
function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Kurzus → `contents` tétel. `null`, ha az adat hiányos (nincs név, nincs
 * érvényes ár, nincs érvényes azonosító) — ilyenkor a hívó NEM küld eseményt.
 *
 * A `totalItemPrice` a `unitPrice * quantity` szorzat: a pixel nem számol
 * helyettünk, és a két mező egymásnak ellentmondó értéke a riportban néma
 * eltérésként jelenne meg.
 */
export function buildContentItem(course: BarionCourseInput): BarionContentItem | null {
  const name = cleanText(course.name)
  const quantity = course.quantity ?? 1
  if (
    name === null ||
    !Number.isInteger(course.id) ||
    course.id <= 0 ||
    !isValidAmount(course.priceHuf) ||
    !isValidQuantity(quantity)
  ) {
    return null
  }
  const category = cleanText(course.category)
  const imageUrl = cleanText(course.imageUrl)
  return {
    id: String(course.id),
    contentType: 'Product',
    name,
    unit: BARION_UNIT,
    unitPrice: course.priceHuf,
    totalItemPrice: course.priceHuf * quantity,
    currency: BARION_CURRENCY,
    quantity,
    ...(category !== null ? { category } : {}),
    ...(imageUrl !== null ? { imageUrl } : {}),
  }
}

/**
 * A `contentView` törzse a kurzus (TERMÉK) oldalára.
 *
 * `totalItemPrice` SZÁNDÉKOSAN nincs benne: a bp.js `contentView`-ágának
 * `type_conversion` táblája nem ismeri, tehát a pixel 13-as hibát adna rá és
 * törölné a mezőt. A termék-ág többlet-kötelezői (unitPrice, unit, currency,
 * quantity) viszont mind itt vannak.
 */
export function buildContentViewPayload(
  course: BarionCourseInput,
  options: { list?: BarionList } = {},
): BarionContentViewPayload | null {
  const item = buildContentItem(course)
  if (item === null) {
    return null
  }
  return {
    contentType: 'Product',
    id: item.id,
    name: item.name,
    currency: item.currency,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    ...(item.category !== undefined ? { category: item.category } : {}),
    ...(item.imageUrl !== undefined ? { imageUrl: item.imageUrl } : {}),
    ...(options.list !== undefined ? { list: options.list } : {}),
  }
}

/** A tölcsér-törzs összeállítása egyetlen kurzusból (a kosarunk egytételes). */
function buildFunnelPayload(
  course: BarionCourseInput,
  step: number,
  options: { orderNumber?: string | null; list?: BarionList } = {},
): BarionFunnelPayload | null {
  const item = buildContentItem(course)
  if (item === null) {
    return null
  }
  const orderNumber = cleanText(options.orderNumber)
  return {
    contents: [item],
    currency: BARION_CURRENCY,
    revenue: item.totalItemPrice,
    step,
    ...(orderNumber !== null ? { orderNumber } : {}),
    ...(options.list !== undefined ? { list: options.list } : {}),
  }
}

/** `initiateCheckout` — a pénztár megnyitása (1. lépés). */
export function buildInitiateCheckoutPayload(
  course: BarionCourseInput,
): BarionFunnelPayload | null {
  return buildFunnelPayload(course, BARION_STEP.initiateCheckout, { list: 'Checkout' })
}

/** `addPaymentInfo` — a fizetési mód rögzítése (2. lépés). */
export function buildAddPaymentInfoPayload(
  course: BarionCourseInput,
): BarionPaymentInfoPayload | null {
  const item = buildContentItem(course)
  if (item === null) {
    return null
  }
  return {
    contents: [item],
    paymentMethod: BARION_PAYMENT_METHOD,
    step: BARION_STEP.addPaymentInfo,
    currency: BARION_CURRENCY,
    revenue: item.totalItemPrice,
  }
}

/**
 * `initiatePurchase` — a vevő átirányítása a Barion Smart Gateway-re (3. lépés).
 * A rendelésszám itt már ismert, ezért `orderNumber`-rel megy ki: ez köti össze
 * a tölcsér ezen lépését a később beérkező `purchase` eseménnyel.
 */
export function buildInitiatePurchasePayload(
  course: BarionCourseInput,
  orderNumber: string | null,
): BarionFunnelPayload | null {
  return buildFunnelPayload(course, BARION_STEP.initiatePurchase, { orderNumber })
}

/**
 * `purchase` — a folyamat ZÁRÓ eseménye a köszönőoldalon.
 *
 * SIKERTELEN fizetésnél `step: -1` megy ki (és a `revenue` ilyenkor is a
 * meghiúsult kosárértéket írja le — a `step` mondja meg, hogy ez NEM bevétel).
 */
export function buildPurchasePayload(
  course: BarionCourseInput,
  input: { orderNumber: string | null; succeeded: boolean },
): BarionFunnelPayload | null {
  return buildFunnelPayload(
    course,
    input.succeeded ? BARION_STEP.purchase : BARION_STEP.purchaseFailed,
    { orderNumber: input.orderNumber },
  )
}

/**
 * `signUp` — regisztráció / belépés / hírlevél-feliratkozás.
 *
 * `contentType: 'Page'`, mert nem termékről van szó. A bp.js signUp-ága a
 * `step` kulcsot NEM ismeri, ezért az szándékosan hiányzik a törzsből.
 */
export function buildSignUpPayload(input: {
  id: string
  name: string
}): BarionSignUpPayload | null {
  const id = cleanText(input.id)
  const name = cleanText(input.name)
  if (id === null || name === null) {
    return null
  }
  return { contentType: 'Page', id, name }
}

/**
 * A KIMENŐ hívás egyetlen kapuja.
 *
 * Két dolgot garantál: (1) a hívási alak mindig háromelemű
 * (`'track'`, eseménynév, törzs) — a bp.js `msg.length !== 3` ellenőrzése így
 * sosem bukik; (2) a küldés SOSEM dob. A követés a vásárlás mellékszála: ha a
 * pixel hibázik, a vevő ebből semmit nem vehet észre.
 */
export type BarionEventPayload =
  | BarionContentViewPayload
  | BarionFunnelPayload
  | BarionPaymentInfoPayload
  | BarionSignUpPayload

export function sendBarionEvent(
  eventName: string,
  payload: BarionEventPayload | null,
  send: BarionPixelSend = bp,
): boolean {
  if (payload === null) {
    return false
  }
  try {
    send(BARION_TRACK_METHOD, eventName, payload)
    return true
  } catch {
    return false
  }
}

/**
 * A küldők `send` paramétere SZÁNDÉKOSAN az utolsó, alapértékkel: a hívó
 * felület egyszerűen `trackContentView(course)`-t ír, a teszt viszont saját
 * kémet ad be — a hívási alakot így valódi állítással lehet ellenőrizni,
 * globális `window.bp` maszkolása nélkül (a vitest `environment: 'node'`).
 */

/** Termékoldal-megtekintés küldése. */
export function trackContentView(
  course: BarionCourseInput,
  options: { list?: BarionList } = {},
  send: BarionPixelSend = bp,
): boolean {
  return sendBarionEvent('contentView', buildContentViewPayload(course, options), send)
}

/** A pénztár megnyitásának küldése. */
export function trackInitiateCheckout(
  course: BarionCourseInput,
  send: BarionPixelSend = bp,
): boolean {
  return sendBarionEvent('initiateCheckout', buildInitiateCheckoutPayload(course), send)
}

/** A fizetési mód rögzítésének küldése. */
export function trackAddPaymentInfo(
  course: BarionCourseInput,
  send: BarionPixelSend = bp,
): boolean {
  return sendBarionEvent('addPaymentInfo', buildAddPaymentInfoPayload(course), send)
}

/** Az átjáróra irányítás küldése. */
export function trackInitiatePurchase(
  course: BarionCourseInput,
  orderNumber: string | null,
  send: BarionPixelSend = bp,
): boolean {
  return sendBarionEvent(
    'initiatePurchase',
    buildInitiatePurchasePayload(course, orderNumber),
    send,
  )
}

/** A lezárt (sikeres VAGY sikertelen) vásárlás küldése. */
export function trackPurchase(
  course: BarionCourseInput,
  input: { orderNumber: string | null; succeeded: boolean },
  send: BarionPixelSend = bp,
): boolean {
  return sendBarionEvent('purchase', buildPurchasePayload(course, input), send)
}

/** Regisztráció / belépés / hírlevél-feliratkozás küldése. */
export function trackSignUp(
  input: { id: string; name: string },
  send: BarionPixelSend = bp,
): boolean {
  return sendBarionEvent('signUp', buildSignUpPayload(input), send)
}

/* ════════════════════════════════════════════════════════════════════════
   A KOSÁR ÁTMENTÉSE A BARION-ÁTIRÁNYÍTÁSON
   ════════════════════════════════════════════════════════════════════════

   A köszönőoldal (`/fizetes/koszonom`) a Barion felől, KERESZT-OLDALI
   navigációval nyílik meg, és a rendelés-státusz végpontja csak a státuszt és
   a termék-azonosítót adja vissza — kurzuscímet és árat NEM. A `purchase`
   eseménynek viszont KÖTELEZŐ a `contents`, a `revenue` és a `currency`.

   Ezért a pénztár az átirányítás előtt eltesz egy pillanatképet a kosárról,
   rendelésszámmal kulcsolva, és a köszönőoldal ezt olvassa vissza. A tároló
   `sessionStorage`: a Barion ugyanabba a fülbe irányít vissza, tehát az adat
   ott van, viszont a fül bezárásával el is tűnik — a vevő gépén nem marad
   hátra semmi. Személyes adat NEM kerül bele (csak termékazonosító, cím, ár).

   Ha a pillanatkép hiányzik (más fülön/eszközön megnyitott köszönőoldal,
   kikapcsolt tároló), a `purchase` esemény KIMARAD. Ez tudatos döntés: egy
   kötelező kulcsok nélküli esemény a pixelben úgyis 10-es hibára futna, és
   csonka bevételi adatot rögzítene. */

/** A pillanatkép `sessionStorage`-kulcsának előtagja. */
export const BARION_CHECKOUT_SNAPSHOT_PREFIX = 'kc_barion_checkout:'

/** A tárolótól elvárt minimális felület (a `Storage` tesztelhető metszete). */
export interface BarionSnapshotStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function barionSnapshotKey(orderNumber: string): string {
  return `${BARION_CHECKOUT_SNAPSHOT_PREFIX}${orderNumber}`
}

/** A pillanatkép eltevése. Hibát SOSEM dob (kvóta, letiltott tároló). */
export function rememberCheckoutSnapshot(
  storage: BarionSnapshotStorage | null,
  orderNumber: string,
  course: BarionCourseInput,
): boolean {
  const key = cleanText(orderNumber)
  if (storage === null || key === null || buildContentItem(course) === null) {
    return false
  }
  try {
    storage.setItem(
      barionSnapshotKey(key),
      JSON.stringify({
        id: course.id,
        name: course.name,
        priceHuf: course.priceHuf,
        quantity: course.quantity ?? 1,
      }),
    )
    return true
  } catch {
    return false
  }
}

/**
 * A pillanatkép visszaolvasása. `null`, ha nincs, sérült, vagy nem áll össze
 * belőle érvényes tétel — a hívó ilyenkor nem küld `purchase` eseményt.
 */
export function readCheckoutSnapshot(
  storage: BarionSnapshotStorage | null,
  orderNumber: string,
): BarionCourseInput | null {
  const key = cleanText(orderNumber)
  if (storage === null || key === null) {
    return null
  }
  let raw: string | null = null
  try {
    raw = storage.getItem(barionSnapshotKey(key))
  } catch {
    return null
  }
  if (raw === null) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null
  }
  const record = parsed as Record<string, unknown>
  const candidate: BarionCourseInput = {
    id: typeof record.id === 'number' ? record.id : 0,
    name: typeof record.name === 'string' ? record.name : '',
    priceHuf: typeof record.priceHuf === 'number' ? record.priceHuf : Number.NaN,
    quantity: typeof record.quantity === 'number' ? record.quantity : 1,
  }
  return buildContentItem(candidate) === null ? null : candidate
}

/** A pillanatkép eldobása (a `purchase` kiküldése után). */
export function forgetCheckoutSnapshot(
  storage: BarionSnapshotStorage | null,
  orderNumber: string,
): void {
  const key = cleanText(orderNumber)
  if (storage === null || key === null) {
    return
  }
  try {
    storage.removeItem(barionSnapshotKey(key))
  } catch {
    // A takarítás elmaradása nem hiba: a sessionStorage a fül bezárásakor
    // úgyis kiürül.
  }
}

/** A böngésző `sessionStorage`-a, SSR-ben és letiltott tárolónál `null`. */
export function browserSnapshotStorage(): BarionSnapshotStorage | null {
  try {
    if (typeof window === 'undefined' || window.sessionStorage === undefined) {
      return null
    }
    return window.sessionStorage
  } catch {
    return null
  }
}
