import { BUNNY_PLAYERJS_SOURCE } from '../security/csp'

/**
 * A Bunny HIVATALOS player.js könyvtárának betöltése — rögzített verzióról,
 * integritás-ellenőrzéssel.
 *
 * ═══ MIÉRT EZ A HIVATALOS ÚT ═══
 * A Bunny dokumentációja a saját player.js buildjének betöltését írja elő a
 * lejátszó vezérléséhez és eseményeihez. A haladás automatikus jelölése (a
 * videó ~90%-ának tényleges megnézése) ezen az eseményfolyamon áll, ezért a
 * dokumentált utat követjük — a saját, függőség nélküli postMessage-hidunk
 * (./playerjs-client.ts) TARTALÉKKÁ lép vissza, nem tűnik el.
 *
 * ═══ MIÉRT RÖGZÍTETT VERZIÓ ÉS SRI ═══
 * A Bunny doksija a `playerjs-latest.min.js` címet ajánlja. Egy „latest" URL
 * viszont azt jelenti, hogy a CDN BÁRMIKOR kicserélheti alattunk a kódot —
 * abban a dokumentumban, ahol a fiók- és a pénztár-felület is fut. Ezért:
 *  - a betöltés a RÖGZÍTETT `player-0.1.0.min.js` címről megy (ellenőrizve:
 *    2026-08-15-én bájtra AZONOS tartalmat ad, mint a `-latest`),
 *  - és `integrity` + `crossorigin="anonymous"` párossal, tehát a böngésző a
 *    scriptet KIZÁRÓLAG akkor futtatja, ha bájtra az, amit ellenőriztünk.
 * A CDN `access-control-allow-origin: *` fejlécet küld, tehát az SRI-hez
 * szükséges CORS-feltétel teljesül.
 *
 * ═══ MI TÖRTÉNIK, HA A HASH ELAVUL ═══
 * Ha a Bunny valaha lecseréli a fájlt ezen a rögzített címen, az integritás-
 * ellenőrzés megbukik, és a script NEM fut le. Ez SZÁNDÉKOS: inkább essünk
 * vissza a saját hidunkra, mint hogy ellenőrizetlen kód fusson a fizetési
 * felülettel egy dokumentumban. A tünet ilyenkor NEM hibás működés, csak az,
 * hogy a hivatalos út kimarad.
 * A hash frissítése (emberi döntéssel, a változás átnézése után):
 *   curl -sS <PLAYERJS_URL> | openssl dgst -sha384 -binary | openssl base64 -A
 *
 * ═══ MIÉRT NEM next/script ═══
 * A `next/script` deklaratív, komponens-életciklushoz kötött. A betöltés itt
 * viszont IMPERATÍV és EGYSZERI: több lejátszó-példány (és a lecke-váltás)
 * ugyanazt a globális könyvtárat használja, ezért a betöltést egyetlen,
 * megosztott ígéret (promise) fogja össze — a script legfeljebb egyszer kerül
 * a DOM-ba, akárhányszor kérik.
 */

/** A rögzített verziójú fájl teljes címe. */
export const PLAYERJS_URL = `${BUNNY_PLAYERJS_SOURCE}/playerjs/player-0.1.0.min.js`

/**
 * A fájl SHA-384 integritás-hash-e (2026-08-15, 13 693 bájt).
 * A fájl saját konstansai: `VERSION: "0.0.11"`, `CONTEXT: "player.js"`.
 */
export const PLAYERJS_INTEGRITY =
  'sha384-FzNVGZdy6ImmE/3LFewUFSxAVlmjM0wP4aKlUJYalPvzGkIEva94s2WZgmeQPVvC'

/** Ennyi idő után feladjuk a betöltést, és a tartalék útra váltunk. */
export const PLAYERJS_LOAD_TIMEOUT_MS = 8000

/** A `data-` jelölő, amivel a már beszúrt scriptet felismerjük. */
const SCRIPT_MARKER = 'data-kc-playerjs'

/**
 * A könyvtár által kirakott globális objektum MINIMÁLIS felülete — csak az,
 * amit használunk. A `playerjs.Player` egy iframe-elemet kap, és eseményekre
 * lehet feliratkozni rajta.
 */
export interface PlayerJsLibraryPlayer {
  on(event: 'ready', handler: () => void): void
  on(event: 'timeupdate', handler: (data: { seconds?: unknown; duration?: unknown }) => void): void
  on(event: 'ended', handler: () => void): void
  off?(event: string): void
}

export interface PlayerJsLibrary {
  Player: new (iframe: HTMLIFrameElement) => PlayerJsLibraryPlayer
}

/** A `window` MINIMÁLIS felülete — a modul így teszt alatt is használható. */
export interface PlayerJsLoaderWindow {
  playerjs?: unknown
  document: {
    querySelector(selectors: string): unknown
    createElement(tag: 'script'): PlayerJsScriptElement
    head: { appendChild(node: unknown): void }
  }
}

export interface PlayerJsScriptElement {
  src: string
  async: boolean
  integrity: string
  crossOrigin: string
  referrerPolicy: string
  setAttribute(name: string, value: string): void
  addEventListener(type: 'load' | 'error', handler: () => void): void
}

/** A globális objektum akkor használható, ha van rajta konstruálható `Player`. */
function asLibrary(value: unknown): PlayerJsLibrary | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const candidate = (value as { Player?: unknown }).Player
  return typeof candidate === 'function' ? (value as PlayerJsLibrary) : null
}

/**
 * Megosztott, EGYSZERI betöltés. A modul-szintű gyorsítótár szándékos: a
 * lejátszó minden lecke-váltásnál új hidat épít, de a könyvtárat csak egyszer
 * szabad letölteni.
 */
let betoltes: Promise<PlayerJsLibrary | null> | null = null

/**
 * A hivatalos könyvtár betöltése. SOSEM dob és SOSEM utasít el: sikertelen
 * betöltésnél `null`-lal tér vissza, hogy a hívó a tartalék útra válthasson.
 *
 * @param hostWindow injektálható ablak (teszt); alapértelmezésben a globális
 */
export function loadBunnyPlayerJs(
  hostWindow?: PlayerJsLoaderWindow | null,
): Promise<PlayerJsLibrary | null> {
  const win =
    hostWindow ??
    (typeof window === 'undefined' ? null : (window as unknown as PlayerJsLoaderWindow))
  if (win === null) {
    // Szerveroldali render: nincs mit betölteni.
    return Promise.resolve(null)
  }

  // Injektált ablakkal (teszt) SOSEM gyorsítótárazunk: az esetek nem
  // szennyezhetik egymást.
  if (hostWindow === undefined && betoltes !== null) {
    return betoltes
  }

  const futas = new Promise<PlayerJsLibrary | null>((resolve) => {
    const mar = asLibrary(win.playerjs)
    if (mar !== null) {
      resolve(mar)
      return
    }

    let lezart = false
    const befejez = (): void => {
      if (lezart) {
        return
      }
      lezart = true
      resolve(asLibrary(win.playerjs))
    }

    let script: PlayerJsScriptElement
    try {
      const meglevo = win.document.querySelector(`script[${SCRIPT_MARKER}]`)
      if (meglevo !== null && meglevo !== undefined) {
        // Egy másik példány már beszúrta: megvárjuk az időkorláttal.
        script = meglevo as PlayerJsScriptElement
      } else {
        script = win.document.createElement('script')
        script.src = PLAYERJS_URL
        script.async = true
        // A kettő EGYÜTT véd: a hash rögzíti a tartalmat, a crossOrigin pedig
        // ahhoz kell, hogy a böngésző egyáltalán ellenőrizhesse.
        script.integrity = PLAYERJS_INTEGRITY
        script.crossOrigin = 'anonymous'
        // A CDN-nek nem kell tudnia, melyik aloldalunkról tölt a vevő.
        script.referrerPolicy = 'no-referrer'
        script.setAttribute(SCRIPT_MARKER, 'true')
        win.document.head.appendChild(script)
      }
      script.addEventListener('load', befejez)
      // Integritás-hiba, hálózati hiba, blokkoló bővítmény — mind ide fut.
      script.addEventListener('error', befejez)
    } catch {
      // A DOM-műveletek hibája sem akaszthatja meg a lejátszást.
      befejez()
      return
    }

    if (typeof setTimeout === 'function') {
      setTimeout(befejez, PLAYERJS_LOAD_TIMEOUT_MS)
    }
  })

  if (hostWindow === undefined) {
    betoltes = futas
  }
  return futas
}

/** Teszt-segéd: a megosztott gyorsítótár ürítése. */
export function resetPlayerJsLoaderForTests(): void {
  betoltes = null
}
