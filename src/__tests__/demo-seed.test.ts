import { describe, expect, it } from 'vitest'

import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_EMAIL_DOMAIN,
  DEMO_PEOPLE,
  demoGuardErrors,
  demoOrderDates,
  demoPaymentId,
  demoPaymentState,
  isDemoEmail,
  serverUrlHost,
  watchedLessonCount,
} from '../scripts/demo-seed'
import type { Order } from '../payload-types'

/**
 * A demó-feltöltő script TISZTA (adatbázis nélküli) magja.
 *
 * A legfontosabb asszertálandó szabály az ÉLES-VÉDELEM: a script kitalált
 * vevőket és KIFIZETETT rendeléseket ír, tehát éles adatbázison katasztrófa
 * lenne. A `demoGuardErrors` a környezeti kapu — ez a teszt az őre.
 *
 * A modul importálása mellékhatás-mentes (indítás-kapu a fájl végén), így
 * adatbázis-kapcsolat nélkül tesztelhető.
 */

describe('demoGuardErrors — éles környezetben nem futhat', () => {
  it('DEMO_MODE nélkül megtagadja a futást', () => {
    const errors = demoGuardErrors({ demoMode: undefined, serverUrl: 'https://demo.example.com' })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('DEMO_MODE=1')
  })

  it('bármely más DEMO_MODE-érték is megtagadás (nem „truthy" vizsgálat)', () => {
    for (const demoMode of ['0', 'true', 'igen', 'yes', '', ' 2 ']) {
      expect(demoGuardErrors({ demoMode, serverUrl: 'https://demo.example.com' })).not.toHaveLength(
        0,
      )
    }
  })

  it('az ÉLES domain akkor is tiltott, ha a DEMO_MODE be van állítva', () => {
    for (const serverUrl of ['https://kineticare.hu', 'https://www.kineticare.hu/']) {
      const errors = demoGuardErrors({ demoMode: '1', serverUrl })
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('ÉLES')
    }
  })

  it('DEMO_MODE=1 + nem éles cím esetén nincs kifogás', () => {
    expect(
      demoGuardErrors({ demoMode: '1', serverUrl: 'https://kineticare-demo.up.railway.app' }),
    ).toEqual([])
    expect(demoGuardErrors({ demoMode: '1', serverUrl: 'https://demo.kineticare.hu' })).toEqual([])
    expect(demoGuardErrors({ demoMode: ' 1 ', serverUrl: 'http://localhost:3000' })).toEqual([])
  })

  it('hiányzó/érvénytelen szerver-URL nem old fel hosztot (és nem is bukik el rajta)', () => {
    expect(serverUrlHost(undefined)).toBeNull()
    expect(serverUrlHost('kineticare.hu')).toBeNull()
    expect(serverUrlHost('https://KINETICARE.hu')).toBe('kineticare.hu')
  })
})

describe('isDemoEmail — a demó-adat egyetlen felismerhető jegye', () => {
  it('csak az @example.com végű cím demó', () => {
    expect(isDemoEmail(`valaki@${DEMO_EMAIL_DOMAIN}`)).toBe(true)
    expect(isDemoEmail(`VALAKI@${DEMO_EMAIL_DOMAIN.toUpperCase()}`)).toBe(true)
    expect(isDemoEmail('vevo@kineticare.hu')).toBe(false)
    expect(isDemoEmail('example.com@gmail.com')).toBe(false)
    expect(isDemoEmail(null)).toBe(false)
    expect(isDemoEmail(undefined)).toBe(false)
  })
})

describe('DEMO_PEOPLE — a kitalált szereplők', () => {
  it('minden cím kitalált (@example.com) és egyedi', () => {
    const emails = DEMO_PEOPLE.map((person) => person.email)
    expect(emails.every(isDemoEmail)).toBe(true)
    expect(new Set(emails).size).toBe(emails.length)
  })

  it('nyolc vásárló + egy elakadt fizetés', () => {
    const paid = DEMO_PEOPLE.filter((person) => person.outcome === 'paid')
    const failed = DEMO_PEOPLE.filter((person) => person.outcome === 'payment_failed')
    expect(paid).toHaveLength(8)
    expect(failed).toHaveLength(1)
  })

  it('a bemutató fiókja szerepel a listában, és vásárolt', () => {
    const demoAccount = DEMO_PEOPLE.find((person) => person.email === DEMO_ACCOUNT_EMAIL)
    expect(demoAccount).toBeDefined()
    expect(demoAccount?.outcome).toBe('paid')
  })

  it('a haladás vegyes: nem kezdte / ~30% / ~70% / kész — mindegyikből kettő', () => {
    const ratios = DEMO_PEOPLE.filter((person) => person.outcome === 'paid').map(
      (person) => person.progressRatio,
    )
    for (const ratio of [0, 0.3, 0.7, 1]) {
      expect(ratios.filter((value) => value === ratio)).toHaveLength(2)
    }
  })
})

describe('demoOrderDates — a bevétel-alakulás szórása', () => {
  const now = new Date(2026, 7, 15, 14, 0, 0)

  it('annyi dátumot ad, amennyit kérünk, növekvő sorrendben', () => {
    const dates = demoOrderDates(9, now)
    expect(dates).toHaveLength(9)
    for (let index = 1; index < dates.length; index += 1) {
      expect(dates[index].getTime()).toBeGreaterThan(dates[index - 1].getTime())
    }
  })

  it('minden dátum az AKTUÁLIS naptári évbe esik és a múltban van (rendelésszám-egyezés)', () => {
    const dates = demoOrderDates(9, now)
    for (const date of dates) {
      expect(date.getFullYear()).toBe(now.getFullYear())
      expect(date.getTime()).toBeLessThan(now.getTime())
    }
  })

  it('a szórás valóban több hónapra terjed ki (nem egy napra sűrűsödik)', () => {
    const dates = demoOrderDates(9, now)
    const months = new Set(dates.map((date) => date.getMonth()))
    expect(months.size).toBeGreaterThanOrEqual(4)
  })

  it('évkezdet közeli futásnál sem esik szét (nincs nulla hosszú ablak)', () => {
    const dates = demoOrderDates(9, new Date(2026, 0, 1, 10, 0, 0))
    expect(dates).toHaveLength(9)
    expect(new Set(dates.map((date) => date.getTime())).size).toBe(9)
  })

  it('nulla vagy negatív darabszámra üres', () => {
    expect(demoOrderDates(0, now)).toEqual([])
    expect(demoOrderDates(-3, now)).toEqual([])
  })
})

describe('watchedLessonCount — a célarány leckeszámmá váltása', () => {
  it('10 leckés tananyagon 0 / 3 / 7 / 10 kész lecke', () => {
    expect(watchedLessonCount(10, 0)).toBe(0)
    expect(watchedLessonCount(10, 0.3)).toBe(3)
    expect(watchedLessonCount(10, 0.7)).toBe(7)
    expect(watchedLessonCount(10, 1)).toBe(10)
  })

  it('tetszőleges tananyag-méretnél sem lép ki a [0, összes] tartományból', () => {
    expect(watchedLessonCount(27, 1)).toBe(27)
    expect(watchedLessonCount(27, 0.3)).toBe(8)
    expect(watchedLessonCount(0, 1)).toBe(0)
    expect(watchedLessonCount(5, 2)).toBe(5)
    expect(watchedLessonCount(5, -1)).toBe(0)
  })
})

describe('demoPaymentState — a rendelés SAJÁT snapshotjából, hálózat nélkül', () => {
  const order = {
    id: 12,
    orderNumber: 'KH-2026-000012',
    totalHufSnapshot: 79500,
    currency: 'HUF',
  } as Order

  it('az összeg és a deviza a rendelés snapshotját tükrözi (az összeg-assert így megy át)', () => {
    const state = demoPaymentState(order, new Date(2026, 2, 3, 12, 0, 0))
    expect(state.Total).toBe(79500)
    expect(state.Currency).toBe('HUF')
    expect(state.Status).toBe('Succeeded')
  })

  it('a fizetésazonosító DEMO- előtagú — az adminban is látszik, hogy nem valódi', () => {
    const state = demoPaymentState(order, new Date(2026, 2, 3, 12, 0, 0))
    expect(state.PaymentId).toBe(demoPaymentId('KH-2026-000012'))
    expect(state.PaymentId.startsWith('DEMO-')).toBe(true)
    expect(state.Transactions[0]?.TransactionId.startsWith('DEMO-')).toBe(true)
  })
})
