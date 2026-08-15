import { describe, expect, it, vi } from 'vitest'

import { BUNNY_PLAYERJS_SOURCE, buildContentSecurityPolicy } from '../lib/security/csp'
import {
  PLAYERJS_INTEGRITY,
  PLAYERJS_URL,
  loadBunnyPlayerJs,
  type PlayerJsLoaderWindow,
  type PlayerJsScriptElement,
} from '../lib/stream/playerjs-loader'

/**
 * A Bunny HIVATALOS player.js betöltője.
 *
 * A modul azért kritikus, mert egy KÜLSŐ host scriptjét futtatja ugyanabban a
 * dokumentumban, ahol a fiók- és a pénztár-felület. Az itteni tesztek azt
 * őrzik, ami ezt a kockázatot kordában tartja:
 *  - rögzített verziójú URL (nem „latest"),
 *  - integritás-hash ÉS crossOrigin — a kettő EGYÜTT véd,
 *  - a betöltés SOSEM dob és SOSEM utasít el: hiba esetén `null`, hogy a hívó
 *    a saját postMessage-hidunkra válthasson.
 */

/** Beszúrt scriptek naplója + vezérelhető load/error esemény. */
function createWindow(options: { existing?: PlayerJsScriptElement | null; playerjs?: unknown } = {}) {
  const scripts: PlayerJsScriptElement[] = []
  const handlers = new Map<PlayerJsScriptElement, Record<string, () => void>>()

  const makeScript = (): PlayerJsScriptElement => {
    const element = {
      src: '',
      async: false,
      integrity: '',
      crossOrigin: '',
      referrerPolicy: '',
      attributes: {} as Record<string, string>,
      setAttribute(name: string, value: string) {
        element.attributes[name] = value
      },
      addEventListener(type: 'load' | 'error', handler: () => void) {
        const current = handlers.get(element) ?? {}
        current[type] = handler
        handlers.set(element, current)
      },
    }
    return element as unknown as PlayerJsScriptElement
  }

  const win: PlayerJsLoaderWindow = {
    playerjs: options.playerjs,
    document: {
      querySelector: () => options.existing ?? null,
      createElement: () => {
        const script = makeScript()
        scripts.push(script)
        return script
      },
      head: { appendChild: () => {} },
    },
  }

  return {
    win,
    scripts,
    /** A betöltés sikerének szimulálása: a globális megjelenik, majd `load`. */
    succeed(library: unknown) {
      win.playerjs = library
      const last = scripts[scripts.length - 1]
      handlers.get(last)?.load?.()
    },
    /** Integritás- vagy hálózati hiba. */
    fail() {
      const last = scripts[scripts.length - 1]
      handlers.get(last)?.error?.()
    },
  }
}

const KONYVTAR = { Player: class {} }

describe('a betöltött fájl rögzítése', () => {
  it('RÖGZÍTETT verziójú URL-t használ, nem „latest"-et', () => {
    expect(PLAYERJS_URL).toBe(`${BUNNY_PLAYERJS_SOURCE}/playerjs/player-0.1.0.min.js`)
    expect(PLAYERJS_URL).not.toContain('latest')
  })

  it('az integritás-hash SHA-384, és a formátuma szabályos', () => {
    expect(PLAYERJS_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/)
  })

  it('a script integrity + crossOrigin PÁROSSAL kerül a DOM-ba (külön-külön nem véd)', async () => {
    const teszt = createWindow()
    const igeret = loadBunnyPlayerJs(teszt.win)
    teszt.succeed(KONYVTAR)
    await igeret

    const script = teszt.scripts[0]
    expect(script.src).toBe(PLAYERJS_URL)
    expect(script.integrity).toBe(PLAYERJS_INTEGRITY)
    expect(script.crossOrigin).toBe('anonymous')
    expect(script.async).toBe(true)
    // A CDN ne tudja meg, melyik aloldalról tölt a vevő.
    expect(script.referrerPolicy).toBe('no-referrer')
  })
})

describe('a betöltés eredménye', () => {
  it('sikeres betöltésnél a könyvtárat adja vissza', async () => {
    const teszt = createWindow()
    const igeret = loadBunnyPlayerJs(teszt.win)
    teszt.succeed(KONYVTAR)
    await expect(igeret).resolves.toBe(KONYVTAR)
  })

  it('MÁR betöltött könyvtárnál nem szúr be új scriptet', async () => {
    const teszt = createWindow({ playerjs: KONYVTAR })
    await expect(loadBunnyPlayerJs(teszt.win)).resolves.toBe(KONYVTAR)
    expect(teszt.scripts).toHaveLength(0)
  })

  it('integritás-/hálózati hibánál null — hogy a hívó tartalékra válthasson', async () => {
    const teszt = createWindow()
    const igeret = loadBunnyPlayerJs(teszt.win)
    teszt.fail()
    await expect(igeret).resolves.toBeNull()
  })

  it('betöltött script, de HIÁNYZÓ globális → null (nem féllábas siker)', async () => {
    const teszt = createWindow()
    const igeret = loadBunnyPlayerJs(teszt.win)
    teszt.succeed(undefined)
    await expect(igeret).resolves.toBeNull()
  })

  it('a globális objektum konstruálható Player NÉLKÜL nem fogadható el', async () => {
    const teszt = createWindow()
    const igeret = loadBunnyPlayerJs(teszt.win)
    teszt.succeed({ Player: 'nem függvény' })
    await expect(igeret).resolves.toBeNull()
  })

  it('ablak nélkül (szerveroldali render) null, dobás nélkül', async () => {
    await expect(loadBunnyPlayerJs(null)).resolves.toBeNull()
  })

  it('DOM-hiba esetén sem dob, csak null', async () => {
    const romlott: PlayerJsLoaderWindow = {
      document: {
        querySelector: () => {
          throw new Error('DOM elérhetetlen')
        },
        createElement: () => {
          throw new Error('DOM elérhetetlen')
        },
        head: { appendChild: () => {} },
      },
    }
    await expect(loadBunnyPlayerJs(romlott)).resolves.toBeNull()
  })

  it('időtúllépésnél null (nem lóg meg örökre)', async () => {
    vi.useFakeTimers()
    try {
      const teszt = createWindow()
      const igeret = loadBunnyPlayerJs(teszt.win)
      // Se `load`, se `error` nem érkezik — csak az idő telik.
      await vi.advanceTimersByTimeAsync(9000)
      await expect(igeret).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('CSP — a host felvétele', () => {
  const csp = buildContentSecurityPolicy()
  const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? ''

  it('a script-src engedélyezi a player.js CDN-hosztját', () => {
    expect(scriptSrc).toContain(BUNNY_PLAYERJS_SOURCE)
  })

  it('a betöltött URL a script-src-ben engedélyezett hoston van', () => {
    expect(PLAYERJS_URL.startsWith(BUNNY_PLAYERJS_SOURCE)).toBe(true)
  })

  it('az iframe-host továbbra is KÜLÖN, csak a frame-src-ben él', () => {
    const frameSrc = csp.split(';').find((d) => d.trim().startsWith('frame-src')) ?? ''
    expect(frameSrc).toContain('https://iframe.mediadelivery.net')
    // A lejátszó KERETE nem kap script-jogot a mi dokumentumunkban.
    expect(scriptSrc).not.toContain('https://iframe.mediadelivery.net')
  })

  it("az 'unsafe-eval' továbbra sincs a script-src-ben", () => {
    expect(scriptSrc).not.toContain('unsafe-eval')
  })
})
