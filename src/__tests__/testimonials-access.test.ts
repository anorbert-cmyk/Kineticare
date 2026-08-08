import type { Access, CollectionConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { applyCollectionAccessPolicies, collectionAccessPolicies, isStaffOrOwner } from '../access'
import { visibleMenusOrAdmin } from '../access/menus-visibility'
import { visibleTestimonialsOrAdmin } from '../access/testimonials-visibility'
import { Testimonials } from '../collections/Testimonials'

/**
 * Vélemények jogosultsága (A8).
 *
 * A collection nyilvánosan olvasható — a kezdőlap M6 szekciója a nyilvános
 * olvasáson keresztül kapja az adatot —, de a levett (`visible: false`) vélemény
 * a nyilvános API-n sem szivároghat ki. A szabály a Menus `visibleMenusOrAdmin`
 * mintáját követi, és fail-closed: bármi, ami nem staff/owner, a szűrt nézetet kapja.
 */

type TestUser = { id: number; role?: string | null }

const owner: TestUser = { id: 1, role: 'owner' }
const staff: TestUser = { id: 2, role: 'staff' }
const customer: TestUser = { id: 3, role: 'customer' }

const accessArgs = (user: TestUser | null): Parameters<Access>[0] =>
  ({ req: { user } }) as unknown as Parameters<Access>[0]

/** A nem-adminok által kapott where-kényszer. */
const VISIBLE_ONLY = { visible: { equals: true } }

describe('visibleTestimonialsOrAdmin szerepkörönként', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s: minden véleményt olvas (a levetteket is)', (_label, user) => {
    expect(visibleTestimonialsOrAdmin(accessArgs(user))).toBe(true)
  })

  it('customer: csak a látható vélemények', () => {
    expect(visibleTestimonialsOrAdmin(accessArgs(customer))).toEqual(VISIBLE_ONLY)
  })

  it('látogató (nincs bejelentkezve): csak a látható vélemények', () => {
    expect(visibleTestimonialsOrAdmin(accessArgs(null))).toEqual(VISIBLE_ONLY)
  })

  it.each([
    ['ismeretlen szerepkör', { id: 4, role: 'szerkeszto' }],
    ['üres szerepkör', { id: 5, role: '' }],
    ['null szerepkör', { id: 6, role: null }],
    ['szerepkör nélküli user', { id: 7 }],
  ])('%s: fail-closed, csak a látható vélemények', (_label, user) => {
    expect(visibleTestimonialsOrAdmin(accessArgs(user as TestUser))).toEqual(VISIBLE_ONLY)
  })

  /**
   * A kiemelés NEM jogosultsági kérdés: a „legfeljebb 3 kiemelt vélemény"
   * szabályt a storefront-lekérdezés érvényesíti (src/lib/cms.ts), nem az access.
   * Ha a `featured` bekerülne a szűrőbe, az adminban a nem kiemelt vélemények
   * eltűnnének a listából.
   */
  it('a szűrő csak a visible mezőre vonatkozik (a featured nem access-kérdés)', () => {
    const result = visibleTestimonialsOrAdmin(accessArgs(null))

    expect(Object.keys(result as Record<string, unknown>)).toEqual(['visible'])
  })

  it('ugyanaz a szemantika, mint a menüké (egységes mátrix)', () => {
    for (const user of [owner, staff, customer, null]) {
      expect(visibleTestimonialsOrAdmin(accessArgs(user))).toEqual(
        visibleMenusOrAdmin(accessArgs(user)),
      )
    }
  })
})

describe('a testimonials politika a centrális mátrixban', () => {
  it('read = látható-vagy-admin, create/update/delete = staff+owner', () => {
    const policy = collectionAccessPolicies.testimonials

    expect(policy?.read).toBe(visibleTestimonialsOrAdmin)
    expect(policy?.create).toBe(isStaffOrOwner)
    expect(policy?.update).toBe(isStaffOrOwner)
    expect(policy?.delete).toBe(isStaffOrOwner)
  })

  /**
   * A collection-fájl szándékosan nem tartalmaz access-blokkot — a politikát a
   * config-pipeline applikálja rá. Ez a teszt közvetlenül az applikálót
   * ellenőrzi a valódi collection-definíción.
   */
  it('a collection-fájl access nélkül érkezik, a politika applikálása köti be', () => {
    expect(Testimonials.access).toBeUndefined()

    const [applied] = applyCollectionAccessPolicies([Testimonials as CollectionConfig])

    expect(applied.access?.read).toBe(visibleTestimonialsOrAdmin)
    expect(applied.access?.create).toBe(isStaffOrOwner)
    expect(applied.access?.update).toBe(isStaffOrOwner)
    expect(applied.access?.delete).toBe(isStaffOrOwner)
  })

  it('a collection nem használ verziózást (egyszerű: látszik vagy nem)', () => {
    expect(Testimonials.versions).toBeUndefined()
  })
})
