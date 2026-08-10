import { describe, expect, it } from 'vitest'

import { linkFields } from '../blocks/link-fields'
import { Menus } from '../collections/Menus'
import { CMS_URL_REQUIRED_MESSAGE, CMS_URL_VALIDATION_MESSAGE } from '../lib/safe-url'

/**
 * SZERKESZTŐI VISSZAJELZÉS a tiltott alakú webcímre (Payload `validate`).
 *
 * A renderelés-oldali szűrés (src/lib/safe-url.ts) CSENDBEN ejti a tiltott
 * címet: a gomb letiltva jelenik meg, a menüpont kimarad a navigációból. A
 * szerkesztő ebből semmit nem lát — elmenti, „sikeres" visszajelzést kap, és
 * csak jóval később derül ki, hogy a link nem működik. Ez a teszt azt rögzíti,
 * hogy a mentés MAGYAR üzenettel elutasítja a rossz értéket, az ÜRES érték
 * viszont ott érvényes marad, ahol a mező nem kötelező.
 *
 * A `validate` NEM access-control (nem `access` blokk, nem auth-hook), tehát
 * nem tilos zóna — de szerkesztői viselkedést változtat.
 */

/** A mezőn ténylegesen hívható validate — csak amit a mi implementációnk olvas. */
type UrlFieldValidate = (
  value: string | null | undefined,
  options: { siblingData?: unknown },
) => string | true

interface FieldNode {
  name?: string
  fields?: FieldNode[]
  validate?: unknown
}

/** A mezőfa első `url` nevű mezőjének validate-je (mélységi kereséssel). */
function findUrlValidate(fields: readonly unknown[]): UrlFieldValidate {
  for (const rawField of fields) {
    const field = rawField as FieldNode
    if (field.name === 'url' && typeof field.validate === 'function') {
      return field.validate as UrlFieldValidate
    }
    if (Array.isArray(field.fields)) {
      const nested = field.fields.find((child) => child.name === 'url')
      if (nested && typeof nested.validate === 'function') {
        return nested.validate as UrlFieldValidate
      }
    }
  }
  throw new Error('Nem található `url` mező validate-tel a mezőlistában.')
}

/** Tiltott alakok — ugyanaz a készlet mindkét mezőre. */
const HOSTILE_VALUES: Array<[string, string]> = [
  ['javascript séma', 'javascript:alert(1)'],
  ['data URI', 'data:text/html,<script>alert(1)</script>'],
  ['tel séma (nincs az allowlistán)', 'tel:+36301234567'],
  ['protokoll-relatív cím', '//idegen.example/phish'],
  ['backslash-trükk', '/\\idegen.example'],
  ['séma nélküli relatív útvonal', 'kurzusok/12'],
  ['tabbal álcázott javascript', 'java\tscript:alert(1)'],
]

/** Engedélyezett alakok — ezeket a mentésnek át kell engednie. */
const ALLOWED_VALUES: Array<[string, string]> = [
  ['gyökér-relatív útvonal', '/kurzusok'],
  ['külső https cím', 'https://pelda.hu/cikk'],
  ['mailto cím', 'mailto:info@kineticare.hu'],
  ['lapon belüli horgony', '#ingyenes'],
]

describe('link-fields `url` — szerkesztői validate', () => {
  const validate = findUrlValidate(linkFields())

  it.each(ALLOWED_VALUES)('POZITÍV KONTROLL: %s átmegy', (_label, value) => {
    expect(validate(value, {})).toBe(true)
  })

  it.each(HOSTILE_VALUES)('%s → magyar hibaüzenet', (_label, value) => {
    expect(validate(value, {})).toBe(CMS_URL_VALIDATION_MESSAGE)
  })

  it('az ÜRES érték érvényes marad a NEM kötelező mezőn', () => {
    expect(validate('', {})).toBe(true)
    expect(validate('   ', {})).toBe(true)
    expect(validate(null, {})).toBe(true)
    expect(validate(undefined, {})).toBe(true)
  })

  /**
   * A `required: true` mezőn (src/blocks/film-hero.ts: `urlRequired: true`) a
   * kötelezőséget MAGÁNAK a validate-nek kell kikényszerítenie: saját
   * `validate` mellett a Payload nem teszi be az alapértelmezett, required-et
   * is ellenőrző validációt
   * (node_modules/payload/dist/fields/config/sanitize.js:153-167).
   */
  it('KÖTELEZŐ mezőn az üres érték elutasítva, magyar üzenettel', () => {
    const requiredValidate = findUrlValidate(linkFields({ urlRequired: true }))

    expect(requiredValidate('', {})).toBe(CMS_URL_REQUIRED_MESSAGE)
    expect(requiredValidate(undefined, {})).toBe(CMS_URL_REQUIRED_MESSAGE)
    // A kitöltött, jó érték továbbra is átmegy.
    expect(requiredValidate('/kurzusok', {})).toBe(true)
    // A kitöltött, rossz érték az ALAK-üzenetet kapja, nem a kötelezőségit.
    expect(requiredValidate('javascript:alert(1)', {})).toBe(CMS_URL_VALIDATION_MESSAGE)
  })
})

describe('Menus `url` („Külső link") — szerkesztői validate', () => {
  const validate = findUrlValidate(Menus.fields)
  const asUrlMenu = { siblingData: { type: 'url' } }

  it.each(ALLOWED_VALUES)('POZITÍV KONTROLL: %s átmegy', (_label, value) => {
    expect(validate(value, asUrlMenu)).toBe(true)
  })

  it.each(HOSTILE_VALUES)('%s → magyar hibaüzenet', (_label, value) => {
    expect(validate(value, asUrlMenu)).toBe(CMS_URL_VALIDATION_MESSAGE)
  })

  it('az ÜRES érték nem itt bukik (a kötelezőséget a menü-konzisztencia adja)', () => {
    expect(validate('', asUrlMenu)).toBe(true)
    expect(validate(undefined, asUrlMenu)).toBe(true)
  })

  /**
   * Más típusnál a mező nem is látszik (admin `condition`), és a
   * `resolveMenuHref` sem olvassa — egy típusváltás után benne ragadt régi
   * érték ezért nem akadályozhatja meg egy amúgy helyes menüpont mentését.
   */
  it('NEM „url" típusnál a mező tartalma nem blokkolja a mentést', () => {
    expect(validate('javascript:alert(1)', { siblingData: { type: 'page' } })).toBe(true)
    expect(validate('javascript:alert(1)', { siblingData: {} })).toBe(true)
    expect(validate('javascript:alert(1)', {})).toBe(true)
  })
})
