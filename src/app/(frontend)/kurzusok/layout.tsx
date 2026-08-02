import type { ReactNode } from 'react'

import './kurzusok.css'

/**
 * A /kurzusok útvonal-csoport layoutja: a kurzus-saját stíluslap bekötése
 * (a globális keret — fejléc/lábléc/skip-link — a (frontend) layoutban él).
 * Extra DOM-burkolót szándékosan nem ad hozzá.
 */
export default function KurzusokLayout({ children }: { children: ReactNode }) {
  return children
}
