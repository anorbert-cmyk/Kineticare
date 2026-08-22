import type { Payload } from 'payload'

import type { Product, User } from '../../payload-types'
import { withAdvisoryLock } from '../advisory-lock'
import { isFreeCourse, courseTitle, hasUserPurchased } from '../courses'
import { maskEmail } from '../email/mask'
import { resolveEmailProvider, type EmailEnv } from '../email/provider'
import { grantFreeCoursesToUser } from '../free-course-grant'
import { logger as rootLogger, type Logger } from '../logger'
import { buildPasswordResetUrl } from '../password-reset-url'
import { generateInitialPassword } from '../security/initial-password'
import { freeCourseEmail } from './email'

/**
 * INGYENES KURZUS IGÉNYLÉSE — a transportfüggetlen szolgáltatás.
 *
 * A tulajdonos kérése (2026-08-17): „a lányoknak meg kell adjon egy nevet meg
 * kell adjon egy e-mail címet és akkor arra az e-mail címre kiküldik a linket…
 * nem kell regisztráljon az embernek… nem kell kifizesse a kurzust hiszen ez
 * egy ingyenes kurzus". Ez a modul pontosan ezt csinálja: NÉV + E-MAIL →
 * hozzáférés + belépő link e-mailben. Regisztrációs folyamat, jelszó-kitalálás
 * és fizetés NINCS.
 *
 * ═══ A LÉPÉSEK ═══
 *  1. A termék kapuja: published + `isFreeCourse` (a `src/lib/courses.ts`
 *     EGYETLEN igazságforrása). Bármi más → elutasítás, mert a felület sem
 *     kínálhatna igénylést rá.
 *  2. Fiók feloldása advisory-zár alatt: meglévő cím → a MEGLÉVŐ fiók (SOSEM
 *     jön létre második), ismeretlen cím → új `customer` fiók a megadott
 *     névvel, eldobható véletlen jelszóval és `passwordSetupPending: true`
 *     jelzővel (a vendég-vásárlás és a vásárló-import ugyanezt teszi).
 *  3. Hozzáférés-adás a MEGLÉVŐ `grantFreeCoursesToUser` szolgáltatással —
 *     idempotens, missing-only, meglévő jogosultságot sosem vesz el.
 *     Owner/staff meglévő fiókra NEM írunk purchases-t (K3): a nyilvános
 *     űrlap nem adhat admin-jogosultságot.
 *  4. Belépő link: a Payload SAJÁT jelszó-visszaállító tokenje
 *     (`forgotPassword`, `disableEmail: true`) + a közös
 *     `buildPasswordResetUrl`. Külön, párhuzamos token-rendszer NINCS.
 *     7 napos token CSAK új fiókra vagy `passwordSetupPending` vevőre jár —
 *     meglévő jelszavas, owner és staff fiókra NEM (K3: a token érvénytelenítené
 *     a valódi 1 órás jelszó-emlékeztetőt).
 *  5. Levél: a saját magyar sablon (`freeCourseEmail`) a Payload
 *     e-mail-adapterén át.
 *
 * ═══ FIÓK-FELDERÍTÉS ELLENI VÉDELEM (tudatos tervezési döntés) ═══
 * A visszatérési érték `status`-a és a hívó HTTP-válasza SZÁNDÉKOSAN AZONOS
 * akkor is, ha a címhez már tartozott fiók, és akkor is, ha most jött létre.
 * Enélkül a nyilvános végpont fiók-felderítő eszközzé válna: elég lenne egy
 * címlistát végigküldeni, és a válaszkülönbségből kiolvasni, ki a vevőnk.
 * Ez az OWASP „user enumeration" mintája, és a Payload maga is ezért ad
 * ismeretlen címre is sikeres választ a `forgotPassword`-ön.
 * A `userCreated` mező CSAK a naplónak és a teszteknek szól — a
 * route-handler NEM teheti be a HTTP-válaszba (őr-teszt rögzíti).
 *
 * ═══ IDEMPOTENCIA ═══
 * Kétszeri beküldés: (a) fiók — az advisory-zár + „előbb keress" miatt nem
 * keletkezik második; (b) hozzáférés — a `grantFreeCoursesToUser` csak a
 * hiányzót írja be, tehát nem duplázódik; (c) levél — ÚJ tokennel ismét
 * kimegy, és a korábbi link érvénytelenné válik (a Payload minden
 * `forgotPassword`-hívásnál új tokent ír). Ez a jelszó-emlékeztető ismert,
 * dokumentált viselkedése; a hívó oldali kérés-korlát fogja a visszaélést.
 *
 * ═══ LEVÉL NÉLKÜLI ÜZEM (élő korlát, 2026-08-17) ═══
 * A `RESEND_API_KEY` a Railway-en jelenleg NINCS beállítva, tehát a provider
 * `noop`, ami a küldést CSENDBEN elnyeli és sikeresnek mutatja. Ez a modul
 * ezért a küldés ELŐTT megnézi a providert, és noop esetén:
 *  - a hozzáférést AKKOR IS létrehozza (az adat a fontos),
 *  - tokent NEM generál (fölöslegesen érvénytelenítene egy korábbi, esetleg
 *    még élő linket),
 *  - `logger.error`-ral RIASZTÁST ír (a staff lássa, hogy kézzel kell küldeni),
 *  - és `emailDelivered: false`-szal tér vissza, hogy a látogató IGAZ üzenetet
 *    kapjon.
 */

/**
 * A belépő link élettartama: 7 nap.
 *
 * VEZETŐI DÖNTÉS (2026-08-17, tulajdonosi jóváhagyással). A link
 * gyakorlatilag JELSZÓBEÁLLÍTÓ token: aki megkapja, a fiók gazdájává válik.
 * A vásárló-import 30 napos TTL-je ehhez túl hosszú kitettség, mert:
 *  - az igénylés NYILVÁNOS végpontról, önkiszolgálóan indul, tehát a lánc
 *    egyetlen bizalmi pontja a postafiók;
 *  - ha a postafiókhoz később bárki hozzáfér (megosztott gép, továbbított
 *    levél, elhagyott céges cím), a régi levél még hetekig élő belépő.
 * Az import 30 napja MÁS helyzet: ott a staff küld meghívót egy ismert
 * vevőnek, és az újraküldés KÉZI lépés, tehát a hosszú ablak indokolt.
 * Itt az újraküldés a látogatónak EGYETLEN űrlap-beküldés (a folyamat
 * idempotens: meglévő fióknál is új tokent ír és újra kiküldi a levelet),
 * ezért a rövidítés nem ront a használhatóságon.
 *
 * A Payload alapértelmezése (1 óra) viszont kevés lenne: a lead-magnet
 * levelét gyakran csak napokkal később nyitják meg.
 *
 * A `/jelszo-visszaallitas` oldal nem magyarázza a napok számát, tehát a két
 * eltérő élettartam ott nem ütközik; a levél a saját TTL-jét írja ki
 * (`FREE_COURSE_TOKEN_TTL_DAYS`).
 */
export const FREE_COURSE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** A TTL napokban — a levélszöveghez. */
export const FREE_COURSE_TOKEN_TTL_DAYS = Math.round(
  FREE_COURSE_TOKEN_TTL_MS / (24 * 60 * 60 * 1000),
)

export type FreeCourseRequestStatus =
  /** Minden rendben: a hozzáférés megvan (a levél sorsát az `emailDelivered` mondja meg). */
  | 'ok'
  /** A termék nem létezik, nem published, vagy nem ingyenes → nem igényelhető. */
  | 'course-not-available'
  /** Üres users-kollekció: az első fiók owner lenne — fiókot itt sosem hozunk létre. */
  | 'refused-first-user'
  /** A hozzáférés-adás nem sikerült (a termék a grant után sincs a purchases-ben). */
  | 'access-failed'

export interface RequestFreeCourseAccessInput {
  payload: Payload
  /** A kért kurzus adatbázis-azonosítója (az űrlapból). */
  productId: number
  /** A látogató által megadott név (validált, trimmelt). */
  name: string
  /** A látogató által megadott e-mail-cím (validált, trimmelt, kisbetűs). */
  email: string
  /**
   * A levélbeli link abszolút alapcíme (NEXT_PUBLIC_SERVER_URL). `null` =
   * nincs feloldható cím, ilyenkor link sem építhető: a hozzáférés létrejön,
   * a levél viszont nem megy ki (ugyanaz az ág, mint a hiányzó e-mail-kulcs).
   */
  serverUrl: string | null
  logger?: Logger
  /** Env a provider-feloldáshoz — teszthez injektálható. */
  env?: EmailEnv
  /** Token-élettartam ms-ban (alap: `FREE_COURSE_TOKEN_TTL_MS`). */
  tokenTtlMs?: number
}

export interface RequestFreeCourseAccessResult {
  status: FreeCourseRequestStatus
  /** A belépő levél TÉNYLEGESEN kiment-e. */
  emailDelivered: boolean
  /**
   * Jött-e létre új fiók. CSAK naplóhoz és teszthez — a HTTP-válaszba SOSEM
   * kerülhet (fiók-felderítés elleni védelem, lásd a modul fejlécét).
   */
  userCreated: boolean
  /** A ténylegesen beírt termék-id-k (üres, ha minden hozzáférés megvolt). */
  grantedProductIds: number[]
}

/** Az advisory-zár kulcsa — cím szerint, hogy két párhuzamos igénylés soros legyen. */
export function freeCourseRequestLockKey(email: string): string {
  return `free-course-request:${email}`
}

/** A users.purchases bejegyzéseinek id-listája (nyers id vagy populate-olt doc). */
function purchaseIds(user: Pick<User, 'purchases'>): number[] {
  return (user.purchases ?? []).map((entry) => (typeof entry === 'object' ? entry.id : entry))
}

async function findUserByEmail(payload: Payload, email: string): Promise<User | null> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (docs[0] as User | undefined) ?? null
}

/**
 * A küldés eredménye a Payload e-mail-adapterétől.
 *
 * A `payload.sendEmail` visszatérési típusa `unknown` (az adapter dönti el).
 * A projekt saját adaptere SOSEM dob hibát, hanem `{ ok, error }` alakú
 * SendResultot ad — ezt itt észre kell venni, különben a sikertelen küldés is
 * sikernek látszana. (Ugyanez a szűkítés él a vásárló-import küldő útján;
 * ott nem exportált segéd, ezért áll itt is.)
 */
function sendFailureReason(result: unknown): string | null {
  if (typeof result !== 'object' || result === null) {
    return null
  }
  const record = result as Record<string, unknown>
  if (record.ok === false) {
    return typeof record.error === 'string' && record.error.length > 0
      ? record.error
      : 'a levelező-szolgáltató elutasította a küldést'
  }
  return null
}

/** A kért termék feloldása és kapuzása. `null` = nem igényelhető. */
async function resolveFreeProduct(payload: Payload, productId: number): Promise<Product | null> {
  let product: Product | null = null
  try {
    product = (await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 0,
      overrideAccess: true,
    })) as Product
  } catch {
    // Nem létező azonosító — a Payload dob; ez nem technikai hiba, hanem
    // „nincs ilyen kurzus", ezért nyeljük el és a hívó 400-at ad.
    return null
  }
  if (product === null || product.status !== 'published' || !isFreeCourse(product)) {
    return null
  }
  return product
}

export async function requestFreeCourseAccess(
  input: RequestFreeCourseAccessInput,
): Promise<RequestFreeCourseAccessResult> {
  const { payload, email, name, productId } = input
  const log = input.logger ?? rootLogger
  const env = input.env ?? process.env
  // A teljes cím SOSEM kerül naplóba (a logger `email` kulcsot eleve redaktál):
  // maszkolva, `cimzett` kulcson megy, a repó többi folyamatával azonosan.
  const audit = { cimzett: maskEmail(email), productId }

  const product = await resolveFreeProduct(payload, productId)
  if (product === null) {
    log.warn('ingyenes kurzus igénylése: a kurzus nem igényelhető', {
      ...audit,
      indok: 'nem létező, nem publikált vagy nem ingyenes termék',
    })
    return {
      status: 'course-not-available',
      emailDelivered: false,
      userCreated: false,
      grantedProductIds: [],
    }
  }

  // ── 1. Fiók feloldása vagy létrehozása, advisory-zár alatt ────────────────
  // A zár PROCESSZEK KÖZÖTT is soros: két egyszerre beküldött űrlap („kétszer
  // rákattintott") sem hozhat létre két fiókot ugyanarra a címre.
  const resolved = await withAdvisoryLock(
    payload,
    freeCourseRequestLockKey(email),
    async (): Promise<{ user: User; created: boolean } | null> => {
      const existing = await findUserByEmail(payload, email)
      if (existing) {
        return { user: existing, created: false }
      }

      // ÜRES users-kollekcióra NEM hozunk létre fiókot: az első felhasználó a
      // `promoteFirstUserToOwner` hook miatt OWNER szerepkört kapna. Egy
      // nyilvános űrlapból SOSEM születhet tulajdonosi fiók. (A vendég-
      // vásárlás fiók-feloldása ugyanezt a szabályt követi.)
      const { totalDocs } = await payload.count({ collection: 'users' })
      if (totalDocs === 0) {
        return null
      }

      try {
        const created = (await payload.create({
          collection: 'users',
          data: {
            email,
            name,
            // Pontosan a collection alapértelmezése (Users.role defaultValue:
            // 'customer') — kiírva, mert a generált create-adattípus
            // kötelezőnek jelöli a mezőt.
            role: 'customer',
            // Eldobható, véletlen jelszó: a Payload jelszó nélkül nem hoz
            // létre auth-rekordot. A látogató a belépő linkkel állít be
            // sajátot; ez a jelszó SEHOVA nem kerül ki.
            password: generateInitialPassword(email),
            // A fiókhoz a látogató MÉG NEM választott jelszót. Az első
            // sikeres belépéskor magától törlődik (Users afterLogin hook).
            passwordSetupPending: true,
          },
          overrideAccess: true,
          depth: 0,
        })) as User
        return { user: created, created: true }
      } catch (error) {
        // VERSENYHELYZET-TARTALÉK: ha a zár kimaradt (nem-production, mockolt
        // Payload) és közben más létrehozta a fiókot, a create egyedi-kényszerbe
        // ütközik. Ilyenkor a MÁSIK szál fiókját fogadjuk el.
        const raced = await findUserByEmail(payload, email)
        if (raced) {
          log.warn('ingyenes kurzus igénylése: a fiókot közben egy párhuzamos szál hozta létre', {
            ...audit,
            userId: raced.id,
          })
          return { user: raced, created: false }
        }
        throw error
      }
    },
    log,
  )

  if (resolved === null) {
    log.error(
      'RIASZTÁS: ingyenes kurzus igénylése üres users-kollekcióval — az első fiók tulajdonosi ' +
        'szerepkört kapna, ezért a fiók-létrehozás elutasítva. Hozz létre előbb egy admin-fiókot.',
      audit,
    )
    return {
      status: 'refused-first-user',
      emailDelivered: false,
      userCreated: false,
      grantedProductIds: [],
    }
  }

  // ── 2. Owner/staff meglévő fiók: sem hozzáférés, sem 7 napos token ────────
  // A nyilvános űrlap NEM írhat purchases-t admin-fiókra, és NEM írhat 7 napos
  // reset-tokent, ami egy valódi 1 órás jelszó-emlékeztetőt érvénytelenítene.
  // A HTTP-válasz ettől még `ok` (fiók-felderítés elleni védelem).
  if (!resolved.created && (resolved.user.role === 'owner' || resolved.user.role === 'staff')) {
    log.info('ingyenes kurzus igénylése: owner/staff fiók — hozzáférés és belépő token kihagyva', {
      ...audit,
      userId: resolved.user.id,
      role: resolved.user.role,
    })
    return {
      status: 'ok',
      emailDelivered: false,
      userCreated: false,
      grantedProductIds: [],
    }
  }

  // ── 3. Hozzáférés-adás (idempotens, missing-only) ─────────────────────────
  // FRISS olvasás: új fióknál a Users afterChange(create) hookja már írhatott
  // purchases-t (ugyanez a grant fut ott), a `create` visszatérési doc-ja
  // viszont azt még nem tükrözi. Elavult listával a grant fölöslegesen írna.
  const fresh = ((await payload.findByID({
    collection: 'users',
    id: resolved.user.id,
    depth: 0,
    overrideAccess: true,
  })) ?? resolved.user) as User

  const grant = await grantFreeCoursesToUser({ payload, user: fresh, logger: log })

  // A kért termék TÉNYLEG bent van-e? A grant az ÖSSZES publikált ingyenes
  // terméket kezeli, tehát ide csak akkor jutunk „nem"-mel, ha közben
  // megváltozott a termék állapota. Csendben sikert jelenteni ilyenkor a
  // legrosszabb: a látogató várná a kurzust, ami sosem jelenik meg nála.
  const owned = new Set([...purchaseIds(fresh), ...grant.grantedProductIds].map(String))
  if (!owned.has(String(product.id)) && !hasUserPurchased(fresh.purchases, product.id)) {
    log.error('RIASZTÁS: ingyenes kurzus igénylése — a hozzáférés nem került be a fiókba', {
      ...audit,
      userId: fresh.id,
      grantedProductIds: grant.grantedProductIds,
    })
    return {
      status: 'access-failed',
      emailDelivered: false,
      userCreated: resolved.created,
      grantedProductIds: grant.grantedProductIds,
    }
  }

  log.info('ingyenes kurzus igénylése: hozzáférés rendben', {
    ...audit,
    userId: fresh.id,
    userCreated: resolved.created,
    grantedProductIds: grant.grantedProductIds,
  })

  // Meglévő, jelszóval rendelkező vevő: a hozzáférés MEGVAN, de 7 napos
  // forgotPassword-token NEM jár — az érvénytelenítené a valódi 1 órás resetet.
  const needsActivationToken = resolved.created || fresh.passwordSetupPending === true
  if (!needsActivationToken) {
    log.info(
      'ingyenes kurzus igénylése: meglévő jelszavas fiók — hozzáférés megvan, 7 napos token nélkül',
      { ...audit, userId: fresh.id },
    )
    return {
      status: 'ok',
      emailDelivered: false,
      userCreated: false,
      grantedProductIds: grant.grantedProductIds,
    }
  }

  // ── 4. Belépő link + levél ────────────────────────────────────────────────
  const provider = resolveEmailProvider(env)
  if (provider.name === 'noop' || input.serverUrl === null) {
    // Se kulcs, se cím → a levél nem tud kimenni. Tokent SEM generálunk: az
    // csak érvénytelenítené a címzett esetleg még élő, korábbi linkjét, cserébe
    // semmit nem adna.
    log.error(
      provider.name === 'noop'
        ? 'RIASZTÁS: ingyenes kurzus igénylése — a belépő levél NEM ment ki, mert nincs beállított ' +
            'levelező-szolgáltató (RESEND_API_KEY / SMTP_HOST). A hozzáférés létrejött, a linket ' +
            'kézzel kell kiküldeni.'
        : 'RIASZTÁS: ingyenes kurzus igénylése — a belépő levél NEM ment ki, mert a ' +
            'NEXT_PUBLIC_SERVER_URL nincs beállítva, így abszolút link nem építhető. ' +
            'A hozzáférés létrejött, a linket kézzel kell kiküldeni.',
      { ...audit, userId: fresh.id, provider: provider.name },
    )
    return {
      status: 'ok',
      emailDelivered: false,
      userCreated: resolved.created,
      grantedProductIds: grant.grantedProductIds,
    }
  }

  const ttlMs = input.tokenTtlMs ?? FREE_COURSE_TOKEN_TTL_MS
  let activationUrl: string | null = null
  try {
    // A visszatérési érték a Payload típusa szerint string, futásidőben
    // viszont ismeretlen e-mailnél `null` — ezért unknown + típusszűkítés.
    const token: unknown = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
      expiration: ttlMs,
    })
    if (typeof token === 'string' && token.length > 0) {
      activationUrl = buildPasswordResetUrl(input.serverUrl, token)
    }
  } catch (error) {
    log.error('ingyenes kurzus igénylése: a belépő link előállítása sikertelen', {
      ...audit,
      userId: fresh.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  if (activationUrl === null) {
    log.error(
      'RIASZTÁS: ingyenes kurzus igénylése — nincs belépő link, a levél nem ment ki. ' +
        'A hozzáférés létrejött, a linket kézzel kell kiküldeni.',
      { ...audit, userId: fresh.id },
    )
    return {
      status: 'ok',
      emailDelivered: false,
      userCreated: resolved.created,
      grantedProductIds: grant.grantedProductIds,
    }
  }

  // Sem a token, sem a link SOSEM kerül naplóba: aki megkapja, jelszót
  // állíthat a fiókhoz (a vásárló-import ugyanezt a szabályt követi).
  const template = freeCourseEmail({
    name,
    courseTitle: courseTitle(product),
    activationUrl,
    email,
    expiresInDays: Math.max(1, Math.round(ttlMs / (24 * 60 * 60 * 1000))),
  })

  let failure: string | null = null
  try {
    const result: unknown = await payload.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })
    failure = sendFailureReason(result)
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error)
  }

  if (failure !== null) {
    log.error(
      'RIASZTÁS: ingyenes kurzus igénylése — a belépő levél kiküldése sikertelen. ' +
        'A hozzáférés létrejött, a linket kézzel kell kiküldeni.',
      { ...audit, userId: fresh.id, provider: provider.name, error: failure },
    )
    return {
      status: 'ok',
      emailDelivered: false,
      userCreated: resolved.created,
      grantedProductIds: grant.grantedProductIds,
    }
  }

  log.info('ingyenes kurzus igénylése: belépő levél elküldve', {
    ...audit,
    userId: fresh.id,
    provider: provider.name,
  })

  return {
    status: 'ok',
    emailDelivered: true,
    userCreated: resolved.created,
    grantedProductIds: grant.grantedProductIds,
  }
}
