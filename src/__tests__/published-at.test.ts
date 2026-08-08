import type { CollectionBeforeChangeHook } from 'payload'
import { describe, expect, it } from 'vitest'

import { applyPublishedAtDefault, setPublishedAtOnFirstPublish } from '../lib/publish-status'

/**
 * `publishedAt` automatika (A5): az ELSŐ közzétételkor magától kitöltődik, de
 * meglévő értéket sosem ír felül. A bloglista ez alapján rendez, ezért két hiba
 * lenne fájdalmas: ha üresen maradna (a cikk a lista aljára esne), vagy ha
 * minden újbóli közzététel előrébb tolná a régi cikkeket.
 */

const NOW = new Date('2026-03-14T09:30:00.000Z')

type BeforeChangeArgs = Parameters<CollectionBeforeChangeHook>[0]

const hookArgs = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown> | null,
): BeforeChangeArgs => ({ data, originalDoc }) as unknown as BeforeChangeArgs

describe('applyPublishedAtDefault', () => {
  it('első közzétételkor a mentés időpontját kapja', () => {
    const data: Record<string, unknown> = { _status: 'published', title: 'Új cikk' }

    applyPublishedAtDefault(data, null, NOW)

    expect(data.publishedAt).toBe(NOW.toISOString())
  })

  it('a szerkesztő által megadott dátumot nem írja át', () => {
    const chosen = '2025-12-01T08:00:00.000Z'
    const data: Record<string, unknown> = { _status: 'published', publishedAt: chosen }

    applyPublishedAtDefault(data, null, NOW)

    expect(data.publishedAt).toBe(chosen)
  })

  it('újbóli közzététel nem tolja előre a megjelenés dátumát', () => {
    const original = { _status: 'published', publishedAt: '2025-06-30T10:00:00.000Z' }
    const data: Record<string, unknown> = { _status: 'published', title: 'Javított cím' }

    applyPublishedAtDefault(data, original, NOW)

    // A data-ba nem kerül új érték — a dokumentum meglévő dátuma marad érvényben.
    expect(data.publishedAt).toBeUndefined()
  })

  it('piszkozat mentésekor nem tölt dátumot', () => {
    const data: Record<string, unknown> = { _status: 'draft' }

    applyPublishedAtDefault(data, null, NOW)

    expect(data.publishedAt).toBeUndefined()
  })

  it('visszavonáskor (published → draft) sem tölt dátumot', () => {
    const data: Record<string, unknown> = { _status: 'draft' }

    applyPublishedAtDefault(data, { _status: 'published' }, NOW)

    expect(data.publishedAt).toBeUndefined()
  })

  it('részleges update-nél a dokumentum _status-a dönt, és a meglévő dátum marad', () => {
    const data: Record<string, unknown> = { title: 'Csak a cím változik' }

    const original = { _status: 'published', publishedAt: '2025-01-02T00:00:00.000Z' }
    applyPublishedAtDefault(data, original, NOW)

    expect(data.publishedAt).toBeUndefined()
  })

  it('részleges update-nél üres dokumentum-dátumot pótol (közzétett állapotban)', () => {
    const data: Record<string, unknown> = { title: 'Csak a cím változik' }

    applyPublishedAtDefault(data, { _status: 'published', publishedAt: null }, NOW)

    expect(data.publishedAt).toBe(NOW.toISOString())
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['üres szöveg', ''],
    ['csak szóköz', '   '],
  ])('%s értéket üresnek tekint és kitölti', (_label, value) => {
    const data: Record<string, unknown> = { _status: 'published', publishedAt: value }

    applyPublishedAtDefault(data, null, NOW)

    expect(data.publishedAt).toBe(NOW.toISOString())
  })

  it('ha a szerkesztő KITÖRLI a dátumot, a mentés újratölti', () => {
    const data: Record<string, unknown> = { _status: 'published', publishedAt: null }

    const original = { _status: 'published', publishedAt: '2025-06-30T10:00:00.000Z' }
    applyPublishedAtDefault(data, original, NOW)

    expect(data.publishedAt).toBe(NOW.toISOString())
  })
})

describe('setPublishedAtOnFirstPublish (beforeChange hook)', () => {
  it('a hook a kiegészített data-t adja vissza', () => {
    const data = setPublishedAtOnFirstPublish(
      hookArgs({ _status: 'published', title: 'Első közzététel' }),
    ) as Record<string, unknown>

    expect(data.title).toBe('Első közzététel')
    expect(typeof data.publishedAt).toBe('string')
    // Alapértelmezetten a mentés pillanata (injektálás nélkül) — ISO-formátum.
    expect(Date.parse(data.publishedAt as string)).not.toBeNaN()
  })

  it('piszkozatnál változatlanul enged tovább', () => {
    const data = setPublishedAtOnFirstPublish(hookArgs({ _status: 'draft', title: 'Piszkozat' }))

    expect(data).toEqual({ _status: 'draft', title: 'Piszkozat' })
  })

  it('data nélkül nem dob', () => {
    expect(setPublishedAtOnFirstPublish(hookArgs(undefined as never))).toBeUndefined()
  })
})
