/**
 * Tulajdonos által jóváhagyott, EGYSZERI backfill: a rendelés-tételek hiányzó
 * `priceHufSnapshot` értékének pótlása a rendelés SAJÁT végösszegéből.
 *
 * ═══ MIÉRT KELL ═══
 * A T-017 item-szintű snapshot (`orders.items[].priceHufSnapshot`) backfill
 * NÉLKÜL került be, és az `orderIntegrityBeforeChange` hook KIZÁRÓLAG
 * create-kor tölt (src/lib/order-integrity.ts) — a korábbi rendeléseknél a
 * mező ezért NULL maradt.
 *
 * A bevétel-riport havi sorai emiatt már nem veszítenek pénzt: az F3-javítás
 * óta a tételekből számolt 0 Ft helyett a rendelés-szintű `totalHufSnapshot`
 * számít (src/lib/statistics/revenue.ts). A KURZUS-BONTÁS
 * (`aggregateCourseRevenue`) viszont hiányos marad ezeknél a soroknál: abból
 * a tartalékból nem gyártunk kurzus-sort, mert az kitalált adat lenne. Ez a
 * script pontosan ezt a hiányt zárja be — kitalálás nélkül.
 *
 * ═══ HONNAN JÖN AZ ÁR (vezetői döntés, KÖTELEZŐ) ═══
 * KIZÁRÓLAG a rendelés saját `totalHufSnapshot` mezőjéből. SOHA a termék MAI
 * árából: a `products.priceInHUF` azóta változhatott, és a mai árral
 * visszaírni a történelmet meghamisítaná a bevételt. Ha egy rendelésnél a
 * `totalHufSnapshot` hiányzik vagy nem pozitív, a rendelés KIMARAD, és a
 * jelentésben nevesítve szerepel — azt ember nézi meg.
 *
 * ═══ KAPU ═══
 * Alapértelmezésben PRÓBAFUTÁS (dry-run): a script mindent kiszámol és
 * naplóz, de EGYETLEN írás sem történik. A tényleges íráshoz:
 *
 *   npm run backfill:ar-snapshot
 *     → próbafutás; kiírja, mit tenne, és MIÉRT hagy ki bármit.
 *   OWNER_BACKFILL_CONFIRM=igen npm run backfill:ar-snapshot
 *     → tényleges írás, a végén összesítés és egy `OWNER_BACKFILL_OK`
 *       naplósor (erre lehet rákeresni a futás naplójában).
 *
 * A kapu mintája a tartalom-javító scripté (src/scripts/apply-owner-content.ts
 * `kapuNyitva`, `OWNER_CONTENT_CONFIRM`): adatot módosító script sosem írhat
 * kifejezett kérés nélkül. ÉLES FUTÁS ELŐTT MENTÉS KÖTELEZŐ:
 * `npm run backup:db` (docs/adatbazis-mentes.md).
 *
 * ═══ IDEMPOTENCIA ═══
 * A script CSAK HIÁNYZÓ értéket tölt. Ha egy tételnek már van
 * `priceHufSnapshot` értéke — akár 0 (ingyenes kurzus) —, ahhoz hozzá sem ér.
 * Másodszor lefuttatva ezért nulla írást tervez; a kimenetben ugyanazok az
 * indokolt kihagyások maradnak.
 *
 * ═══ MIÉRT NEM TÖR INTEGRITÁST AZ ÍRÁS (mérve, 2026-08-21) ═══
 *  1. Az `orderIntegrityBeforeChange` hook `operation !== 'create'` esetén
 *     azonnal visszatér (src/lib/order-integrity.ts) — update-kor tehát SEM a
 *     rendelésszám, SEM a `totalHufSnapshot`, SEM az `amount`, SEM az
 *     item-snapshotok nem számolódnak újra. A rendelés végösszege érintetlen.
 *  2. A plugin gyári orders-collectionje NEM hoz saját hookot
 *     (node_modules/@payloadcms/plugin-ecommerce/dist/collections/orders/
 *     createOrdersCollection.js — nincs benne `hooks` kulcs), tehát a
 *     beforeChange-láncban csak a fenti, update-kor tétlen hook áll.
 *  3. Az audit-plugin `afterChange` hookja orders-update esetén CSAK a
 *     refund-mezők (`refundReason`, `refundedAt`) változására ír naplósort
 *     (src/plugins/audit.ts `auditActionsForChange`) — ez a backfill egyiket
 *     sem érinti, tehát audit-bejegyzés sem keletkezik.
 *  4. A `priceHufSnapshot` és a `titleSnapshot` mező `create`/`update`
 *     access-e zárt (src/plugins/ecommerce.ts). A Local API `overrideAccess:
 *     true` mellett a mezőszintű access nem fut — ezért tud a script írni,
 *     miközben a HTTP-felület felől a mező továbbra is zárt marad.
 *  5. A TELJES `items` tömböt írjuk vissza, MEGTARTOTT sor-azonosítókkal. Ez
 *     nem stílus kérdése: a drizzle-adapter update-kor TÖRLI a tömb összes
 *     sorát, majd újra beszúrja őket
 *     (node_modules/@payloadcms/drizzle/dist/upsertRow/
 *     deleteExistingArrayRows.js + insertArrays.js). Részleges tömb írása
 *     tehát tételsorokat VESZÍTENE el, hiányzó `id` mellett pedig a sorok új
 *     azonosítót kapnának. A script ezért minden sort változatlanul
 *     továbbad (`...item`), és csak a hiányzó mezőt tölti ki.
 *  6. Az érintett rendelések `updatedAt` mezője frissül — ez a Local API-n át
 *     nem kerülhető meg. Adatot nem érint, de a rendelés-lista rendezésében
 *     látszik.
 *
 * ═══ MENNYISÉG (`quantity`) ═══
 * A hiányzó mennyiség KÜLÖN, jelentett műveletként kap 1-es értéket — ugyanaz
 * a szabály, amivel maga a `totalHufSnapshot` képződött
 * (src/lib/order-integrity.ts: `quantity > 0 ? quantity : 1`). A gyakorlatban
 * ez védőháló: az `orders_items.quantity` oszlop
 * `numeric DEFAULT 1 NOT NULL` (20260729_231123_initial_schema), tehát tényleg
 * hiányzó érték nem fordulhat elő. JELEN LÉVŐ, de nem pozitív mennyiségnél a
 * script KIHAGY: a mező `min: 1` validációja miatt az ilyen sort tartalmazó
 * tömb visszaírása amúgy is elbukna, a 0 → 1 „javítás” pedig már kitalált adat
 * lenne.
 *
 * ═══ HASZNÁLAT ═══
 *   npm run backfill:ar-snapshot                       # próbafutás
 *   npm run backfill:ar-snapshot -- --max=50000        # magasabb felső korlát
 *   OWNER_BACKFILL_CONFIRM=igen npm run backfill:ar-snapshot
 *
 * Kilépési kódok:
 *   0 — a futás végigment (a kihagyások NEM hibák, azokat ember nézi meg)
 *   1 — írási hiba történt, vagy a beolvasás a felső korlátnál csonkolt
 *
 * Útmutató: docs/ar-snapshot-backfill.md
 */

import { pathToFileURL } from 'node:url'

import { getPayload, type Payload } from 'payload'

import { createLogger, type Logger } from '../lib/logger'
// A lapozó-segéd a statisztika-lekérdezésből jön (felső korlátos, csonkolást
// jelző beolvasás). Szándékosan NEM másoljuk le: egy második, önálló
// lapozó-implementáció külön karbantartandó hibaforrás lenne.
import { readStatisticsPages } from '../lib/statistics/query'
import config from '../payload.config'
import type { Order } from '../payload-types'

/** Egy lapon beolvasott rendelés. */
export const BACKFILL_LAPMERET = 200
/** Legfeljebb ennyi rendelést dolgozunk fel egy futásban (nincs `limit: 0`). */
export const BACKFILL_RENDELES_MAX = 20_000

/**
 * Determinisztikus rendezés a lapozáshoz: az `id` egyedi (elsődleges kulcs),
 * és a script nem módosítja — a lapok határa így akkor sem csúszik el, ha
 * közben írunk. (A `-createdAt` itt rossz választás lenne: azonos időbélyegű
 * rendeléseknél tiebreaker nélkül sorok eshetnének ki a feldolgozásból.)
 */
const BACKFILL_SORT = 'id'

/**
 * Csak a szükséges mezők. A tulajdonos-only mezőket (`refunds`,
 * `customerSnapshot`, `ipAddress`, `invoiceNumber`, `barionPaymentId`) NEM
 * kérjük le — ugyanaz a szemlélet, mint a statisztika-lekérdezésben.
 */
const BACKFILL_SELECT = {
  orderNumber: true,
  status: true,
  totalHufSnapshot: true,
  items: true,
} as const

/**
 * KIZÁRÓLAG a fizetett rendelések.
 *
 * ═══ MIÉRT SZŰKÍTÜNK (vezetői döntés) ═══
 * A backfill célja EGY dolog: a bevétel-riport kurzus-bontása legyen teljes a
 * régi rendeléseknél is. Az a riport pedig kizárólag `paid` rendelést számol
 * (src/lib/statistics/revenue.ts), tehát a többi státusz megírása egyetlen
 * megjelenített számot sem javítana.
 *
 * A szűkítés nem kényelmi kérdés, hanem KOCKÁZAT-CSÖKKENTÉS. A Payload
 * tömb-írása az adatbázisban törlés + újraszúrás
 * (@payloadcms/drizzle: deleteExistingArrayRows → insertArrays), tehát MINDEN
 * megírt rendelés egy-egy alkalom arra, hogy valami félresikeredjen az éles
 * tételsorokon. Amelyik rendelést nem kell megírni, azt nem írjuk meg.
 *
 * Ez a mai adatban nem zár ki jövőbeli sort: a `priceHufSnapshot`-ot a
 * létrehozáskori hook tölti (src/lib/order-integrity.ts), tehát egy ma
 * keletkező rendelés már nem lesz hiányos, és egy régi, nem fizetett rendelés
 * sem fog utólag `paid`-dé válni.
 */
const BACKFILL_WHERE = { status: { equals: 'paid' } } as const

/** A rendelés `items` tömbjének egy sora (a generált Payload-típusból). */
export type RendelesTetel = NonNullable<Order['items']>[number]

/** Egy rendelés-tétel azon szelete, amiből a kiosztás dolgozik. */
export interface BackfillTetel {
  readonly priceHufSnapshot?: number | null
  readonly quantity?: number | null
}

/** Egy rendelés azon szelete, amiből a kiosztás dolgozik. */
export interface BackfillRendeles {
  readonly totalHufSnapshot?: number | null
  readonly items?: readonly BackfillTetel[] | null
}

/** Miért maradt ki egy rendelés — a jelentés ezekre bontva sorol fel. */
export type KihagyasIndok =
  | 'nincs-tetel'
  | 'hianyzo-vegosszeg'
  | 'tobb-hianyzo-ar'
  | 'nem-pozitiv-maradek'
  | 'nem-egesz-egysegar'
  | 'ervenytelen-mennyiseg'
  | 'ervenytelen-ar'

/** A kihagyás-indokok magyar magyarázata — ezt olvassa az üzemeltető. */
export const KIHAGYAS_SZOVEG: Readonly<Record<KihagyasIndok, string>> = {
  'nincs-tetel':
    'a rendelésnek van végösszege, de EGYETLEN tétele sincs — kurzus-bontás ebből nem építhető, kézi rendezés kell',
  'hianyzo-vegosszeg':
    'a rendelés „Végösszeg a megrendeléskor” (totalHufSnapshot) mezője hiányzik vagy nem pozitív — nincs miből számolni',
  'tobb-hianyzo-ar':
    'egynél több tételnél hiányzik az ár — a végösszeg szétosztása kitalált adat lenne',
  'nem-pozitiv-maradek':
    'a végösszegből a többi tétel levonása után nulla vagy negatív maradék jön ki — a rendelés adatai ellentmondanak egymásnak',
  'nem-egesz-egysegar':
    'a maradék nem osztható a tétel mennyiségével egész forintra — a script nem kerekít',
  'ervenytelen-mennyiseg':
    'valamelyik tétel mennyisége nem pozitív egész — az ilyen sort tartalmazó tömb visszaírása a mező min:1 validációján bukna, a „javítása” pedig kitalált adat lenne',
  'ervenytelen-ar': 'valamelyik meglévő tételár negatív — a maradék-számítás így nem megbízható',
}

/** Egy tétel beírandó ára. */
export interface ArIras {
  readonly index: number
  readonly priceHuf: number
}

/** Egy tétel beírandó mennyisége. */
export interface MennyisegIras {
  readonly index: number
  readonly quantity: number
}

/** A kiosztó függvény döntése egy rendelésre. */
export type Kiosztas =
  | { readonly dontes: 'nincs-teendo' }
  | {
      readonly dontes: 'ir'
      readonly arak: readonly ArIras[]
      readonly mennyisegek: readonly MennyisegIras[]
    }
  | { readonly dontes: 'kihagy'; readonly indok: KihagyasIndok; readonly reszlet: string }

/**
 * Hiányzik-e az ár. A 0 ÉRVÉNYES ár (ingyenes kurzus), tehát nem hiányzik —
 * meglévő értéket a script sosem ír felül.
 */
export function hianyzikAzAr(ertek: unknown): boolean {
  return typeof ertek !== 'number' || !Number.isFinite(ertek)
}

/** A mennyiség-mező állapota: hiányzik, érvényes, vagy jelen van, de hibás. */
export function mennyisegAllapota(ertek: unknown): 'hianyzik' | 'ervenyes' | 'ervenytelen' {
  if (ertek === null || ertek === undefined) {
    return 'hianyzik'
  }
  if (typeof ertek === 'number' && Number.isFinite(ertek) && ertek > 0 && Number.isInteger(ertek)) {
    return 'ervenyes'
  }
  return 'ervenytelen'
}

/**
 * Mennyiség a SZÁMÍTÁSHOZ — hiányzó/érvénytelen érték = 1 db, pontosan úgy,
 * ahogy a `totalHufSnapshot` is képződött (src/lib/order-integrity.ts).
 */
export function mennyisegSzamitashoz(ertek: unknown): number {
  return typeof ertek === 'number' && Number.isFinite(ertek) && ertek > 0 ? ertek : 1
}

/** Emberi olvasásra formázott mezőérték a kihagyás-indokláshoz. */
function ertekLeirasa(ertek: unknown): string {
  if (ertek === null) {
    return 'null'
  }
  if (ertek === undefined) {
    return 'hiányzik'
  }
  return String(ertek)
}

/**
 * A HIÁNYZÓ ÁR KIOSZTÁSA egy rendelésen — tiszta függvény, mellékhatás nélkül.
 *
 * ═══ A SZABÁLY ═══
 *  1. Ha egyetlen tételnél sem hiányzik sem az ár, sem a mennyiség: nincs
 *     teendő. (Meglévő érték — akár 0 — SOSEM íródik felül.)
 *  2. Ha nincs egyetlen tétel sem, de a rendelésnek pozitív végösszege van:
 *     kihagyás. Ilyenkor nincs mit kitölteni, viszont a kurzus-bontás
 *     hiányzik — ezt embernek kell megnéznie, ezért nevesítve jelentjük.
 *  3. PONTOSAN EGY tételnél hiányzik az ár:
 *       maradék = totalHufSnapshot − Σ(a többi tétel ára × mennyisége)
 *     Egytételes rendelésnél a szumma üres, tehát maradék = totalHufSnapshot,
 *     az ár pedig maradék / mennyiség. Ha a maradék pozitív ÉS a mennyiséggel
 *     egész forintra osztható, az lesz az ár; különben kihagyás.
 *  4. Ha több tételnél is hiányzik az ár: kihagyás. A végösszeg szétosztása
 *     tételek között kitalált adat lenne — pénzügyi kimutatásba ilyen nem
 *     kerülhet.
 *  5. Ha a `totalHufSnapshot` hiányzik, nem szám vagy nem pozitív: kihagyás.
 *     Nincs miből számolni; a termék MAI ára (products.priceInHUF) TILOS
 *     forrás, mert azóta változhatott, és a történelmet hamisítaná meg.
 *
 * ═══ MIÉRT NEM KEREKÍTÜNK ═══
 * A HUF deviza `decimals: 0` (src/plugins/ecommerce.ts), tehát a tétel ára
 * egész forint. Ha az osztás nem ad egészet, az a rendelés adatainak
 * ellentmondását jelenti (pl. kézi szerkesztés vagy import) — a kerekítés ezt
 * elfedné, és a kurzus-bontás összege eltérne a beszedett pénztől. Ilyenkor a
 * helyes válasz a kihagyás és az emberi ellenőrzés.
 *
 * ═══ MIÉRT VEZET A MENNYISÉG-ELLENŐRZÉS KIHAGYÁSHOZ ═══
 * Az írás a TELJES `items` tömböt küldi vissza (lásd a modul fejlécének 5.
 * pontját). A `quantity` mező `required` és `min: 1`, tehát egy jelen lévő,
 * nem pozitív mennyiség a Payload-validáción bukna — a rendelés így sem
 * íródna, csak hangos hiba helyett néma zavar lenne belőle.
 */
export function kiosztHianyzoArakat(rendeles: BackfillRendeles): Kiosztas {
  const tetelek = Array.isArray(rendeles.items) ? rendeles.items : []
  const vegosszeg = rendeles.totalHufSnapshot
  const vanErvenyesVegosszeg =
    typeof vegosszeg === 'number' && Number.isFinite(vegosszeg) && vegosszeg > 0

  if (tetelek.length === 0) {
    if (vanErvenyesVegosszeg) {
      return {
        dontes: 'kihagy',
        indok: 'nincs-tetel',
        reszlet: `végösszeg: ${vegosszeg} Ft, tételek száma: 0`,
      }
    }
    return { dontes: 'nincs-teendo' }
  }

  const hianyzoArIndexek: number[] = []
  const negativArIndexek: number[] = []
  const hianyzoMennyisegIndexek: number[] = []
  const ervenytelenMennyisegIndexek: number[] = []

  tetelek.forEach((tetel, index) => {
    const ar = tetel.priceHufSnapshot
    if (hianyzikAzAr(ar)) {
      hianyzoArIndexek.push(index)
    } else if (typeof ar === 'number' && ar < 0) {
      negativArIndexek.push(index)
    }
    const allapot = mennyisegAllapota(tetel.quantity)
    if (allapot === 'hianyzik') {
      hianyzoMennyisegIndexek.push(index)
    } else if (allapot === 'ervenytelen') {
      ervenytelenMennyisegIndexek.push(index)
    }
  })

  if (hianyzoArIndexek.length === 0 && hianyzoMennyisegIndexek.length === 0) {
    return { dontes: 'nincs-teendo' }
  }

  // Innentől ÍRNI szeretnénk, tehát a teljes tömbnek visszaírhatónak kell
  // lennie — a hibás sorokat előbb ember rendezi.
  if (ervenytelenMennyisegIndexek.length > 0) {
    return {
      dontes: 'kihagy',
      indok: 'ervenytelen-mennyiseg',
      reszlet: `érintett tétel(ek): ${ervenytelenMennyisegIndexek
        .map((index) => `#${index + 1} (${ertekLeirasa(tetelek[index].quantity)})`)
        .join(', ')}`,
    }
  }
  if (negativArIndexek.length > 0) {
    return {
      dontes: 'kihagy',
      indok: 'ervenytelen-ar',
      reszlet: `érintett tétel(ek): ${negativArIndexek
        .map((index) => `#${index + 1} (${ertekLeirasa(tetelek[index].priceHufSnapshot)} Ft)`)
        .join(', ')}`,
    }
  }

  const mennyisegek: MennyisegIras[] = hianyzoMennyisegIndexek.map((index) => ({
    index,
    quantity: 1,
  }))

  if (hianyzoArIndexek.length === 0) {
    return { dontes: 'ir', arak: [], mennyisegek }
  }
  if (hianyzoArIndexek.length > 1) {
    return {
      dontes: 'kihagy',
      indok: 'tobb-hianyzo-ar',
      reszlet: `${hianyzoArIndexek.length} tételnél hiányzik az ár (${hianyzoArIndexek
        .map((index) => `#${index + 1}`)
        .join(', ')}), a tételek száma: ${tetelek.length}`,
    }
  }
  if (!vanErvenyesVegosszeg) {
    return {
      dontes: 'kihagy',
      indok: 'hianyzo-vegosszeg',
      reszlet: `totalHufSnapshot: ${ertekLeirasa(vegosszeg)}`,
    }
  }

  const hianyzoIndex = hianyzoArIndexek[0]
  let tobbiOsszege = 0
  tetelek.forEach((tetel, index) => {
    if (index === hianyzoIndex) {
      return
    }
    // A `hianyzikAzAr` szűrés után itt biztosan véges szám áll.
    const ar = typeof tetel.priceHufSnapshot === 'number' ? tetel.priceHufSnapshot : 0
    tobbiOsszege += ar * mennyisegSzamitashoz(tetel.quantity)
  })

  const maradek = vegosszeg - tobbiOsszege
  if (maradek <= 0) {
    return {
      dontes: 'kihagy',
      indok: 'nem-pozitiv-maradek',
      reszlet: `maradék: ${maradek} Ft (végösszeg ${vegosszeg} Ft − a többi tétel ${tobbiOsszege} Ft)`,
    }
  }

  const mennyiseg = mennyisegSzamitashoz(tetelek[hianyzoIndex].quantity)
  const egysegar = maradek / mennyiseg
  if (!Number.isInteger(egysegar)) {
    return {
      dontes: 'kihagy',
      indok: 'nem-egesz-egysegar',
      reszlet: `${maradek} Ft / ${mennyiseg} db = ${egysegar} — nem egész forint`,
    }
  }

  return { dontes: 'ir', arak: [{ index: hianyzoIndex, priceHuf: egysegar }], mennyisegek }
}

/**
 * A visszaírandó, TELJES `items` tömb felépítése — tiszta függvény.
 *
 * Minden meglévő sor változatlanul megy tovább (`...tetel`: azonosító,
 * termék-hivatkozás, `titleSnapshot`), és kizárólag a kiosztás által
 * megnevezett mezők kapnak új értéket. A teljes tömb azért kell, mert a
 * drizzle-adapter update-kor törli és újra beszúrja a tömb sorait (lásd a
 * modul fejlécének 5. pontját).
 */
export function epitsdVisszairandoTeteleket(
  tetelek: readonly RendelesTetel[],
  kiosztas: Extract<Kiosztas, { dontes: 'ir' }>,
): RendelesTetel[] {
  const arIndexek = new Map(kiosztas.arak.map((iras) => [iras.index, iras.priceHuf]))
  const mennyisegIndexek = new Map(kiosztas.mennyisegek.map((iras) => [iras.index, iras.quantity]))
  return tetelek.map((tetel, index) => {
    const ujAr = arIndexek.get(index)
    const ujMennyiseg = mennyisegIndexek.get(index)
    return {
      ...tetel,
      ...(ujAr === undefined ? {} : { priceHufSnapshot: ujAr }),
      ...(ujMennyiseg === undefined ? {} : { quantity: ujMennyiseg }),
    }
  })
}

/** Egy kihagyott rendelés a jelentésben. */
export interface KihagyottRendeles {
  readonly azonosito: string
  readonly status: string | null
  readonly indok: KihagyasIndok
  readonly reszlet: string
}

/** Egy sikertelen írás a jelentésben. */
export interface IrasHiba {
  readonly azonosito: string
  readonly hiba: string
}

/** A futás összegzése — a jelentés ebből formázódik. */
export interface BackfillJelentes {
  readonly dryRun: boolean
  readonly megnezettRendelesek: number
  readonly felsoKorlat: number
  readonly csonkolt: boolean
  readonly erintettRendelesek: number
  readonly arIrasok: number
  readonly mennyisegIrasok: number
  readonly nincsTeendo: number
  readonly kihagyottak: readonly KihagyottRendeles[]
  readonly irasHibak: readonly IrasHiba[]
}

/** Ember által olvasható rendelés-azonosító: a rendelésszám, ha van; különben `#id`. */
export function rendelesAzonosito(id: number | string, orderNumber: unknown): string {
  return typeof orderNumber === 'string' && orderNumber.trim().length > 0
    ? orderNumber.trim()
    : `#${id}`
}

/**
 * A JELENTÉS magyar sorai — tiszta függvény, hogy tesztelhető legyen.
 *
 * A kihagyottak listája a lényeg: azokat ember nézi meg. Ezért indokonként
 * csoportosítva, a rendelés-azonosítókkal és a konkrét számokkal íródnak ki.
 */
export function formazdJelentest(jelentes: BackfillJelentes): string[] {
  const sorok: string[] = []
  const mod = jelentes.dryRun ? 'PRÓBAFUTÁS' : 'ÉLES FUTÁS'

  sorok.push(`Ár-snapshot backfill — ${mod} összesítése`)
  sorok.push(
    `Megnézett rendelés: ${jelentes.megnezettRendelesek} db (felső korlát: ${jelentes.felsoKorlat}).`,
  )
  if (jelentes.csonkolt) {
    sorok.push(
      `FIGYELEM — CSONKOLT BEOLVASÁS: a rendelések száma elérte a ${jelentes.felsoKorlat}-es felső korlátot, tehát NEM néztünk meg minden rendelést. Futtasd újra magasabb korláttal: --max=<szám>.`,
    )
  }

  const ige = jelentes.dryRun ? 'ÍRNA' : 'ÍRT'
  sorok.push(
    `${ige}: ${jelentes.erintettRendelesek} rendelés — ${jelentes.arIrasok} tétel-ár és ${jelentes.mennyisegIrasok} mennyiség.`,
  )
  sorok.push(`Nincs teendő: ${jelentes.nincsTeendo} rendelés (már teljes az adata).`)
  sorok.push(`Kihagyva: ${jelentes.kihagyottak.length} rendelés.`)

  if (jelentes.kihagyottak.length > 0) {
    sorok.push('A kihagyott rendelések — ezeket EMBERNEK kell megnéznie:')
    const indokok = new Set(jelentes.kihagyottak.map((elem) => elem.indok))
    for (const indok of indokok) {
      const csoport = jelentes.kihagyottak.filter((elem) => elem.indok === indok)
      sorok.push(`  • ${indok} (${csoport.length} db) — ${KIHAGYAS_SZOVEG[indok]}`)
      for (const elem of csoport) {
        sorok.push(
          `      ${elem.azonosito} [státusz: ${elem.status ?? 'ismeretlen'}] — ${elem.reszlet}`,
        )
      }
    }
  }

  if (jelentes.irasHibak.length > 0) {
    sorok.push(`ÍRÁSI HIBA: ${jelentes.irasHibak.length} rendelés nem íródott be.`)
    for (const hiba of jelentes.irasHibak) {
      sorok.push(`      ${hiba.azonosito} — ${hiba.hiba}`)
    }
  }

  if (jelentes.dryRun) {
    sorok.push(
      'PRÓBAFUTÁS: az adatbázisba SEMMI nem íródott. Tényleges futtatás (előtte KÖTELEZŐ `npm run backup:db`): OWNER_BACKFILL_CONFIRM=igen npm run backfill:ar-snapshot',
    )
  }

  return sorok
}

/** A beolvasott rendelés-dokumentum alakja (a `BACKFILL_SELECT` szerint). */
export interface BackfillOrderDoc {
  readonly id: number
  readonly orderNumber?: string | null
  readonly status?: string | null
  readonly totalHufSnapshot?: number | null
  readonly items?: readonly RendelesTetel[] | null
}

/** A futtatás injektált függőségei — teszthez mockolható. */
export interface BackfillFuggosegek {
  readonly payload: Pick<Payload, 'find' | 'update'>
  readonly dryRun: boolean
  readonly max?: number
  readonly lapmeret?: number
  readonly log?: Pick<Logger, 'info' | 'warn' | 'error'>
}

const NEMA_NAPLO: Pick<Logger, 'info' | 'warn' | 'error'> = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

/**
 * A backfill VEZÉRLÉSE: beolvasás lapozva, kiosztás rendelésenként, majd —
 * kizárólag ÉLES futásban — írás.
 *
 * A próbafutás kapuja EGYETLEN helyen zár: az írás előtti `if (dryRun)`.
 * Ezt a kaput teszt méri (a mockolt `payload.update` hívásszáma próbafutásban
 * pontosan 0).
 */
export async function futtatBackfill(fuggosegek: BackfillFuggosegek): Promise<BackfillJelentes> {
  const log = fuggosegek.log ?? NEMA_NAPLO
  const max = fuggosegek.max ?? BACKFILL_RENDELES_MAX
  const lapmeret = fuggosegek.lapmeret ?? BACKFILL_LAPMERET

  const { docs, truncated } = await readStatisticsPages<BackfillOrderDoc>(
    async (page, limit) =>
      (await fuggosegek.payload.find({
        collection: 'orders',
        where: BACKFILL_WHERE,
        depth: 0,
        page,
        limit,
        sort: BACKFILL_SORT,
        select: BACKFILL_SELECT,
        overrideAccess: true,
      })) as unknown as {
        docs?: BackfillOrderDoc[] | null
        hasNextPage?: boolean | null
        totalDocs?: number | null
      },
    lapmeret,
    max,
  )

  const kihagyottak: KihagyottRendeles[] = []
  const irasHibak: IrasHiba[] = []
  let erintettRendelesek = 0
  let arIrasok = 0
  let mennyisegIrasok = 0
  let nincsTeendo = 0

  for (const doc of docs) {
    const azonosito = rendelesAzonosito(doc.id, doc.orderNumber)
    const kiosztas = kiosztHianyzoArakat({
      totalHufSnapshot: doc.totalHufSnapshot ?? null,
      items: doc.items ?? null,
    })

    if (kiosztas.dontes === 'nincs-teendo') {
      nincsTeendo += 1
      continue
    }
    if (kiosztas.dontes === 'kihagy') {
      kihagyottak.push({
        azonosito,
        status: typeof doc.status === 'string' ? doc.status : null,
        indok: kiosztas.indok,
        reszlet: kiosztas.reszlet,
      })
      continue
    }

    const tetelek = Array.isArray(doc.items) ? doc.items : []
    const ujTetelek = epitsdVisszairandoTeteleket(tetelek, kiosztas)

    erintettRendelesek += 1
    arIrasok += kiosztas.arak.length
    mennyisegIrasok += kiosztas.mennyisegek.length

    const leiras = [
      ...kiosztas.arak.map((iras) => `#${iras.index + 1}. tétel ára ${iras.priceHuf} Ft`),
      ...kiosztas.mennyisegek.map(
        (iras) => `#${iras.index + 1}. tétel mennyisége ${iras.quantity}`,
      ),
    ].join('; ')

    if (fuggosegek.dryRun) {
      log.info(`Ár-snapshot backfill — ÍRNA: ${azonosito} → ${leiras}`)
      continue
    }

    try {
      await fuggosegek.payload.update({
        collection: 'orders',
        id: doc.id,
        depth: 0,
        overrideAccess: true,
        data: { items: ujTetelek },
      })
      log.info(`Ár-snapshot backfill — ÍRVA: ${azonosito} → ${leiras}`)
    } catch (error: unknown) {
      erintettRendelesek -= 1
      arIrasok -= kiosztas.arak.length
      mennyisegIrasok -= kiosztas.mennyisegek.length
      const uzenet = error instanceof Error ? error.message : String(error)
      irasHibak.push({ azonosito, hiba: uzenet })
      log.error(`Ár-snapshot backfill — ÍRÁSI HIBA: ${azonosito}`, { hiba: uzenet })
    }
  }

  return {
    dryRun: fuggosegek.dryRun,
    megnezettRendelesek: docs.length,
    felsoKorlat: max,
    csonkolt: truncated,
    erintettRendelesek,
    arIrasok,
    mennyisegIrasok,
    nincsTeendo,
    kihagyottak,
    irasHibak,
  }
}

/** A kapu: kizárólag a pontos „igen” érték nyitja (apply-owner-content.ts mintája). */
const kapuNyitva = (nev: string): boolean => process.env[nev]?.trim().toLowerCase() === 'igen'

/** A `--max=<szám>` kapcsoló feldolgozása; hibás vagy hiányzó értéknél az alapérték. */
export function parseMaxKapcsolo(argv: readonly string[], alapertek: number): number {
  const talalat = argv.find((arg) => arg.startsWith('--max='))
  if (talalat === undefined) {
    return alapertek
  }
  const nyers = talalat.slice('--max='.length).trim()
  if (!/^\d+$/.test(nyers)) {
    return alapertek
  }
  const ertek = Number(nyers)
  return Number.isSafeInteger(ertek) && ertek > 0 ? ertek : alapertek
}

const log = createLogger({ script: 'backfill-price-snapshot' })

async function futtat(): Promise<void> {
  const dryRun = !kapuNyitva('OWNER_BACKFILL_CONFIRM')
  const max = parseMaxKapcsolo(process.argv.slice(2), BACKFILL_RENDELES_MAX)

  log.info(
    dryRun
      ? 'Ár-snapshot backfill: PRÓBAFUTÁS indul (OWNER_BACKFILL_CONFIRM=igen nélkül semmi nem íródik).'
      : 'Ár-snapshot backfill: ÉLES futás indul (OWNER_BACKFILL_CONFIRM=igen). Remélem, futott előtte `npm run backup:db`.',
  )

  const payload = await getPayload({ config })
  const jelentes = await futtatBackfill({ payload, dryRun, max, log })

  for (const sor of formazdJelentest(jelentes)) {
    log.info(sor)
  }

  if (jelentes.irasHibak.length > 0 || jelentes.csonkolt) {
    process.exitCode = 1
    return
  }
  if (!dryRun) {
    log.info('OWNER_BACKFILL_OK')
  }
}

// A modul mellékhatás nélkül importálható (a tiszta függvények és a vezérlés
// így tesztelhetők); a futtatás csak közvetlen indításkor indul el.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  futtat()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((error: unknown) => {
      log.error('Ár-snapshot backfill: hiba történt.', {
        error: error instanceof Error ? error.message : String(error),
      })
      process.exit(1)
    })
}
