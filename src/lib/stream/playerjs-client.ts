import { BUNNY_STREAM_IFRAME_SOURCE } from '../security/csp'

/**
 * MINIMÁLIS player.js KLIENS a Bunny Stream iframe-lejátszóhoz — külső
 * függőség nélkül, tiszta `postMessage`-dzsel.
 *
 * ═══ MIÉRT NEM A HIVATALOS SCRIPTET HASZNÁLJUK ═══
 * A Bunny a hivatalos player.js könyvtárat az
 * `//assets.mediadelivery.net/playerjs/player-0.1.0.min.js` címen szolgálja ki,
 * és a dokumentációja ennek a betöltését javasolja. NÁLUNK EZ NEM JÁRHATÓ ÚT:
 * a Content-Security-Policy `script-src` direktívája (src/lib/security/csp.ts)
 * KIZÁRÓLAG a saját origint, a Turnstile-t és — beállított azonosító mellett —
 * a gtag.js-t engedi; az `assets.mediadelivery.net` NINCS a listán. A CSP
 * lazítása egy külső script-host felvételével biztonsági REGRESSZIÓ lenne
 * (a videó-szolgáltató scriptje ugyanabban a dokumentumban futna, mint a
 * fizetési és fiók-felület), ezért a `script-src` szándékosan marad szűk.
 *
 * Amire viszont szükségünk van, az megvan: a `frame-src` engedélyezi az
 * `iframe.mediadelivery.net`-et (csp.ts), tehát maga a beágyazott lejátszó
 * működik — és a player.js protokoll NEM igényel semmilyen letöltött kódot: ez
 * egy egyszerű, JSON-alapú `postMessage`-üzenetváltás a szülő oldal és az
 * iframe között. Ezt írja meg ez a modul, kb. száz sorban.
 *
 * ═══ A PROTOKOLL (forrás) ═══
 * Specifikáció: embedly/player.js — SPEC.rst
 *   https://github.com/embedly/player.js/blob/master/SPEC.rst
 * Bunny-oldali támogatás bejelentése és példakódja:
 *   https://bunny.net/blog/introducing-player-js-support-for-bunny-stream-advanced-player-control-and-monitoring-api/
 *
 * Minden üzenet JSON, és a `context` mező ÁLLANDÓAN `"player.js"` — pontosan
 * azért, hogy a más célú `postMessage`-forgalommal ne keveredjen.
 *
 * Metódus-üzenet (szülő → iframe):
 *   { "context": "player.js", "version": "0.0.11", "method": "addEventListener",
 *     "value": "timeupdate", "listener": "<azonosító>" }
 *
 * Esemény-üzenet (iframe → szülő):
 *   { "context": "player.js", "version": "0.0.11", "event": "timeupdate",
 *     "listener": "<azonosító>", "value": { "seconds": 10, "duration": 40 } }
 *
 * A `listener` NEM callback, hanem egy visszhangzott azonosító: minden
 * gyermek-iframe ugyanazon a csövön (a `window` `message` eseményén) küld, ezért
 * a szülőnek kell tudnia eldönteni, melyik üzenet szól NEKI. A `ready` esemény
 * a lejátszó betöltődésekor magától megérkezik; a spec szerint minden más
 * interakció ELŐTT meg kell várni.
 *
 * ═══ BIZTONSÁGI SZABÁLYOK ═══
 * 1. ORIGIN-SZŰRÉS: kizárólag a `BUNNY_STREAM_IFRAME_SOURCE` originről érkező
 *    üzenetet dolgozzuk fel. Az origin-konstanst a CSP-modulból IMPORTÁLJUK,
 *    nem írjuk le újra — így a beágyazás engedélye és a fogadás szűrője
 *    ugyanabból az EGY igazságforrásból jön, és nem tudnak elcsúszni.
 *    Kiegészítő ellenőrzés: az üzenet forrás-ablaka az iframe-é legyen.
 * 2. A TARTALOM NEM MEGBÍZHATÓ: minden mező típusszűkítéssel olvasódik ki;
 *    ismeretlen alaknál a kliens CSENDBEN visszatér.
 * 3. NEM DOBUNK a fogyasztó felé: egy hibás üzenet (vagy egy hibát dobó
 *    callback) nem akaszthatja meg a lejátszást. A hibák az opcionális
 *    `onError`-ra mennek — naplózni innen nem tudunk, mert a
 *    `src/lib/logger.ts` a szerver stdoutjára ír.
 * 4. TAKARÍTÁS: a `dispose()` leiratkozik a `message` eseményről. A komponens
 *    unmountjánál KÖTELEZŐ meghívni, különben a leiratkozatlan listener
 *    továbbra is fut (és a callbackjein át élve tartja a régi React-állapotot).
 *
 * A kimenő üzenetek célorigin-ként is a pontos Bunny-origint kapják (soha nem
 * `"*"`), így az üzenet nem szivárog ki egy közben átirányított iframe-be.
 *
 * A modult a src/__tests__/playerjs-client.test.ts fedi.
 */

/** A protokoll névtere — minden üzenet ezzel azonosítja magát. */
export const PLAYER_JS_CONTEXT = 'player.js'

/** A specifikáció verziója, ahogy a hivatalos kliens is küldi. */
export const PLAYER_JS_VERSION = '0.0.11'

/** A saját listener-azonosítóink előtagja (a hibakeresést könnyíti). */
export const PLAYER_JS_LISTENER_PREFIX = 'kc-playerjs'

/**
 * A `timeupdate` esemény hasznos tartalma.
 *
 * A `duration` `null`, ha a lejátszó nem adott értelmes hosszt (0, hiányzó vagy
 * nem szám). Így a fogyasztó (a megnézett-arány követő) nem kap hamis nevezőt.
 */
export interface PlayerTimeUpdate {
  readonly seconds: number
  readonly duration: number | null
}

/**
 * A `message` esemény MINIMÁLIS alakja. Szándékosan nem a DOM `MessageEvent`
 * típusa: így a modul környezet-független marad, és a teszt egyszerű objektummal
 * tud eseményt küldeni. A valódi `MessageEvent` szerkezetileg megfelel ennek.
 */
export interface PlayerJsMessageEvent {
  readonly origin: string
  readonly data: unknown
  readonly source?: unknown
}

/** A `message` eseményre feliratkozó ablak minimális felülete. */
export interface PlayerJsHostWindow {
  addEventListener(type: 'message', listener: (event: PlayerJsMessageEvent) => void): void
  removeEventListener(type: 'message', listener: (event: PlayerJsMessageEvent) => void): void
}

/** A beágyazott lejátszó ablakának minimális felülete. */
export interface PlayerJsFrameWindow {
  postMessage(message: string, targetOrigin: string): void
}

/**
 * Az iframe minimális felülete. A valódi `HTMLIFrameElement` megfelel neki,
 * de a teszt is tud könnyű helyettesítőt adni.
 */
export interface PlayerJsFrame {
  readonly contentWindow: PlayerJsFrameWindow | null
}

export interface BunnyPlayerBridgeOptions {
  /** A Bunny-lejátszót tartalmazó iframe. */
  iframe: PlayerJsFrame
  /** A lejátszó készen áll — innentől érkeznek az események. */
  onReady?: () => void
  /** Lejátszási pozíció változott. */
  onTimeUpdate?: (update: PlayerTimeUpdate) => void
  /** A videó végigfutott. */
  onEnded?: () => void
  /** Nem várt hiba (hibás üzenet, dobó callback). Naplózás a hívó dolga. */
  onError?: (error: unknown) => void
  /**
   * Az az ablak, amelyen a `message` események érkeznek. Alapértelmezésben a
   * globális `window`; ha nincs (szerveroldali render, teszt), a híd NO-OP.
   */
  hostWindow?: PlayerJsHostWindow
}

export interface BunnyPlayerBridge {
  /** Leiratkozás. Többszöri hívás biztonságos. */
  dispose(): void
}

/** Az általunk figyelt események — csak ennyi kell a haladás-jelöléshez. */
const SUBSCRIBED_EVENTS = ['timeupdate', 'ended'] as const

interface PlayerJsEventMessage {
  readonly event: string
  readonly listener: string | null
  readonly value: unknown
}

/**
 * Folyamatosan növekvő számláló a listener-azonosítókhoz. Szándékosan NEM
 * véletlenszám: így a viselkedés determinisztikus és tesztelhető, az egyediséget
 * pedig a monoton növekedés garantálja egy dokumentumon belül.
 */
let listenerCounter = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * A nyers `event.data` értelmezése. A gyermek-keret küldhet JSON-SZÖVEGET (így
 * teszi a hivatalos kliens is) vagy kész objektumot — mindkettőt elfogadjuk,
 * de csak akkor, ha a `context` a miénk és van esemény-név.
 */
function parsePlayerJsMessage(raw: unknown): PlayerJsEventMessage | null {
  let payload: unknown = raw
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw)
    } catch {
      // Nem a mi üzenetünk (vagy sérült) — csendben eldobjuk.
      return null
    }
  }
  if (!isRecord(payload)) {
    return null
  }
  if (payload.context !== PLAYER_JS_CONTEXT) {
    return null
  }
  const eventName = payload.event
  if (typeof eventName !== 'string' || eventName.length === 0) {
    return null
  }
  const listener = payload.listener
  return {
    event: eventName,
    listener: typeof listener === 'string' && listener.length > 0 ? listener : null,
    value: payload.value,
  }
}

/** Pozitív, véges hossz; minden más → null (lásd `PlayerTimeUpdate.duration`). */
function parseDuration(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function parseTimeUpdate(value: unknown): PlayerTimeUpdate | null {
  if (!isRecord(value)) {
    return null
  }
  const seconds = value.seconds
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return null
  }
  return { seconds, duration: parseDuration(value.duration) }
}

/** A globális `window`, ha van és használható — egyébként null (SSR/teszt). */
function resolveHostWindow(explicit?: PlayerJsHostWindow): PlayerJsHostWindow | null {
  if (explicit !== undefined) {
    return explicit
  }
  const candidate = (globalThis as { window?: unknown }).window
  if (!isRecord(candidate)) {
    return null
  }
  const { addEventListener, removeEventListener } = candidate
  if (typeof addEventListener !== 'function' || typeof removeEventListener !== 'function') {
    return null
  }
  return candidate as unknown as PlayerJsHostWindow
}

/**
 * player.js híd a Bunny-lejátszó iframe-hez.
 *
 * A híd a létrehozáskor AZONNAL feliratkozik a `message` eseményre, és
 * megpróbálja elküldeni a `addEventListener` kéréseket. Ez utóbbi „vaklövés":
 * ha az iframe még nem töltődött be, a lejátszó eldobja — ezért a `ready`
 * esemény megérkezésekor MÉGEGYSZER elküldjük. Az esetleges kettős
 * feliratkozás ártalmatlan: a `timeupdate` a megnézett-intervallumok
 * összefésülése miatt idempotens, a `ended` pedig egy már késznek jelölt leckét
 * jelöl készre újra.
 *
 * @returns `dispose()` — a komponens unmountjánál KÖTELEZŐ meghívni.
 */
export function createBunnyPlayerBridge(options: BunnyPlayerBridgeOptions): BunnyPlayerBridge {
  const { iframe, onReady, onTimeUpdate, onEnded, onError } = options
  const hostWindow = resolveHostWindow(options.hostWindow)

  listenerCounter += 1
  const listenerId = `${PLAYER_JS_LISTENER_PREFIX}-${listenerCounter}`

  let disposed = false

  const reportError = (error: unknown): void => {
    if (onError === undefined) {
      return
    }
    try {
      onError(error)
    } catch {
      // A hibakezelő hibája már tényleg nem vihet el semmit.
    }
  }

  /** Callback-hívás úgy, hogy a dobott hiba SOHA ne jusson ki a listenerből. */
  const safeInvoke = (callback: (() => void) | undefined): void => {
    if (callback === undefined) {
      return
    }
    try {
      callback()
    } catch (error) {
      reportError(error)
    }
  }

  const send = (method: string, value?: string): void => {
    const frameWindow = iframe.contentWindow
    if (frameWindow === null) {
      return
    }
    try {
      frameWindow.postMessage(
        JSON.stringify({
          context: PLAYER_JS_CONTEXT,
          version: PLAYER_JS_VERSION,
          method,
          value,
          listener: listenerId,
        }),
        // SOHA nem '*': az üzenet csak a Bunny-originnek szólhat.
        BUNNY_STREAM_IFRAME_SOURCE,
      )
    } catch (error) {
      reportError(error)
    }
  }

  const subscribe = (): void => {
    for (const eventName of SUBSCRIBED_EVENTS) {
      send('addEventListener', eventName)
    }
  }

  const handleMessage = (event: PlayerJsMessageEvent): void => {
    try {
      if (disposed) {
        return
      }
      // 1. ORIGIN — ez a legfontosabb szűrő: idegen keret nem hamisíthat haladást.
      if (event.origin !== BUNNY_STREAM_IFRAME_SOURCE) {
        return
      }
      // Kiegészítő szűrés: ha ismerjük az iframe ablakát és az üzenet mást
      // nevez meg forrásként, nem a mi lejátszónkról jött (több lejátszó egy
      // oldalon, vagy azonos originű, de idegen keret).
      const frameWindow = iframe.contentWindow
      if (
        frameWindow !== null &&
        event.source !== undefined &&
        event.source !== null &&
        event.source !== frameWindow
      ) {
        return
      }

      const message = parsePlayerJsMessage(event.data)
      if (message === null) {
        return
      }

      // 2. A `listener` visszhang: ha meg van adva és NEM a miénk, az üzenet egy
      // másik feliratkozónak szól. A `ready` kivétel — azt a lejátszó magától,
      // a mi feliratkozásunk előtt küldi.
      if (
        message.event !== 'ready' &&
        message.listener !== null &&
        message.listener !== listenerId
      ) {
        return
      }

      switch (message.event) {
        case 'ready': {
          subscribe()
          safeInvoke(onReady)
          return
        }
        case 'timeupdate': {
          const update = parseTimeUpdate(message.value)
          if (update === null) {
            return
          }
          if (onTimeUpdate !== undefined) {
            try {
              onTimeUpdate(update)
            } catch (error) {
              reportError(error)
            }
          }
          return
        }
        case 'ended': {
          safeInvoke(onEnded)
          return
        }
        default:
          // Minden más player.js esemény (play, pause, seeked, error…) minket
          // nem érdekel — a haladás-jelöléshez nem kell.
          return
      }
    } catch (error) {
      // 3. A híd SOSE dobjon: egy hibás üzenet nem akaszthatja meg a lejátszást.
      reportError(error)
    }
  }

  if (hostWindow === null) {
    // Szerveroldali render vagy `window` nélküli környezet: a híd nem csinál
    // semmit, de a szerződése (dispose) érvényes marad.
    return {
      dispose(): void {
        disposed = true
      },
    }
  }

  hostWindow.addEventListener('message', handleMessage)
  subscribe()

  return {
    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      try {
        hostWindow.removeEventListener('message', handleMessage)
      } catch (error) {
        reportError(error)
      }
    },
  }
}
