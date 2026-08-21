import { describe, expect, it } from 'vitest'

import { trimTruncatedProgress } from '../lib/statistics/progress-truncation'

/**
 * A csonkolt haladás-lista levágása — a KÖZÖS szabály tesztjei.
 *
 * A szabály két felületet szolgál ki (kurzus-haladás panel és a Statisztika
 * nézet Kurzus-hatás táblája), ezért itt magában is mérjük, nem csak a
 * hívókon keresztül. A tétel egy mondatban: csonkolásnál inkább hiányozzon
 * egy diák, mint hogy hamis szám kerüljön a neve elé.
 */

function sor(userId: number, videoRef: string) {
  return { userId, videoRef }
}

function diak(userId: number) {
  return { userId, email: '', name: null }
}

describe('trimTruncatedProgress', () => {
  it('csonkolás nélkül mindent változatlanul enged át', () => {
    const progressRows = [sor(1, 'v1'), sor(2, 'v1')]
    const enrollments = [diak(1), diak(2), diak(3)]
    const eredmeny = trimTruncatedProgress({ progressRows, enrollments, truncated: false })

    expect(eredmeny.progressRows).toBe(progressRows)
    expect(eredmeny.enrollments).toBe(enrollments)
    expect(eredmeny.omitted).toBe(0)
  })

  it('csonkolásnál az utolsó felhasználó MINDEN sorát eldobja', () => {
    // A 3. diák sorai félbevágódhattak: róla csak alulmért százalék jönne ki.
    const eredmeny = trimTruncatedProgress({
      progressRows: [sor(1, 'v1'), sor(2, 'v1'), sor(3, 'v1'), sor(3, 'v2')],
      enrollments: [diak(1), diak(2), diak(3), diak(4)],
      truncated: true,
    })

    expect(eredmeny.progressRows).toEqual([sor(1, 'v1'), sor(2, 'v1')])
    // A 3. és a 4. diák is kimarad: a 4-esről semmilyen sorunk nincs.
    expect(eredmeny.enrollments.map((entry) => entry.userId)).toEqual([1, 2])
    expect(eredmeny.omitted).toBe(2)
  })

  it('nem módosítja a kapott tömböket (a hívó nyers adata sértetlen marad)', () => {
    const progressRows = [sor(1, 'v1'), sor(2, 'v1')]
    const enrollments = [diak(1), diak(2)]
    trimTruncatedProgress({ progressRows, enrollments, truncated: true })

    expect(progressRows).toHaveLength(2)
    expect(enrollments).toHaveLength(2)
  })

  it('üres haladás-listánál nem dob el beiratkozottat', () => {
    // Ilyenkor nincs mihez viszonyítani: a „senki nem kezdte el" IGAZ állítás,
    // a listát nem szabad emiatt megcsonkítani.
    const eredmeny = trimTruncatedProgress({
      progressRows: [],
      enrollments: [diak(1), diak(2)],
      truncated: true,
    })

    expect(eredmeny.enrollments).toHaveLength(2)
    expect(eredmeny.omitted).toBe(0)
  })

  it('ha minden sor ugyanazé a felhasználóé, mindent eldob', () => {
    const eredmeny = trimTruncatedProgress({
      progressRows: [sor(5, 'v1'), sor(5, 'v2')],
      enrollments: [diak(5), diak(6)],
      truncated: true,
    })

    expect(eredmeny.progressRows).toEqual([])
    expect(eredmeny.enrollments).toEqual([])
    expect(eredmeny.omitted).toBe(2)
  })
})
