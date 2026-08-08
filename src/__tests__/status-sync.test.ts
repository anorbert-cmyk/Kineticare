import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  resolveDraftStatus,
  setPublishedAtOnFirstPublish,
  syncStatusFromDraftStatus,
} from '../lib/publish-status'
import configPromise from '../payload.config'

/**
 * A kettős státusz feloldása (Pages + Posts).
 *
 * A szerkesztő csak a natív Piszkozat/Közzététel gombokat látja; a nyilvános
 * szűrők (publishedOrAdmin, PUBLISHED_WHERE, sitemap) viszont a saját `status`
 * mezőre néznek. A `syncStatusFromDraftStatus` hook tartja a kettőt szinkronban.
 * Ha ez elromlik, a szerkesztő „közzétett" egy oldalt, ami mégsem látszik —
 * ezért a hook viselkedését és a bekötését is teszt őrzi.
 */

type BeforeChangeArgs = Parameters<CollectionBeforeChangeHook>[0]

/**
 * A `Field` unió `admin` blokkja típusonként eltér, ezért az `admin.hidden`
 * ellenőrzéséhez szűkített alakra hozzuk (a rejtettség a select mezőn él).
 */
type HiddenAdminField = { admin?: { hidden?: boolean } }

/** Minimális hook-argumentum: a hook csak a data + originalDoc mezőkre támaszkodik. */
const hookArgs = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown> | null,
): BeforeChangeArgs => ({ data, originalDoc }) as unknown as BeforeChangeArgs

/** A beforeChange hook szinkron ága — a hook a módosított data-t adja vissza. */
const runHook = (
  hook: CollectionBeforeChangeHook,
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown> | null,
): Record<string, unknown> => hook(hookArgs(data, originalDoc)) as Record<string, unknown>

describe('resolveDraftStatus', () => {
  it('a beküldött adat _status mezőjét veszi elsődlegesen', () => {
    expect(resolveDraftStatus({ _status: 'published' })).toBe('published')
    expect(resolveDraftStatus({ _status: 'draft' })).toBe('draft')
  })

  it('részleges update-nél (nincs _status a data-ban) a dokumentum állapota marad', () => {
    expect(resolveDraftStatus({}, { _status: 'published' })).toBe('published')
    expect(resolveDraftStatus({}, { _status: 'draft' })).toBe('draft')
  })

  it('a data _status-a felülírja a dokumentum korábbi állapotát (visszavonás is)', () => {
    expect(resolveDraftStatus({ _status: 'draft' }, { _status: 'published' })).toBe('draft')
    expect(resolveDraftStatus({ _status: 'published' }, { _status: 'draft' })).toBe('published')
  })

  it('ismeretlen vagy hiányzó értéknél a biztonságos irányba, piszkozatra esik', () => {
    expect(resolveDraftStatus({ _status: 'kozzeteve' })).toBe('draft')
    expect(resolveDraftStatus({ _status: null }, { _status: undefined })).toBe('draft')
    expect(resolveDraftStatus(undefined)).toBe('draft')
    expect(resolveDraftStatus(null, null)).toBe('draft')
  })
})

describe('syncStatusFromDraftStatus (A4 hook)', () => {
  it('_status published → status published', () => {
    const data = runHook(syncStatusFromDraftStatus, { _status: 'published', title: 'Rólunk' })

    expect(data.status).toBe('published')
    // A hook a többi mezőhöz nem nyúl.
    expect(data.title).toBe('Rólunk')
  })

  it('_status draft → status draft', () => {
    const data = runHook(syncStatusFromDraftStatus, { _status: 'draft' })

    expect(data.status).toBe('draft')
  })

  it('visszavonáskor (published → draft) a saját status is visszavált', () => {
    const data = runHook(syncStatusFromDraftStatus, { _status: 'draft' }, { _status: 'published' })

    expect(data.status).toBe('draft')
  })

  it('a kézzel beküldött status értéket a _status felülírja (a gomb az egyetlen kapcsoló)', () => {
    const data = runHook(syncStatusFromDraftStatus, { _status: 'draft', status: 'published' })

    expect(data.status).toBe('draft')
  })

  it('részleges update-nél a dokumentum _status-ából dolgozik', () => {
    const data = runHook(syncStatusFromDraftStatus, { title: 'Új cím' }, { _status: 'published' })

    expect(data.status).toBe('published')
  })

  it('data nélkül nem dob (a hook a kapott értéket adja vissza)', () => {
    expect(syncStatusFromDraftStatus(hookArgs(undefined as never))).toBeUndefined()
  })
})

describe('a hookok bekötése a végleges configban', () => {
  const collectionBySlug = async (slug: string): Promise<CollectionConfig | undefined> => {
    const config = await configPromise
    return (config.collections ?? []).find((collection) => collection.slug === slug) as
      | CollectionConfig
      | undefined
  }

  it.each(['pages', 'posts'])('%s: szinkron-hook fut, a status mező rejtett', async (slug) => {
    const collection = await collectionBySlug(slug)
    const beforeChange = collection?.hooks?.beforeChange ?? []

    expect(beforeChange).toContain(syncStatusFromDraftStatus)
    // A sorrend számít: előbb a status szinkronizálódik, utána dől el, hogy ez
    // az első közzététel-e (publishedAt).
    expect(beforeChange.indexOf(syncStatusFromDraftStatus)).toBeLessThan(
      beforeChange.indexOf(setPublishedAtOnFirstPublish),
    )

    // A drafts (natív Piszkozat/Közzététel) bekapcsolva, a saját status rejtve.
    expect(collection?.versions).toBeTruthy()
    const statusField = (collection?.fields ?? []).find(
      (field) => 'name' in field && field.name === 'status',
    ) as HiddenAdminField | undefined
    expect(statusField, slug).toBeDefined()
    expect(statusField?.admin?.hidden, slug).toBe(true)
  })

  /**
   * A products saját `status` enumja (draft/published/archived) MÁS jelentésű, és
   * a plugin-oldali `adminOrPublishedStatus` a `_status`-ra szűr — a szinkron ott
   * nemcsak felesleges, hanem az 'archived' értéket is elnyelné.
   */
  it('products: a szinkron-hookok NINCSENEK rákötve', async () => {
    const products = await collectionBySlug('products')
    const beforeChange = products?.hooks?.beforeChange ?? []

    expect(products).toBeDefined()
    expect(beforeChange).not.toContain(syncStatusFromDraftStatus)
    expect(beforeChange).not.toContain(setPublishedAtOnFirstPublish)

    // A háromértékű enum épen maradt (ezért nem szinkronizálható a _status-szal).
    const statusField = (products?.fields ?? []).find(
      (field) => 'name' in field && field.name === 'status',
    ) as { options?: Array<string | { value: string }> } | undefined
    const values = (statusField?.options ?? []).map((option) =>
      typeof option === 'string' ? option : option.value,
    )
    expect(values).toContain('archived')
  })

  it('a hookok csak a pages és a posts collectionre vannak bekötve', async () => {
    const config = await configPromise
    const withSyncHook = (config.collections ?? [])
      .filter((collection) =>
        (collection.hooks?.beforeChange ?? []).includes(syncStatusFromDraftStatus),
      )
      .map((collection) => collection.slug)

    expect(withSyncHook.sort()).toEqual(['pages', 'posts'])
  })
})
