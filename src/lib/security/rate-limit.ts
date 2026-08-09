/**
 * IP-alapú, csúszóablakos (sliding window) kérés-korlátozó a nyilvános,
 * visszaélhető végpontokra (A2).
 *
 * ## Mit véd
 *
 * A belépést a Payload `maxLoginAttempts` (5 → 10 perc zárolás), a
 * kapcsolat-űrlapot a Turnstile védi. A regisztráció, a jelszó-emlékeztető, a
 * jelszó-visszaállítás, a fizetésindítás és az űrlap-beküldés viszont eddig
 * korlátlanul hívható volt: ezekre ez a modul ad IP-nkénti keretet.
 *
 * SOSEM korlátozott: a Barion-callback (`POST /api/barion/callback` — a
 * fizetési értesítés elvesztése pénzt jelent), a healthcheck (`GET /admin`) és
 * általában MINDEN nem-POST kérés. A korlátozás nem prefix-, hanem PONTOS
 * útvonal-egyezésre épül (lásd `ROUTE_CLASS_BY_PATH`), így új végpont csak
 * szándékos felvétellel kerül a hatálya alá.
 *
 * ## Vállalt korlát — folyamaton belüli számláló
 *
 * A számláló egy FOLYAMATON BELÜLI (in-memory) `Map`, nincs mögötte Redis vagy
 * bármilyen külső szolgáltatás. Ennek két következménye van, és mindkettőt
 * tudatosan vállaljuk:
 *
 *  1. **Újraindításkor nullázódik.** Deploy vagy process-restart után minden
 *     IP tiszta lappal indul.
 *  2. **Replikánként külön számol.** A Railway-en jelenleg EGY replika fut
 *     (`railway.json` → `numReplicas: 1`), ezért a folyamaton belüli számláló
 *     ma a teljes forgalmat látja. Több replikára skálázáskor a tényleges
 *     keret a replikaszámmal felszorzódik — ekkor kell megosztott tárra
 *     (pl. Postgres-tábla vagy Redis) váltani. A modul felülete
 *     (`checkRequestRateLimit`) ezt a cserét elbírja: csak a `limiter`
 *     implementációt kell kicserélni.
 *
 * Ez tudatos ELSŐ LÉPÉS: nulla új függőséggel és nulla új infrastruktúrával
 * megszünteti a korlátlan próbálkozást; a megosztott számláló külön, mérésre
 * alapozott lépés.
 *
 * ## Miért a route-rétegben, és nem a middleware-ben
 *
 * A limiter a route-handlerekbe van bekötve (Payload REST catch-all + a
 * checkout-start és a reset-password handler), a `src/middleware.ts`
 * változatlanul csak request ID-t ad. Indoklás:
 *
 *  - A Next middleware alapértelmezésben az edge-runtime homokozójában fut; a
 *    modul-szintű `Map` élettartamára és megosztására ott nincs garancia —
 *    márpedig az egész terv erre a memóriában tartott számlálóra épül. A
 *    route-handlerek ugyanabban a Node-folyamatban futnak, mint az app többi
 *    része, ott a modul-állapot megbízható.
 *  - A middleware matcher MINDEN oldalletöltésre (és RSC-kérésre) ráfut; a
 *    korlátozást ott végezve a hétköznapi böngészés is a limiter útjába
 *    kerülne. A route-rétegben csak a ténylegesen védett POST-ok érintettek.
 *  - A handler mellé kötött őr közvetlenül, mock nélkül unit-tesztelhető.
 *
 * Megjegyzés: ha a Next bundler mégis több példányban tölti be ezt a modult
 * (route-onként külön chunk), az sem ront el semmit — a kulcs tartalmazza az
 * útvonal-osztályt is, így a példányok kulcstere eleve diszjunkt.
 *
 * ## IP-kinyerés és annak korlátja
 *
 * Proxy mögött futunk, ezért a kliens IP-je a fejlécekből jön: elsődlegesen a
 * `cf-connecting-ip` (a Cloudflare felülírja, ezért a kliens nem hamisíthatja),
 * ennek hiányában az `x-forwarded-for` ELSŐ eleme. Ismert korlát: ha a kérés
 * nem a Cloudflare-en át érkezik, az `x-forwarded-for` lánc elejét a kliens
 * hamisíthatja, és IP-rotációval kerülgetheti a keretet. A védelem ezért a
 * hétköznapi visszaélést és a véletlen elárasztást fogja meg, elszánt,
 * elosztott támadót nem — arra a Cloudflare-szintű (WAF/rate limiting) védelem
 * a helyes eszköz.
 */

import { resolveClientIp } from '../audit'
import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'

// ---------------------------------------------------------------------------
// Szabályok (keret + ablak)
// ---------------------------------------------------------------------------

export interface RateLimitRule {
  /** Hány kérés engedélyezett az ablakon belül, IP-nként. */
  readonly limit: number
  /** A csúszóablak hossza ezredmásodpercben. */
  readonly windowMs: number
}

const TEN_MINUTES_MS = 10 * 60 * 1000

/**
 * Konzervatív alapértékek. A hangolás egyetlen helye ez a tábla — a keretek
 * szándékosan bőven a valós emberi használat FÖLÖTT, de a gépi visszaélés
 * ALATT vannak:
 *
 * - `registration` 5/10 perc: egy háztartás/iroda (megosztott NAT-IP) mögül is
 *   elfér néhány valódi regisztráció, gépi fióküzem viszont elakad.
 *   ÜZEMELTETÉSI KÖVETKEZMÉNY: az admin felület user-létrehozása UGYANEZT a
 *   REST-végpontot hívja, tehát 10 percen belül a 6. kézzel felvett felhasználó
 *   429-et kap. Ritka művelet, a hiba magától feloldódik — ha rendszeresen
 *   zavaró, itt kell megemelni a keretet. (A `npm run seed` a Payload local
 *   API-ját használja, azt a korlát NEM érinti.)
 * - `password-forgot` 3/10 perc: a legszűkebb keret. A végpont e-mailt küld ki,
 *   tehát idegen postaláda elárasztására (mail-bombing) és
 *   cím-létezés-szondázásra használható; valódi felhasználónak 1-2 próbálkozás
 *   bőven elég.
 * - `password-reset` 5/10 perc: a visszaállító token találgatása elleni fék.
 *   A `forgot`-nál engedékenyebb, mert a felhasználó elgépelheti az új jelszót,
 *   és a jelszó-politika (min. 12 karakter) hibái is ide futnak be.
 * - `checkout-start` 10/10 perc: minden hívás rendelést hoz létre és Barion
 *   Start-hívást indít, tehát drága. 10 próbálkozás alatt a legbizonytalanabb
 *   vásárló is végigér; sorozatos rendelés-gyártás viszont megáll.
 * - `form-submission` 5/10 perc: a Turnstile MELLETT futó második réteg —
 *   Turnstile-kulcs nélküli környezetben (a szerver ilyenkor nem ellenőriz)
 *   ez az egyetlen fék a kapcsolat-űrlapon.
 */
export const RATE_LIMIT_RULES = {
  registration: { limit: 5, windowMs: TEN_MINUTES_MS },
  'password-forgot': { limit: 3, windowMs: TEN_MINUTES_MS },
  'password-reset': { limit: 5, windowMs: TEN_MINUTES_MS },
  'checkout-start': { limit: 10, windowMs: TEN_MINUTES_MS },
  'form-submission': { limit: 5, windowMs: TEN_MINUTES_MS },
} as const satisfies Record<string, RateLimitRule>

export type RateLimitedRouteClass = keyof typeof RATE_LIMIT_RULES

export type RateLimitRules = Readonly<Record<RateLimitedRouteClass, RateLimitRule>>

/** A felhasználónak megjelenő üzenet — technikai részletet szándékosan nem árul el. */
export const RATE_LIMIT_MESSAGE = 'Túl sok próbálkozás. Kérjük, próbáld újra pár perc múlva.'

// ---------------------------------------------------------------------------
// Útvonal-osztályozás
// ---------------------------------------------------------------------------

/**
 * PONTOS útvonal → osztály. Prefix-egyezés szándékosan nincs: a `/api/users`
 * (regisztráció) és a `/api/users/login` (amit a `maxLoginAttempts` véd) így
 * nem csúszhat össze, és új Payload-végpont sem kerül véletlenül korlátozás alá.
 */
const ROUTE_CLASS_BY_PATH = new Map<string, RateLimitedRouteClass>([
  // Payload REST (a `(payload)/api/[...slug]` catch-all szolgálja ki):
  ['/api/users', 'registration'],
  ['/api/users/forgot-password', 'password-forgot'],
  ['/api/form-submissions', 'form-submission'],
  // Saját route-handlerek (maguk hívják a `checkRequestRateLimit`-et):
  ['/api/checkout/start', 'checkout-start'],
  // A jelszó-visszaállítást a Payload REST helyett a saját, jelszó-politikát
  // kikényszerítő végpont szolgálja ki (src/lib/security/reset-password-route.ts).
  ['/api/users/reset-password', 'password-reset'],
])

/**
 * Az útvonal normalizálása osztályozás előtt: kisbetűsítés (hogy a
 * `/api/USERS`-féle alakkal ne lehessen megkerülni a táblát) és a záró
 * perjel(ek) levágása.
 */
function normalizePathname(pathname: string): string {
  const lowered = pathname.toLowerCase()
  const trimmed = lowered.replace(/\/+$/, '')
  return trimmed.length > 0 ? trimmed : '/'
}

/**
 * Melyik korlátozott osztályba esik a kérés? `null` = nincs korlátozás.
 *
 * Csak a POST korlátozott: a GET/HEAD/OPTIONS olvasás és preflight (a Railway
 * healthcheckje is `GET /admin`), azokat sosem fékezzük.
 */
export function classifyRateLimitedRoute(
  method: string,
  pathname: string,
): RateLimitedRouteClass | null {
  if (method.toUpperCase() !== 'POST') {
    return null
  }
  return ROUTE_CLASS_BY_PATH.get(normalizePathname(pathname)) ?? null
}

// ---------------------------------------------------------------------------
// IP-kinyerés
// ---------------------------------------------------------------------------

/**
 * Kulcs-hossz plafon: a fejléc értékét a kliens adja, korlát nélkül egy
 * több kilobájtos `x-forwarded-for` közvetlenül memóriát foglalna a `Map`-ben.
 */
const MAX_IP_KEY_LENGTH = 64

/** Az az egyetlen gyűjtő-vödör, ahová az azonosíthatatlan forrású kérések esnek. */
export const UNKNOWN_IP_KEY = 'ismeretlen-ip'

/**
 * Kliens-IP a korlátozás kulcsához. Az extrakció a `resolveClientIp`-pel közös
 * (cf-connecting-ip → x-forwarded-for első eleme), itt csak a kulcsnak való
 * normalizálás történik: trim, kisbetűsítés, hosszvágás.
 *
 * Ha egyik fejléc sincs (pl. közvetlen, proxy nélküli hívás), az összes ilyen
 * kérés EGY közös vödörbe kerül. Éles környezetben a proxy mindig kitölti a
 * fejlécet, tehát ez a gyakorlatban a lokális/direkt hívásokat érinti.
 */
export function resolveRateLimitIp(headers: Headers | undefined): string {
  const raw = resolveClientIp(headers)
  if (!raw) {
    return UNKNOWN_IP_KEY
  }
  const normalized = raw.trim().toLowerCase().slice(0, MAX_IP_KEY_LENGTH)
  return normalized.length > 0 ? normalized : UNKNOWN_IP_KEY
}

// ---------------------------------------------------------------------------
// Csúszóablakos számláló
// ---------------------------------------------------------------------------

export interface RateLimitDecision {
  readonly allowed: boolean
  readonly limit: number
  /** Hány kérés fér még bele az ablakba (elutasításnál 0). */
  readonly remaining: number
  /** Hány másodperc múlva próbálkozhat újra (engedélyezésnél 0). */
  readonly retryAfterSeconds: number
}

interface WindowEntry {
  /** Az ablakon belüli találatok időbélyegei, növekvő sorrendben. */
  timestamps: number[]
  /** Ezen időpont után a bejegyzés biztosan elavult, a takarítás eldobhatja. */
  expiresAt: number
}

/** Legfeljebb ennyi kulcsot tartunk nyilván (memória-plafon, lásd `sweep`). */
export const DEFAULT_MAX_TRACKED_KEYS = 20_000

/** Ennél sűrűbben nem söprünk végig a teljes táblán. */
const DEFAULT_SWEEP_INTERVAL_MS = 60_000

export interface SlidingWindowRateLimiterOptions {
  /** Injektálható óra — a tesztek így valós várakozás nélkül léptetik az időt. */
  readonly now?: () => number
  readonly maxTrackedKeys?: number
  readonly sweepIntervalMs?: number
}

/**
 * Csúszóablakos (sliding window log) számláló: kulcsonként az ablakba eső
 * találatok időbélyegeit tartja. Pontosabb a fix ablaknál (nincs
 * ablakhatár-ugrás), és a tárigénye kulcsonként legfeljebb `limit` szám.
 */
export class SlidingWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>()
  private readonly now: () => number
  private readonly maxTrackedKeys: number
  private readonly sweepIntervalMs: number
  private lastSweepAt: number

  constructor(options: SlidingWindowRateLimiterOptions = {}) {
    this.now = options.now ?? (() => Date.now())
    this.maxTrackedKeys = options.maxTrackedKeys ?? DEFAULT_MAX_TRACKED_KEYS
    this.sweepIntervalMs = options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS
    this.lastSweepAt = this.now()
  }

  /** Hány kulcsot tart nyilván (memóriaszivárgás-ellenőrzéshez, teszthez). */
  get trackedKeyCount(): number {
    return this.entries.size
  }

  /** Teljes ürítés (teszt/diagnosztika). */
  reset(): void {
    this.entries.clear()
    this.lastSweepAt = this.now()
  }

  check(key: string, rule: RateLimitRule): RateLimitDecision {
    const now = this.now()
    this.sweep(now)

    const windowStart = now - rule.windowMs
    const previous = this.entries.get(key)?.timestamps ?? []
    const recent = previous.filter((timestamp) => timestamp > windowStart)

    if (recent.length >= rule.limit) {
      // Az ELUTASÍTOTT kérést szándékosan NEM számoljuk bele: különben a
      // folyamatosan újrapróbálkozó kliens maga tolná maga előtt az ablakot,
      // és sosem szabadulna ki belőle.
      this.entries.set(key, { timestamps: recent, expiresAt: now + rule.windowMs })
      const oldest = recent[0] ?? now
      return {
        allowed: false,
        limit: rule.limit,
        remaining: 0,
        // Amikor a legrégebbi találat kicsúszik az ablakból, felszabadul egy hely.
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000)),
      }
    }

    recent.push(now)
    this.entries.set(key, { timestamps: recent, expiresAt: now + rule.windowMs })
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - recent.length,
      retryAfterSeconds: 0,
    }
  }

  /**
   * Memória-takarítás, két külön ütemben.
   *
   * 1. TELJES söprés (a lejárt bejegyzések eldobása) — a teljes táblát bejárja,
   *    ezért legfeljebb `sweepIntervalMs`-onként fut. Nem külön időzítőn: az
   *    életben tartaná az event loopot, és a teszteket is megnehezítené.
   * 2. KAPACITÁS-VÁGÁS — minden híváskor lefut, de csak a felesleggel arányos
   *    számú törlést végez, tehát elárasztás alatt is O(1) hívásonként. (Ha ez
   *    is a teljes söpréshez lenne kötve, egy IP-rotációs támadás minden egyes
   *    kérésnél végigjáratná a teljes táblát — pont a támadót erősítené.)
   */
  private sweep(now: number): void {
    if (now - this.lastSweepAt >= this.sweepIntervalMs) {
      this.lastSweepAt = now
      for (const [key, entry] of this.entries) {
        if (entry.expiresAt <= now) {
          this.entries.delete(key)
        }
      }
    }

    // Végső védőháló IP-rotációs elárasztás ellen: a legrégebben felvett
    // kulcsokat ejtjük (a Map beszúrási sorrendet tart). A dobott kulcs
    // legfeljebb új keretet kap — memóriát viszont nem foglal tovább.
    let excess = this.entries.size - this.maxTrackedKeys
    if (excess <= 0) {
      return
    }
    for (const key of this.entries.keys()) {
      this.entries.delete(key)
      excess -= 1
      if (excess <= 0) {
        break
      }
    }
  }
}

/**
 * Az alkalmazás közös számlálója. Modul-szintű példány: a `next start`
 * szerverfolyamatban a route-handlerek ugyanezt látják. (Fejlesztői
 * hot-reloadkor újraépülhet — a számlálók ilyenkor nullázódnak, ami helyben
 * ártalmatlan.)
 */
const defaultRateLimiter = new SlidingWindowRateLimiter()

// ---------------------------------------------------------------------------
// Kérés-szintű ellenőrzés
// ---------------------------------------------------------------------------

export interface RateLimitRejection {
  readonly routeClass: RateLimitedRouteClass
  /** Magyar, felhasználónak megjeleníthető üzenet. */
  readonly message: string
  readonly retryAfterSeconds: number
}

export interface CheckRequestRateLimitOptions {
  readonly limiter?: SlidingWindowRateLimiter
  readonly rules?: RateLimitRules
}

/** A pathname kinyerése; érvénytelen URL esetén üres string (→ nincs korlátozás). */
function safePathname(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return ''
  }
}

/**
 * A kérés ellenőrzése. `null` = szabad az út (nem korlátozott útvonal, vagy
 * belefér a keretbe). Elutasításkor strukturált warn-log készül a request
 * ID-vel és az IP-vel, majd a hívó a saját válaszformátumában felel 429-cel.
 */
export function checkRequestRateLimit(
  request: Request,
  options: CheckRequestRateLimitOptions = {},
): RateLimitRejection | null {
  const routeClass = classifyRateLimitedRoute(request.method, safePathname(request.url))
  if (!routeClass) {
    return null
  }

  const rule = (options.rules ?? RATE_LIMIT_RULES)[routeClass]
  const ip = resolveRateLimitIp(request.headers)
  const limiter = options.limiter ?? defaultRateLimiter
  const decision = limiter.check(`${routeClass}:${ip}`, rule)

  if (decision.allowed) {
    return null
  }

  const requestId = getRequestId(request.headers) ?? generateRequestId()
  logger
    .child({ requestId, route: 'rate-limit' })
    .warn('rate-limit: a kérés túllépte az IP-nkénti keretet — 429', {
      routeClass,
      ip,
      limit: rule.limit,
      windowMs: rule.windowMs,
      retryAfterSeconds: decision.retryAfterSeconds,
    })

  return {
    routeClass,
    message: RATE_LIMIT_MESSAGE,
    retryAfterSeconds: decision.retryAfterSeconds,
  }
}

/** A 429-válasz közös fejlécei (a `Retry-After` másodpercben, RFC 9110). */
export function rateLimitHeaders(rejection: RateLimitRejection): Record<string, string> {
  return { 'Retry-After': String(rejection.retryAfterSeconds) }
}

/**
 * 429-válasz PAYLOAD REST alakban (`{ errors: [{ message }] }`) — ezt olvassa
 * ki a repó két Payload-kliense (`src/lib/auth-client.ts` és a
 * kapcsolat-űrlap `submit.ts`-e). A saját route-handlerek ettől eltérő,
 * dokumentált `{ error }` alakot használnak, ezért ott a hívó építi a választ.
 */
export function payloadRestRateLimitResponse(rejection: RateLimitRejection): Response {
  return Response.json(
    { errors: [{ message: rejection.message }] },
    { status: 429, headers: rateLimitHeaders(rejection) },
  )
}

/**
 * A Payload REST POST-handler beburkolása a korlátozóval. A limit túllépésekor
 * a Payload-handler EL SEM INDUL (nincs DB-hívás, nincs e-mail-küldés).
 */
export function withPayloadRestRateLimit<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
  options: CheckRequestRateLimitOptions = {},
): (request: Request, ...args: Args) => Promise<Response> {
  return async function rateLimitedHandler(
    request: Request,
    ...args: Args
  ): Promise<Response> {
    const rejection = checkRequestRateLimit(request, options)
    if (rejection) {
      return payloadRestRateLimitResponse(rejection)
    }
    return handler(request, ...args)
  }
}
