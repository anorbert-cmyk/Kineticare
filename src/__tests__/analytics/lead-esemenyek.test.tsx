import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LeadForras, LeadTrackers } from '../../lib/analytics/lead-events'

/**
 * A LEAD-funnel eseményei — a SZERZŐDÉS tesztje.
 *
 * Amit ez a réteg őriz:
 *  1. az eseménynevek nem csúszhatnak el (`lead_submitted`, `lead_succeeded`) —
 *     a funnel-riportok pontosan ezekre a sztringekre épülnek;
 *  2. MIND A NÉGY űrlap beköti a mérést, és a SAJÁT forrás-címkéjét küldi
 *     (a rossz címke ugyanolyan néma hiba, mint a hiányzó esemény);
 *  3. a `lead_submitted` a beküldés ELŐTT, a `lead_succeeded` KIZÁRÓLAG
 *     sikeres szerverválasz után megy ki — a kettő különbsége maga a mérőszám;
 *  4. a mérés hibája NEM ronthatja el a beküldést;
 *  5. SZEMÉLYES ADAT nem szivároghat az eseményekbe (harmadik félhez, a
 *     PostHogba mennek ki): e-mail, név, telefonszám, üzenetszöveg SOHA.
 *
 * HÁLÓZAT: a globális fetch hangosan dobó mock, hogy egyetlen ág se
 * indíthasson valódi hívást (CLAUDE.md 15. tanulság). A beküldő függvényeket
 * mindenhol injektált kémek helyettesítik.
 */

const captureAnalyticsEvent = vi.fn()

vi.mock('../../lib/analytics/posthog', async () => {
  const tenyleges = await vi.importActual<typeof import('../../lib/analytics/posthog')>(
    '../../lib/analytics/posthog',
  )
  return {
    ...tenyleges,
    captureAnalyticsEvent: (...args: unknown[]) => captureAnalyticsEvent(...args),
  }
})

const { ANALYTICS_EVENTS } = await import('../../lib/analytics/posthog')
const { LEAD_FORRASOK, trackLeadSubmitted, trackLeadSucceeded, withLeadTracking } = await import(
  '../../lib/analytics/lead-events'
)

const { trackedSubmitContact } = await import(
  '../../app/(frontend)/kapcsolat/_components/ContactForm'
)
const { trackedSubmitAppointment } = await import('../../components/blocks/AppointmentForm')
const { trackedSubmitNewsletter } = await import('../../components/layout/NewsletterForm')
const { trackedSubmitFreeCourseRequest } = await import(
  '../../components/courses/FreeCourseRequestForm'
)

vi.stubGlobal('fetch', () => {
  throw new Error('A tesztből SOSEM mehet ki valódi hálózati hívás.')
})

beforeEach(() => {
  captureAnalyticsEvent.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A legutóbbi hívás [eseménynév, tulajdonságok] párja. */
function utolsoHivas(): [string, Record<string, unknown>] {
  const call = captureAnalyticsEvent.mock.calls.at(-1)
  expect(call).toBeDefined()
  return call as [string, Record<string, unknown>]
}

/** Kém-küldőpár: a rögzített hívásokat `['submitted'|'succeeded', forrás, extra]` alakban gyűjti. */
function kemKuldok(): { trackers: LeadTrackers; hivasok: Array<[string, LeadForras, unknown]> } {
  const hivasok: Array<[string, LeadForras, unknown]> = []
  return {
    hivasok,
    trackers: {
      submitted: (forras, extra) => {
        hivasok.push(['submitted', forras, extra])
      },
      succeeded: (forras, extra) => {
        hivasok.push(['succeeded', forras, extra])
      },
    },
  }
}

describe('a lead-funnel eseménynevei', () => {
  it('a két eseménynév rögzített (a riportok ezekre épülnek)', () => {
    expect(ANALYTICS_EVENTS.leadSubmitted).toBe('lead_submitted')
    expect(ANALYTICS_EVENTS.leadSucceeded).toBe('lead_succeeded')
  })

  it('a többi funnel eseményei érintetlenek maradtak', () => {
    expect(ANALYTICS_EVENTS.courseViewed).toBe('course_viewed')
    expect(ANALYTICS_EVENTS.checkoutStarted).toBe('checkout_started')
    expect(ANALYTICS_EVENTS.purchaseConfirmed).toBe('purchase_confirmed')
    expect(ANALYTICS_EVENTS.courseStarted).toBe('course_started')
  })

  it('a forrás-készlet ZÁRT, és pontosan a négy lead-űrlapot fedi', () => {
    expect([...LEAD_FORRASOK]).toEqual([
      'kapcsolat',
      'idopontkeres',
      'hirlevel',
      'ingyenes-kurzus',
    ])
  })
})

describe('trackLeadSubmitted és trackLeadSucceeded', () => {
  it('a forrás-címkét küldik, a saját eseménynevükkel', () => {
    trackLeadSubmitted('kapcsolat')
    expect(utolsoHivas()).toEqual(['lead_submitted', { leadSource: 'kapcsolat' }])

    trackLeadSucceeded('hirlevel')
    expect(utolsoHivas()).toEqual(['lead_succeeded', { leadSource: 'hirlevel' }])
  })

  it('a tulajdonságkulcs leadSource — nem forras (a többi eseményprop is angol)', () => {
    trackLeadSubmitted('kapcsolat')
    const [, submitted] = utolsoHivas()
    expect(Object.keys(submitted)).toEqual(['leadSource'])
    expect(submitted).not.toHaveProperty('forras')

    trackLeadSucceeded('ingyenes-kurzus', { courseId: 3 })
    const [, succeeded] = utolsoHivas()
    expect(Object.keys(succeeded).sort()).toEqual(['courseId', 'leadSource'])
    expect(succeeded).not.toHaveProperty('forras')
  })

  it('a kurzus-azonosító akkor és csak akkor kerül ki, ha van', () => {
    trackLeadSubmitted('ingyenes-kurzus', { courseId: 2 })
    expect(utolsoHivas()).toEqual(['lead_submitted', { leadSource: 'ingyenes-kurzus', courseId: 2 }])

    trackLeadSubmitted('ingyenes-kurzus')
    expect(utolsoHivas()).toEqual(['lead_submitted', { leadSource: 'ingyenes-kurzus' }])

    trackLeadSubmitted('ingyenes-kurzus', {})
    expect(utolsoHivas()).toEqual(['lead_submitted', { leadSource: 'ingyenes-kurzus' }])

    // NaN-t sosem küldünk ki: mérhetetlen érték a riportban.
    trackLeadSubmitted('ingyenes-kurzus', { courseId: Number.NaN })
    expect(utolsoHivas()).toEqual(['lead_submitted', { leadSource: 'ingyenes-kurzus' }])
  })
})

describe('withLeadTracking — a két esemény sorrendje a szerződés', () => {
  it('a `submitted` a beküldés ELŐTT megy ki (nem utána)', async () => {
    const sorrend: string[] = []
    const trackers: LeadTrackers = {
      submitted: () => {
        sorrend.push('submitted')
      },
      succeeded: () => {
        sorrend.push('succeeded')
      },
    }

    await withLeadTracking(
      'kapcsolat',
      async () => {
        sorrend.push('bekuldes')
        return { ok: true as const }
      },
      { trackers },
    )

    expect(sorrend).toEqual(['submitted', 'bekuldes', 'succeeded'])
  })

  it('HIBÁS szerverválasznál CSAK a `submitted` megy ki — a különbség a mérőszám', async () => {
    const { trackers, hivasok } = kemKuldok()

    const eredmeny = await withLeadTracking(
      'kapcsolat',
      async () => ({ ok: false as const, message: 'Nem sikerült.' }),
      { trackers },
    )

    expect(eredmeny.ok).toBe(false)
    expect(hivasok.map(([nev]) => nev)).toEqual(['submitted'])
  })

  it('a beküldés KIVÉTELÉT nem nyeli el, de a `submitted` már kiment', async () => {
    const { trackers, hivasok } = kemKuldok()

    await expect(
      withLeadTracking(
        'kapcsolat',
        async () => {
          throw new Error('hálózati hiba')
        },
        { trackers },
      ),
    ).rejects.toThrow('hálózati hiba')

    expect(hivasok.map(([nev]) => nev)).toEqual(['submitted'])
  })

  it('a MÉRÉS hibája nem ronthatja el a beküldést (egyik küldőnél sem)', async () => {
    const robban = () => {
      throw new Error('a PostHog elszállt')
    }

    await expect(
      withLeadTracking('kapcsolat', async () => ({ ok: true as const }), {
        trackers: { submitted: robban, succeeded: robban },
      }),
    ).resolves.toEqual({ ok: true })
  })

  it('küldők injektálása nélkül a VALÓDI PostHog-küldőket használja', async () => {
    await withLeadTracking('idopontkeres', async () => ({ ok: true as const }))

    expect(captureAnalyticsEvent.mock.calls).toEqual([
      ['lead_submitted', { leadSource: 'idopontkeres' }],
      ['lead_succeeded', { leadSource: 'idopontkeres' }],
    ])
  })
})

describe('a négy űrlap be van kötve, a SAJÁT forrás-címkéjével', () => {
  it('a kapcsolat-űrlap `kapcsolat` címkével mér', async () => {
    const { trackers, hivasok } = kemKuldok()

    const eredmeny = await trackedSubmitContact(
      { form: '7', submissionData: [] },
      { submit: async () => ({ ok: true as const }), lead: trackers },
    )

    expect(eredmeny.ok).toBe(true)
    expect(hivasok).toEqual([
      ['submitted', 'kapcsolat', undefined],
      ['succeeded', 'kapcsolat', undefined],
    ])
  })

  it('az időpontkérő űrlap `idopontkeres` címkével mér', async () => {
    const { trackers, hivasok } = kemKuldok()

    const eredmeny = await trackedSubmitAppointment(
      { form: '7', submissionData: [] },
      { submit: async () => ({ ok: true as const }), lead: trackers },
    )

    expect(eredmeny.ok).toBe(true)
    expect(hivasok).toEqual([
      ['submitted', 'idopontkeres', undefined],
      ['succeeded', 'idopontkeres', undefined],
    ])
  })

  it('a hírlevél-űrlap `hirlevel` címkével mér', async () => {
    const { trackers, hivasok } = kemKuldok()

    const eredmeny = await trackedSubmitNewsletter(
      { form: '7', submissionData: [] },
      { submit: async () => ({ ok: true as const }), track: () => true, lead: trackers },
    )

    expect(eredmeny.ok).toBe(true)
    expect(hivasok).toEqual([
      ['submitted', 'hirlevel', undefined],
      ['succeeded', 'hirlevel', undefined],
    ])
  })

  it('az ingyenes kurzus igénylése `ingyenes-kurzus` címkével és kurzus-azonosítóval mér', async () => {
    const { trackers, hivasok } = kemKuldok()

    const eredmeny = await trackedSubmitFreeCourseRequest(
      {
        productId: 2,
        name: 'Teszt Elek',
        email: 'teszt@pelda.hu',
        consentPrivacy: true,
      },
      { submit: async () => ({ ok: true as const, emailSent: true }), lead: trackers },
    )

    expect(eredmeny.ok).toBe(true)
    expect(hivasok).toEqual([
      ['submitted', 'ingyenes-kurzus', { courseId: 2 }],
      ['succeeded', 'ingyenes-kurzus', { courseId: 2 }],
    ])
  })

  it('a kimenő levél elmaradása NEM veszi el a sikert (a lead létrejött)', async () => {
    const { trackers, hivasok } = kemKuldok()

    await trackedSubmitFreeCourseRequest(
      { productId: 5, name: 'Teszt Elek', email: 'teszt@pelda.hu', consentPrivacy: true },
      { submit: async () => ({ ok: true as const, emailSent: false }), lead: trackers },
    )

    expect(hivasok.map(([nev]) => nev)).toEqual(['submitted', 'succeeded'])
  })
})

describe('hibás beküldésnél EGYIK űrlap sem jelent sikert', () => {
  it('mind a négy burok csak a `submitted`-et küldi ki', async () => {
    const kapcsolat = kemKuldok()
    await trackedSubmitContact(
      { form: '7', submissionData: [] },
      { submit: async () => ({ ok: false as const, message: 'Hiba.' }), lead: kapcsolat.trackers },
    )
    expect(kapcsolat.hivasok.map(([nev]) => nev)).toEqual(['submitted'])

    const idopont = kemKuldok()
    await trackedSubmitAppointment(
      { form: '7', submissionData: [] },
      { submit: async () => ({ ok: false as const, message: 'Hiba.' }), lead: idopont.trackers },
    )
    expect(idopont.hivasok.map(([nev]) => nev)).toEqual(['submitted'])

    const hirlevel = kemKuldok()
    await trackedSubmitNewsletter(
      { form: '7', submissionData: [] },
      {
        submit: async () => ({ ok: false as const, message: 'Hiba.' }),
        track: () => true,
        lead: hirlevel.trackers,
      },
    )
    expect(hirlevel.hivasok.map(([nev]) => nev)).toEqual(['submitted'])

    const ingyenes = kemKuldok()
    await trackedSubmitFreeCourseRequest(
      { productId: 2, name: 'Teszt Elek', email: 'teszt@pelda.hu', consentPrivacy: true },
      {
        submit: async () => ({ ok: false as const, message: 'Hiba.' }),
        lead: ingyenes.trackers,
      },
    )
    expect(ingyenes.hivasok.map(([nev]) => nev)).toEqual(['submitted'])
  })
})

describe('a hírlevél Barion `signUp`-ja érintetlen maradt', () => {
  it('siker esetén pontosan egy signUp megy ki, hibánál egy sem', async () => {
    const sikeres: Array<{ id: string; name: string }> = []
    await trackedSubmitNewsletter(
      { form: '7', submissionData: [] },
      {
        submit: async () => ({ ok: true as const }),
        track: (event) => {
          sikeres.push(event)
          return true
        },
        lead: kemKuldok().trackers,
      },
    )
    expect(sikeres).toEqual([{ id: 'hirlevel-feliratkozas', name: 'Hírlevél feliratkozás' }])

    const hibas: Array<{ id: string; name: string }> = []
    await trackedSubmitNewsletter(
      { form: '7', submissionData: [] },
      {
        submit: async () => ({ ok: false as const, message: 'Hiba.' }),
        track: (event) => {
          hibas.push(event)
          return true
        },
        lead: kemKuldok().trackers,
      },
    )
    expect(hibas).toHaveLength(0)
  })

  it('a Barion-pixel hibája sem a beküldést, sem a lead-mérést nem viszi el', async () => {
    const { trackers, hivasok } = kemKuldok()

    await expect(
      trackedSubmitNewsletter(
        { form: '7', submissionData: [] },
        {
          submit: async () => ({ ok: true as const }),
          track: () => {
            throw new Error('a pixel elszállt')
          },
          lead: trackers,
        },
      ),
    ).resolves.toEqual({ ok: true })

    expect(hivasok.map(([nev]) => nev)).toEqual(['submitted', 'succeeded'])
  })
})

describe('adatvédelem — személyes adat nem szivároghat ki', () => {
  it('EGYETLEN lead-esemény tulajdonságai sem tartalmaznak személyes adatot', async () => {
    // Minden forrás mindkét eseménye, a VALÓDI küldőkön keresztül.
    for (const forras of LEAD_FORRASOK) {
      trackLeadSubmitted(forras)
      trackLeadSucceeded(forras)
    }
    trackLeadSubmitted('ingyenes-kurzus', { courseId: 2 })
    trackLeadSucceeded('ingyenes-kurzus', { courseId: 2 })

    // A négy űrlap SAJÁT beküldő burka is — a payload tele személyes adattal,
    // a mérésbe abból semmi nem kerülhet.
    await trackedSubmitContact(
      {
        form: '7',
        submissionData: [
          { field: 'name', value: 'Teszt Elek' },
          { field: 'email', value: 'teszt@pelda.hu' },
          { field: 'message', value: 'Fáj a csuklóm, kérek segítséget.' },
        ],
      },
      { submit: async () => ({ ok: true as const }) },
    )
    await trackedSubmitAppointment(
      {
        form: '7',
        submissionData: [
          { field: 'name', value: 'Teszt Elek' },
          { field: 'phone', value: '+36301234567' },
          { field: 'reason', value: 'Műtét utáni kézrehabilitáció.' },
        ],
      },
      { submit: async () => ({ ok: true as const }) },
    )
    await trackedSubmitNewsletter(
      { form: '7', submissionData: [{ field: 'email', value: 'teszt@pelda.hu' }] },
      { submit: async () => ({ ok: true as const }), track: () => true },
    )
    await trackedSubmitFreeCourseRequest(
      { productId: 2, name: 'Teszt Elek', email: 'teszt@pelda.hu', consentPrivacy: true },
      { submit: async () => ({ ok: true as const, emailSent: true }) },
    )

    const tiltottKulcsok = [
      'email',
      'name',
      'nev',
      'phone',
      'telefon',
      'message',
      'uzenet',
      'reason',
      'ip',
      'ipAddress',
      'userId',
      'user',
    ]
    const engedettKulcsok = ['leadSource', 'courseId']

    expect(captureAnalyticsEvent.mock.calls.length).toBeGreaterThan(0)
    for (const [nev, properties] of captureAnalyticsEvent.mock.calls as Array<
      [string, Record<string, unknown>]
    >) {
      expect(['lead_submitted', 'lead_succeeded']).toContain(nev)
      for (const kulcs of Object.keys(properties)) {
        expect(tiltottKulcsok).not.toContain(kulcs)
        expect(engedettKulcsok).toContain(kulcs)
      }
      // Semmilyen érték nem nézhet ki e-mail-címnek vagy telefonszámnak.
      for (const ertek of Object.values(properties)) {
        if (typeof ertek === 'string') {
          expect(ertek).not.toMatch(/@/)
          expect(ertek).not.toMatch(/\+?\d{6,}/)
        }
      }
    }
  })
})
