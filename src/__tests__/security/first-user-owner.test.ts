import { describe, expect, it, vi } from 'vitest'

import { Users } from '../../collections/Users'

/**
 * Az ELSŐ felhasználó owner-szerepkört kap.
 *
 * Enélkül a telepítés patthelyzetbe fut: a `role` mező field-access-e
 * owner-only, owner viszont még nincs, ezért a create-first-user form nem
 * küldheti a role-t, és az első user `customer`-ként jön létre. A collection
 * `access.admin` viszont `isStaffOrOwner`, tehát az első user nem jut be az
 * adminba — törölni (`access.delete: isOwner`) és a szerepkörét átírni sem
 * lehet. Ezek a tesztek őrzik, hogy a feloldás a helyén maradjon, és hogy a 2.
 * usertől a jogemelés elleni védelem változatlanul éljen.
 */

type HookArgs = {
  data: Record<string, unknown>
  operation: 'create' | 'update'
  originalDoc?: Record<string, unknown>
  req: {
    payload: { count: () => Promise<{ totalDocs: number }> }
    /** A Payload kérés-scope-ú, hookok közt megosztott tárolója. */
    context?: Record<string, unknown>
  }
}

/**
 * A hookot NÉV szerint keressük ki, nem index szerint: a beforeChange lánc
 * bővülhet (2026-08-16: a `blockForeignCredentialChange` őr került az élére),
 * és egy indexre kötött teszt ilyenkor némán MÁS hookot mérne.
 */
const beforeChangeHook = (name: string): ((args: HookArgs) => Promise<Record<string, unknown>>) => {
  const hook = (Users.hooks?.beforeChange ?? []).find((candidate) => candidate.name === name)
  if (!hook) {
    throw new Error(`a Users beforeChange láncában nincs '${name}' hook`)
  }
  return hook as unknown as (args: HookArgs) => Promise<Record<string, unknown>>
}

const promoteFirstUserToOwner = beforeChangeHook('promoteFirstUserToOwner')

const enforcePasswordPolicy = beforeChangeHook('enforcePasswordPolicy')

const reqWithUserCount = (totalDocs: number): HookArgs['req'] => ({
  payload: { count: async () => ({ totalDocs }) },
})

describe('promoteFirstUserToOwner', () => {
  it('üres users-táblánál owner szerepkört ad a létrejövő usernek', async () => {
    const data = await promoteFirstUserToOwner({
      data: { email: 'elso@kineticare.test', password: 'barmi' },
      operation: 'create',
      req: reqWithUserCount(0),
    })

    expect(data.role).toBe('owner')
  })

  it('a 2. usernél nem nyúl a role-hoz (nincs jogemelés)', async () => {
    const data = await promoteFirstUserToOwner({
      data: { email: 'masodik@kineticare.test', role: 'owner' },
      operation: 'create',
      req: reqWithUserCount(1),
    })

    // A hook változatlanul adja tovább — a role-t a mezőszintű
    // isOwnerFieldAccess szűri, nem ez a hook.
    expect(data).toEqual({ email: 'masodik@kineticare.test', role: 'owner' })
  })

  it('update műveletnél nem módosítja a role-t', async () => {
    const data = await promoteFirstUserToOwner({
      data: { name: 'Új név' },
      operation: 'update',
      req: reqWithUserCount(0),
    })

    expect(data.role).toBeUndefined()
  })
})

/**
 * A két beforeChange hook (promoteFirstUserToOwner + enforcePasswordPolicy)
 * ugyanazt kérdezi: „van-e már felhasználó?". Mivel mindkettő a beszúrás ELŐTT,
 * ugyanabban a láncban fut, a válasz nem változhat közben — a darabszám ezért a
 * `req.context`-ben megosztott, és create-enként egyetlen DB-kérdés fut.
 * Ezek a tesztek azt őrzik, hogy a megosztás a VISELKEDÉST ne változtassa meg.
 */
describe('a users-darabszám megosztása a két beforeChange hook közt', () => {
  /** Kérés-mock, amely számolja, hányszor kérdezték le a darabszámot. */
  const countingReq = (
    totalDocs: number,
  ): HookArgs['req'] & { count: ReturnType<typeof vi.fn> } => {
    const count = vi.fn(async () => ({ totalDocs }))
    return { payload: { count }, context: {}, count }
  }

  const runBothHooks = async (req: HookArgs['req'], data: Record<string, unknown>) => {
    const afterPromote = await promoteFirstUserToOwner({ data, operation: 'create', req })
    return enforcePasswordPolicy({ data: afterPromote, operation: 'create', req })
  }

  it('a lánc egyetlen count-ot futtat két helyett', async () => {
    const req = countingReq(0)

    await runBothHooks(req, { email: 'elso@kineticare.test', password: 'gyenge' })

    expect(req.count).toHaveBeenCalledTimes(1)
  })

  it('üres users-táblánál: owner szerepkör ÉS a jelszó-politika nem érvényesül', async () => {
    const req = countingReq(0)

    const data = await runBothHooks(req, { email: 'elso@kineticare.test', password: 'gyenge' })

    expect(data.role).toBe('owner')
    expect(data.password).toBe('gyenge')
    expect(req.count).toHaveBeenCalledTimes(1)
  })

  it('meglévő usernél: nincs jogemelés, a gyenge jelszó pedig elbukik', async () => {
    const req = countingReq(1)

    await expect(
      runBothHooks(req, { email: 'masodik@kineticare.test', password: 'gyenge' }),
    ).rejects.toThrow(/karakter/)
    expect(req.count).toHaveBeenCalledTimes(1)
  })

  it('meglévő usernél az erős jelszó átmegy, a role-hoz senki nem nyúl', async () => {
    const req = countingReq(1)

    const data = await runBothHooks(req, {
      email: 'masodik@kineticare.test',
      password: 'DUMMY-Eros-Teszt-Jelszo-42',
    })

    expect(data.role).toBeUndefined()
    expect(req.count).toHaveBeenCalledTimes(1)
  })

  it('context nélküli kérésen is helyesen működik (nincs megosztás, azonos eredmény)', async () => {
    const count = vi.fn(async () => ({ totalDocs: 0 }))
    const req: HookArgs['req'] = { payload: { count } }

    const data = await runBothHooks(req, { email: 'elso@kineticare.test', password: 'gyenge' })

    expect(data.role).toBe('owner')
    expect(count).toHaveBeenCalledTimes(2)
  })
})
