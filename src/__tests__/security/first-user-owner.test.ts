import { afterEach, describe, expect, it, vi } from 'vitest'

import { Users } from '../../collections/Users'

/**
 * Az ELSŐ felhasználó owner-szerepkört kap — de CSAK telepítési flaggel.
 *
 * Enélkül a telepítés patthelyzetbe fut: a `role` mező field-access-e
 * owner-only, owner viszont még nincs, ezért a create-first-user form nem
 * küldheti a role-t, és az első user `customer`-ként jön létre. A collection
 * `access.admin` viszont `isStaffOrOwner`, tehát az első user nem jut be az
 * adminba — törölni (`access.delete: isOwner`) és a szerepkörét átírni sem
 * lehet. A promóció az ALLOW_FIRST_USER_OWNER=true flaghez kötött (sec-review):
 * flag nélkül az első user is customer marad, és a hook warning-naplót ír.
 * Ezek a tesztek őrzik, hogy a feloldás a flag mögött a helyén maradjon, és
 * hogy a 2. usertől a jogemelés elleni védelem változatlanul éljen.
 */

type HookArgs = {
  data: Record<string, unknown>
  operation: 'create' | 'update'
  req: { payload: { count: () => Promise<{ totalDocs: number }> } }
}

const promoteFirstUserToOwner = (Users.hooks?.beforeChange ?? [])[0] as unknown as (
  args: HookArgs,
) => Promise<Record<string, unknown>>

const reqWithUserCount = (totalDocs: number): HookArgs['req'] => ({
  payload: { count: async () => ({ totalDocs }) },
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('promoteFirstUserToOwner', () => {
  it('flaggel: üres users-táblánál owner szerepkört ad a létrejövő usernek', async () => {
    vi.stubEnv('ALLOW_FIRST_USER_OWNER', 'true')

    const data = await promoteFirstUserToOwner({
      data: { email: 'elso@kineticare.test', password: 'barmi' },
      operation: 'create',
      req: reqWithUserCount(0),
    })

    expect(data.role).toBe('owner')
  })

  it('flag nélkül: az első user is customer marad (nincs automatikus promóció)', async () => {
    const data = await promoteFirstUserToOwner({
      data: { email: 'elso@kineticare.test', password: 'barmi' },
      operation: 'create',
      req: reqWithUserCount(0),
    })

    expect(data.role).toBeUndefined()
  })

  it('nem-"true" flagérték (pl. "1") sem promótál', async () => {
    vi.stubEnv('ALLOW_FIRST_USER_OWNER', '1')

    const data = await promoteFirstUserToOwner({
      data: { email: 'elso@kineticare.test', password: 'barmi' },
      operation: 'create',
      req: reqWithUserCount(0),
    })

    expect(data.role).toBeUndefined()
  })

  it('a 2. usernél nem nyúl a role-hoz (nincs jogemelés) — flaggel sem', async () => {
    vi.stubEnv('ALLOW_FIRST_USER_OWNER', 'true')

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
    vi.stubEnv('ALLOW_FIRST_USER_OWNER', 'true')

    const data = await promoteFirstUserToOwner({
      data: { name: 'Új név' },
      operation: 'update',
      req: reqWithUserCount(0),
    })

    expect(data.role).toBeUndefined()
  })
})
