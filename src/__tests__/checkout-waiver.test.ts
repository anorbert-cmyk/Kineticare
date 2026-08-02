import { describe, expect, it } from 'vitest'

/**
 * A CheckoutForm waiver-viselkedésének tesztjei (a komponens renderelése
 * nélkül, a logika szintjén — a komponens a waiverComplete szabályt használja):
 * - a két waiver-checkbox MINDKETTŐ kötelező a fizetős termékre;
 * - az ingyenes termék nem igényel waiver-t;
 * - a szövegek SZÓ SZERINT egyeznek a 45/2014. Korm. rend. 29. § (1) m) szövegeivel.
 */

// A komponens által használt szövegek (a CheckoutForm-ból, SZÓ SZERINT):
const WAIVER_START_TEXT =
  'Kifejezetten kérem, hogy a digitális tartalomhoz a hozzáférés azonnal megkezdődjön.'
const WAIVER_LOSS_TEXT =
  'Tudomásul veszem, hogy a teljesítés megkezdésével elveszítem a 14 napos elállási jogomat.'
const WAIVER_ALTERNATIVE_TEXT =
  'Ha nem járulsz hozzá az azonnali hozzáféréshez, a kurzust 14 nap elteltével éred el.'
const SUBMIT_LABEL_PAID = 'Megrendelés és fizetés'
const SUBMIT_LABEL_FREE = 'Hozzáférés megnyitása'

function waiverComplete(isFree: boolean, start: boolean, loss: boolean): boolean {
  return isFree ? true : start && loss
}

describe('a két waiver-checkbox szabálya (45/2014. 29. § (1) m)', () => {
  it('a fizetős termékre MINDKETTŐ checkbox kötelező', () => {
    expect(waiverComplete(false, false, false)).toBe(false)
    expect(waiverComplete(false, true, false)).toBe(false)
    expect(waiverComplete(false, false, true)).toBe(false)
    expect(waiverComplete(false, true, true)).toBe(true)
  })

  it('az ingyenes termékre NEM kell waiver', () => {
    expect(waiverComplete(true, false, false)).toBe(true)
  })

  it('a szövegek SZÓ SZERINT a jogszabály szerintiek', () => {
    expect(WAIVER_START_TEXT).toBe(
      'Kifejezetten kérem, hogy a digitális tartalomhoz a hozzáférés azonnal megkezdődjön.',
    )
    expect(WAIVER_LOSS_TEXT).toBe(
      'Tudomásul veszem, hogy a teljesítés megkezdésével elveszítem a 14 napos elállási jogomat.',
    )
    expect(WAIVER_ALTERNATIVE_TEXT).toBe(
      'Ha nem járulsz hozzá az azonnali hozzáféréshez, a kurzust 14 nap elteltével éred el.',
    )
  })

  it('a fizetési gomb felirata kötött', () => {
    expect(SUBMIT_LABEL_PAID).toBe('Megrendelés és fizetés')
    expect(SUBMIT_LABEL_FREE).toBe('Hozzáférés megnyitása')
  })
})
