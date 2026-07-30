/**
 * Központi szerepkör-predikátumok.
 *
 * A rendszer három szerepköre: owner > staff > customer (a users.role mező).
 * Ezek a tiszta függvények a minimális user-alakra dolgoznak, így az Access /
 * FieldAccess wrapper-ek és a unit-tesztek is ugyanazt a logikát használják.
 */

export interface RoleUser {
  role?: string | null
}

/** Owner szerepkör — a legmagasabb jogosultság (pénzügyi/személyes adatok, role-kiosztás). */
export const hasOwnerRole = (user: RoleUser | null | undefined): boolean => user?.role === 'owner'

/**
 * Staff vagy owner — a közpéi/admin felület és a tartalom-kezelés szintje.
 * A rendszerben az "admin" megnevezés is ezt a két szerepkört jelenti.
 */
export const hasStaffOrOwnerRole = (user: RoleUser | null | undefined): boolean =>
  user?.role === 'owner' || user?.role === 'staff'
