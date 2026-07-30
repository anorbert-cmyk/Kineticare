import { describe, expect, it } from 'vitest'

import configPromise from '../payload.config'

/**
 * T-014/T-015/T-016/T-018 config-smoke: a payload.config betöltődik, és az új
 * felületek (collections, jobs, e-mail adapter, audit-injekció, form-builder)
 * valóban be vannak kötve.
 */
const slugOf = (collection: { slug: string }): string => collection.slug

describe('payload.config — T-014/T-015/T-016/T-018', () => {
  it('webhook-events és audit-logs collections regisztrálva', async () => {
    const config = await configPromise
    const slugs = (config.collections ?? []).map(slugOf)
    expect(slugs).toContain('webhook-events')
    expect(slugs).toContain('audit-logs')
  })

  it('webhook-events: (provider, externalId) egyedi index + rendszer-only írás', async () => {
    const config = await configPromise
    const collection = (config.collections ?? []).find(
      (candidate) => slugOf(candidate) === 'webhook-events',
    )
    expect(collection).toBeDefined()
    expect(collection?.indexes).toContainEqual({
      fields: ['provider', 'externalId'],
      unique: true,
    })
    expect(collection?.access?.create?.({ req: {} as never })).toBe(false)
    expect(collection?.access?.update?.({ req: {} as never })).toBe(false)
  })

  it('audit-logs: read owner-only, írás rendszer-only', async () => {
    const config = await configPromise
    const collection = (config.collections ?? []).find(
      (candidate) => slugOf(candidate) === 'audit-logs',
    )
    expect(collection).toBeDefined()
    const reqAs = (role?: string) => ({ req: { user: role ? { role } : null } as never })
    expect(collection?.access?.read?.(reqAs('owner'))).toBe(true)
    expect(collection?.access?.read?.(reqAs('staff'))).toBe(false)
    expect(collection?.access?.read?.(reqAs())).toBe(false)
    expect(collection?.access?.create?.(reqAs('owner'))).toBe(false)
    expect(collection?.access?.delete?.(reqAs('owner'))).toBe(false)
  })

  it('audit plugin: users/orders/products/pages/posts afterChange+afterDelete injekció', async () => {
    const config = await configPromise
    for (const slug of ['users', 'orders', 'products', 'pages', 'posts']) {
      const collection = (config.collections ?? []).find((candidate) => candidate.slug === slug)
      expect(collection, slug).toBeDefined()
      expect(collection?.hooks?.afterChange?.length ?? 0, slug).toBeGreaterThan(0)
      expect(collection?.hooks?.afterDelete?.length ?? 0, slug).toBeGreaterThan(0)
    }
  })

  it('jobs: webhook-retry task bekötve, autoRun csak ENABLE_JOB_WORKERS-szel', async () => {
    const config = await configPromise
    const taskSlugs = (config.jobs?.tasks ?? []).map((task) => task.slug)
    expect(taskSlugs).toContain('webhook-retry')
    // A tesztkörnyezetben ENABLE_JOB_WORKERS nincs beállítva → nincs autoRun.
    expect(config.jobs?.autoRun).toBeUndefined()
  })

  it('e-mail adapter bekötve (auth e-mailek is a provider-rétegen mennek)', async () => {
    const config = await configPromise
    expect(typeof config.email).toBe('function')
  })

  it('users auth forgot-password sablon injekció (Users.ts módosítása nélkül)', async () => {
    const config = await configPromise
    const users = (config.collections ?? []).find((candidate) => candidate.slug === 'users')
    const auth = typeof users?.auth === 'object' ? users.auth : undefined
    const forgotPassword =
      typeof auth?.forgotPassword === 'object' ? auth.forgotPassword : undefined
    expect(typeof forgotPassword?.generateEmailHTML).toBe('function')
    expect(typeof forgotPassword?.generateEmailSubject).toBe('function')
    const html = await forgotPassword?.generateEmailHTML?.({
      req: {} as never,
      token: 'tok-1',
      user: { name: 'Teszt' },
    } as never)
    expect(html).toContain('Jelszó')
    // A verify alapból nincs engedélyezve — a sablon csak engedélyezés esetén kerül rá.
    expect(auth?.verify ?? false).toBeFalsy()
  })

  it('form-builder: forms + form-submissions collections, staff+owner read, turnstile-mező', async () => {
    const config = await configPromise
    const slugs = (config.collections ?? []).map(slugOf)
    expect(slugs).toContain('forms')
    expect(slugs).toContain('form-submissions')

    const submissions = (config.collections ?? []).find(
      (candidate) => slugOf(candidate) === 'form-submissions',
    )
    const reqAs = (role?: string) => ({ req: { user: role ? { role } : null } as never })
    expect(submissions?.access?.read?.(reqAs('owner'))).toBe(true)
    expect(submissions?.access?.read?.(reqAs('staff'))).toBe(true)
    expect(submissions?.access?.read?.(reqAs())).toBeFalsy()

    const fieldNames = (submissions?.fields ?? []).map((field) =>
      'name' in field ? field.name : undefined,
    )
    expect(fieldNames).toContain('turnstileToken')
    expect(submissions?.hooks?.afterChange?.length ?? 0).toBeGreaterThan(0)
  })
})
