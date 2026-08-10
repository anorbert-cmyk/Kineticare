import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BarionApiError, type BarionPaymentStateResponse } from '../lib/barion'
import {
  classifyBarionFailure,
  INVOICE_PENDING_STALE_MS,
  MAX_CONSECUTIVE_TRANSPORT_FAILURES,
  ORPHAN_ORDER_GRACE_MS,
  pollPendingOrders,
  STUCK_ORDER_WARN_MS,
} from '../lib/order-poll/service'
import type { Order } from '../payload-types'

/**
 * W4-02 order-poll szolgáltatás tesztjei — mockolt payload + injektált
 * GetState/onPaid/queueInvoice. A lényeg: az elveszett callback-mentés ugyanazt
 * az állapotgépet futtatja, mint a callback-processzor, és a mellékhatások
 * (onPaid, számla-resweep) is bekövetkeznek.
 */

// CLAUDE.md 15.: tesztből SOSEM mehet ki valódi hálózati hívás. A GetState
// mindig injektált, tehát ide HANGOSAN DOBÓ őr való — ha bármelyik ág mégis
// fetchre futna, az azonnal látszik.
beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('TESZT: valódi hálózati hívás nem futhat')
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const PAYMENT_ID = '11111111-2222-3333-4444-555555555555'
const ORDER_NUMBER = 'KH-2026-000123'
const NOW = Date.parse('2026-08-04T12:00:00Z')
/**
 * A rendelés szerver-oldali végösszege. Az S2 összeg-assert miatt a
 * GetState-válasz Total/Currency mezőjének egyeznie kell ezzel, különben a
 * paid-átmenet elutasított.
 */
const ORDER_TOTAL_HUF = 19990

function isoHoursAgo(hours: number): string {
  return new Date(NOW - hours * 3600_000).toISOString()
}

function createPendingOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 101,
    orderNumber: ORDER_NUMBER,
    status: 'payment_pending',
    barionPaymentId: PAYMENT_ID,
    customer: 7,
    customerEmail: 'anna@example.test',
    currency: 'HUF',
    totalHufSnapshot: ORDER_TOTAL_HUF,
    items: [
      {
        product: 42,
        quantity: 1,
        titleSnapshot: 'DEMO-KEZREHAB-001',
        priceHufSnapshot: ORDER_TOTAL_HUF,
      },
    ],
    createdAt: isoHoursAgo(1),
    updatedAt: isoHoursAgo(1),
    ...overrides,
  } as unknown as Order
}

function getStateResponse(
  status: string,
  overrides: Partial<BarionPaymentStateResponse> = {},
): BarionPaymentStateResponse {
  return {
    PaymentId: PAYMENT_ID,
    PaymentRequestId: ORDER_NUMBER,
    Status: status as BarionPaymentStateResponse['Status'],
    Total: ORDER_TOTAL_HUF,
    Currency: 'HUF',
    Transactions: [],
    ...overrides,
  }
}

interface SetupOptions {
  pending?: Order[]
  paidResweep?: Order[]
  stateStatus?: string
  stateError?: Error
  /** A GetState-válasz felülírásai (pl. eltérő Total az összeg-assert teszteléséhez). */
  stateOverrides?: Partial<BarionPaymentStateResponse>
}

function setup(options: SetupOptions = {}) {
  const pending = options.pending ?? [createPendingOrder()]
  const paidResweep = options.paidResweep ?? []
  const user = { id: 7, email: 'anna@example.test', purchases: [] as number[] }
  const orderUpdates: Array<Record<string, unknown>> = []
  const queuedInvoices: number[] = []
  const paidCalls: number[] = []

  const payload = {
    find: async ({ where }: { collection: string; where?: unknown }) => {
      const json = JSON.stringify(where ?? {})
      if (json.includes('"paid"')) {
        return { docs: paidResweep, totalDocs: paidResweep.length }
      }
      return { docs: pending, totalDocs: pending.length }
    },
    findByID: async () => user,
    update: async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      if (collection === 'orders') {
        orderUpdates.push(data)
        for (const order of [...pending, ...paidResweep]) {
          Object.assign(order, data)
        }
      }
      if (collection === 'users') {
        Object.assign(user, data)
      }
      return data
    },
  }

  const fetchState = async (): Promise<BarionPaymentStateResponse> => {
    if (options.stateError) {
      throw options.stateError
    }
    return getStateResponse(options.stateStatus ?? 'Succeeded', options.stateOverrides)
  }

  const onPaid = async (order: Order): Promise<void> => {
    paidCalls.push(order.id)
  }
  const queueInvoice = async (orderId: number): Promise<boolean> => {
    queuedInvoices.push(orderId)
    return true
  }
  /**
   * Bekapcsolt Számlázz.hu-integráció. INJEKTÁLVA, nem envből: a resweep-ág
   * előfeltétele a `SZAMLAZZ_AGENT_KEY` megléte, a teszt viszont sosem függhet
   * valódi (vagy ál-) agent-kulcstól. A kikapcsolt ágnak külön tesztje van.
   */
  const invoicingEnabled = (): boolean => true

  return {
    payload: payload as never,
    fetchState,
    onPaid,
    queueInvoice,
    invoicingEnabled,
    user,
    orderUpdates,
    queuedInvoices,
    paidCalls,
    pending,
  }
}

describe('order-poll — elveszett callback-mentés', () => {
  it('Barion Succeeded + payment_pending rendelés → paid átmenet + purchases + onPaid mellékhatás', async () => {
    const order = createPendingOrder()
    const { payload, fetchState, onPaid, queueInvoice, user, paidCalls } = setup({
      pending: [order],
      stateStatus: 'Succeeded',
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.scanned).toBe(1)
    expect(summary.transitionedPaid).toBe(1)
    expect(order.status).toBe('paid')
    expect(user.purchases).toEqual([42])
    expect(paidCalls).toEqual([101])
  })

  it.each([['Canceled'], ['Expired']])('Barion %s → a rendelés cancelled lesz', async (status) => {
    const order = createPendingOrder()
    const { payload, fetchState, onPaid, queueInvoice, paidCalls } = setup({
      pending: [order],
      stateStatus: status,
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.cancelled).toBe(1)
    expect(summary.transitionedPaid).toBe(0)
    expect(paidCalls).toHaveLength(0)
    expect(order.status).toBe('cancelled')
  })

  it.each([['Prepared'], ['Started']])('Barion %s → a rendelés payment_pending marad', async (status) => {
    const { payload, fetchState, onPaid, queueInvoice, orderUpdates } = setup({
      stateStatus: status,
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.stillPending).toBe(1)
    expect(orderUpdates).toHaveLength(0)
  })

  /**
   * S2 összeg-assert: a poll-job UGYANAZT a magot futtatja, mint a callback,
   * tehát a Total-eltérés itt is elutasított paid-átmenetet jelent — a
   * „mentőháló" nem kerülheti meg az összeg-ellenőrzést.
   */
  it('Barion Succeeded, de eltérő Total → NINCS paid átmenet (failed), a státusz érintetlen', async () => {
    const order = createPendingOrder()
    const { payload, fetchState, onPaid, queueInvoice, user, paidCalls, orderUpdates } = setup({
      pending: [order],
      stateStatus: 'Succeeded',
      stateOverrides: { Total: 1 },
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.transitionedPaid).toBe(0)
    expect(summary.failed).toBe(1)
    expect(order.status).toBe('payment_pending')
    expect(orderUpdates).toHaveLength(0)
    expect(user.purchases).toEqual([])
    expect(paidCalls).toHaveLength(0)
  })

  it('GetState-hiba → a rendelés kimarad (failed), a státusz érintetlen', async () => {
    const { payload, fetchState, onPaid, queueInvoice, orderUpdates } = setup({
      stateError: new Error('fetch failed'),
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.failed).toBe(1)
    expect(orderUpdates).toHaveLength(0)
  })
})

describe('order-poll — árva rendelés (barionPaymentId nélkül)', () => {
  it('2 óránál fiatalabb árva → kihagyva (a vevő még játszhat)', async () => {
    const orphan = createPendingOrder({ barionPaymentId: null, createdAt: isoHoursAgo(0.5) })
    const { payload, fetchState, onPaid, queueInvoice, orderUpdates } = setup({ pending: [orphan] })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.skipped).toBe(1)
    expect(summary.orphaned).toBe(0)
    expect(orderUpdates).toHaveLength(0)
  })

  it('ORPHAN_GRACE-nél régebbi árva → cancelled (a Barionban úgysem létezik fizetés)', async () => {
    const orphan = createPendingOrder({
      barionPaymentId: null,
      createdAt: new Date(NOW - ORPHAN_ORDER_GRACE_MS - 60_000).toISOString(),
    })
    const { payload, fetchState, onPaid, queueInvoice } = setup({ pending: [orphan] })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.orphaned).toBe(1)
    expect(orphan.status).toBe('cancelled')
  })

  it('24 óránál régebbi függő rendelés → stillPending + owner-riasztás (státusz marad)', async () => {
    const stuck = createPendingOrder({ createdAt: new Date(NOW - STUCK_ORDER_WARN_MS - 60_000).toISOString() })
    const { payload, fetchState, onPaid, queueInvoice } = setup({
      pending: [stuck],
      stateStatus: 'Prepared',
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.stillPending).toBe(1)
    expect(stuck.status).toBe('payment_pending')
  })
})

describe('order-poll — számla-resweep', () => {
  it("paid + invoiceStatus 'none' → újra sorba állítja az invoice-issue jobot", async () => {
    const paidOrder = createPendingOrder({ id: 202, status: 'paid', invoiceStatus: 'none' })
    const { payload, fetchState, onPaid, queueInvoice, invoicingEnabled, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled,
      now: NOW,
    })

    expect(queuedInvoices).toEqual([202])
    expect(summary.invoiceRequeued).toBe(1)
  })

  it("friss 'pending' számla → NINCS resweep (valószínűleg dolgozik rajta egy worker)", async () => {
    const paidOrder = createPendingOrder({
      id: 202,
      status: 'paid',
      invoiceStatus: 'pending',
      updatedAt: new Date(NOW - 60_000).toISOString(),
    })
    const { payload, fetchState, onPaid, queueInvoice, invoicingEnabled, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled,
      now: NOW,
    })

    expect(queuedInvoices).toHaveLength(0)
    expect(summary.invoiceRequeued).toBe(0)
  })

  it("régi (10+ perces) 'pending' számla → resweep (a worker elhalt közben)", async () => {
    const paidOrder = createPendingOrder({
      id: 202,
      status: 'paid',
      invoiceStatus: 'pending',
      updatedAt: new Date(NOW - INVOICE_PENDING_STALE_MS - 60_000).toISOString(),
    })
    const { payload, fetchState, onPaid, queueInvoice, invoicingEnabled, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled,
      now: NOW,
    })

    expect(queuedInvoices).toEqual([202])
  })

  /**
   * Kikapcsolt Számlázz.hu-integráció (nincs SZAMLAZZ_AGENT_KEY — élesben ez a
   * jelenlegi állapot). Az invoice-issue task ilyenkor garantáltan 'disabled'
   * kimenettel no-opol, az invoiceStatus tehát 'none' marad: resweep-gát nélkül
   * MINDEN ütemezett futás újra sorba állítaná ugyanazt a 10 rendelést, azaz
   * élesben 5 percenként 10 fölösleges job-sor + félrevezető info-log.
   */
  it('kikapcsolt Számlázz.hu-integráció → NINCS resweep (nem termel fölösleges jobokat)', async () => {
    const paidOrder = createPendingOrder({ id: 202, status: 'paid', invoiceStatus: 'none' })
    const { payload, fetchState, onPaid, queueInvoice, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })

    expect(queuedInvoices).toHaveLength(0)
    expect(summary.invoiceRequeued).toBe(0)
  })

  /**
   * A kihagyás NE legyen néma: korábban a „kimaradt a resweep" és a „lefutott,
   * de nem volt teendő" eset a job-outputban megkülönböztethetetlen volt
   * (mindkettő `invoiceRequeued: 0`), az ok pedig csak debug-szinten látszott.
   */
  it('a summary megkülönbözteti a kihagyott és a lefutott resweepet', async () => {
    const paidOrder = createPendingOrder({ id: 202, status: 'paid', invoiceStatus: 'none' })
    const base = { pending: [], paidResweep: [paidOrder] }

    const off = setup(base)
    const skipped = await pollPendingOrders({
      payload: off.payload,
      fetchState: off.fetchState,
      onPaid: off.onPaid,
      queueInvoice: off.queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })

    const on = setup(base)
    const done = await pollPendingOrders({
      payload: on.payload,
      fetchState: on.fetchState,
      onPaid: on.onPaid,
      queueInvoice: on.queueInvoice,
      invoicingEnabled: on.invoicingEnabled,
      now: NOW,
    })

    expect(skipped.invoiceResweep).toBe('skipped-disabled')
    expect(done.invoiceResweep).toBe('done')
  })

  /**
   * Hibás Számlázz.hu-konfiguráció (a feloldás DOB). A poll fő feladatát ez nem
   * viheti el, de az ok a summaryben és RIASZTÁS-szintű naplósorban is megjelenik.
   */
  it('hibás Számlázz.hu-konfiguráció → skipped-config-error, a poll nem hasal el', async () => {
    const paidOrder = createPendingOrder({ id: 202, status: 'paid', invoiceStatus: 'none' })
    const { payload, fetchState, onPaid, queueInvoice, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => {
        throw new Error('Számlázz.hu-konfigurációs hiba: érvénytelen SZAMLAZZ_API_URL')
      },
      now: NOW,
    })

    expect(summary.invoiceResweep).toBe('skipped-config-error')
    expect(queuedInvoices).toHaveLength(0)
  })
})

/**
 * Megszakító (circuit breaker) — és ami ennél is fontosabb: a SORFEJ-BLOKKOLÁS
 * (poison pill) elkerülése.
 *
 * Élesben két, ELLENTÉTES kockázat feszül egymásnak:
 * (a) ha a BARION_POSKEY_* ál-értékre van állítva, az induláskori ENV-assert
 *     ÁTENGEDI (csak a kulcs meglétét nézi) — gát nélkül futásonként 25 hibás
 *     hívás és 25 error-sor menne ki;
 * (b) ha a megszakítás TÚL tág, akkor EGYETLEN hibás rendelés sorfejként
 *     befagyaszthatja az összes többit, azaz pont a mentőhálót viszi el.
 *
 * Ezért: hitelesítési hibára AZONNAL megszakítunk (ott a maradék hívás
 * garantáltan ugyanígy elhasal), szállítási hibára viszont csak
 * MAX_CONSECUTIVE_TRANSPORT_FAILURES egymást követő hiba után — közbeeső siker
 * a számlálót nullázza.
 */
describe('order-poll — hibaosztályozás (classifyBarionFailure)', () => {
  it('HTTP 401/403 → auth (azonnali megszakítás)', () => {
    for (const httpStatus of [401, 403]) {
      expect(
        classifyBarionFailure(
          new BarionApiError({ message: 'x', kind: 'http', endpoint: 'GET x', httpStatus }),
        ),
      ).toBe('auth')
    }
  })

  it('ismert provider auth-hibakód HTTP 200 mellett is → auth', () => {
    expect(
      classifyBarionFailure(
        new BarionApiError({
          message: 'auth',
          kind: 'provider',
          endpoint: 'GET x',
          httpStatus: 200,
          providerErrors: [
            { ErrorCode: 'AuthenticationFailed', Title: 'Hitelesítés', Description: '' },
          ],
        }),
      ),
    ).toBe('auth')
  })

  /**
   * A korábbi `/auth/i` MINTAILLESZTÉS ezt a kódot is auth-nak minősítette
   * volna, és egyetlen rendelés miatt megszakította volna az egész futást. A
   * pontos egyezésre szűrés ezt a hamis pozitívot zárja ki — a valódi
   * hitelesítési hibát pedig a 401/403 ág, illetve az ismert kódok listája fogja.
   */
  it('ismeretlen, „auth" szót tartalmazó hibakód NEM auth (nincs hamis megszakítás)', () => {
    expect(
      classifyBarionFailure(
        new BarionApiError({
          message: 'ismeretlen',
          kind: 'provider',
          endpoint: 'GET x',
          httpStatus: 200,
          providerErrors: [
            { ErrorCode: 'PayerAuthenticationPending', Title: 'Folyamatban', Description: '' },
          ],
        }),
      ),
    ).toBe('order')
  })

  it.each([
    ['timeout', new BarionApiError({ message: 't', kind: 'timeout', endpoint: 'GET x' })],
    ['network', new BarionApiError({ message: 'n', kind: 'network', endpoint: 'GET x' })],
    [
      'HTTP 503',
      new BarionApiError({ message: '503', kind: 'http', endpoint: 'GET x', httpStatus: 503 }),
    ],
  ])('%s → transport', (_label, error) => {
    expect(classifyBarionFailure(error)).toBe('transport')
  })

  it('404 és a nem BarionApiError → order (rendelés-szintű, nem szakít meg)', () => {
    expect(
      classifyBarionFailure(
        new BarionApiError({ message: '404', kind: 'http', endpoint: 'GET x', httpStatus: 404 }),
      ),
    ).toBe('order')
    expect(classifyBarionFailure(new Error('fetch failed'))).toBe('order')
    expect(classifyBarionFailure(undefined)).toBe('order')
  })
})

describe('order-poll — megszakítás és sorfej-blokkolás', () => {
  function pendingBatch(count: number): Order[] {
    return Array.from({ length: count }, (_, index) =>
      createPendingOrder({ id: 300 + index, orderNumber: `KH-2026-00${300 + index}` }),
    )
  }

  /** Futtatás egy hibasorozattal: az i. hívás az i. elemet dobja (null = siker). */
  async function runWithFailures(
    orders: Order[],
    failures: (BarionApiError | null | undefined)[],
  ): Promise<{ calls: number; summary: Awaited<ReturnType<typeof pollPendingOrders>> }> {
    const { payload, onPaid, queueInvoice } = setup({ pending: orders })
    let calls = 0
    const fetchState = async (): Promise<BarionPaymentStateResponse> => {
      const failure = failures[calls]
      calls += 1
      if (failure) {
        throw failure
      }
      // Sikeres, de még függő fizetés — nem billenti át az állapotgépet.
      return getStateResponse('Prepared')
    }

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })
    return { calls, summary }
  }

  const timeout = (): BarionApiError =>
    new BarionApiError({ message: 'timeout', kind: 'timeout', endpoint: 'GET x' })

  it('hitelesítési hiba (HTTP 401) → az ELSŐ rendelés után megáll, a többi skipped', async () => {
    const { calls, summary } = await runWithFailures(pendingBatch(4), [
      new BarionApiError({
        message: 'Barion API hiba (HTTP 401, GET /v4/Payment/…/PaymentState).',
        kind: 'http',
        endpoint: 'GET /v4/Payment/{PaymentId}/PaymentState',
        httpStatus: 401,
      }),
    ])

    expect(calls).toBe(1)
    expect(summary.scanned).toBe(4)
    expect(summary.failed).toBe(1)
    expect(summary.skipped).toBe(3)
  })

  it('EGY szállítási hiba NEM szakít meg — a többi rendelés lefut (nincs poison pill)', async () => {
    const { calls, summary } = await runWithFailures(pendingBatch(4), [timeout()])

    expect(calls).toBe(4)
    expect(summary.failed).toBe(1)
    expect(summary.skipped).toBe(0)
    expect(summary.stillPending).toBe(3)
  })

  it(`${MAX_CONSECUTIVE_TRANSPORT_FAILURES} EGYMÁST KÖVETŐ szállítási hiba → megszakít`, async () => {
    const { calls, summary } = await runWithFailures(pendingBatch(6), [
      timeout(),
      timeout(),
      timeout(),
    ])

    expect(calls).toBe(MAX_CONSECUTIVE_TRANSPORT_FAILURES)
    expect(summary.failed).toBe(MAX_CONSECUTIVE_TRANSPORT_FAILURES)
    expect(summary.skipped).toBe(6 - MAX_CONSECUTIVE_TRANSPORT_FAILURES)
  })

  /**
   * A számláló NULLÁZÓDIK a sikeres hívásra: szórványos hibák (két hiba, siker,
   * két hiba) nem érik el a küszöböt, tehát a futás végigmegy. Ez a különbség
   * az „egymást követő" és az „összesen" szabály között.
   */
  it('közbeeső SIKER nullázza a számlálót — szórványos hiba nem szakít meg', async () => {
    const { calls, summary } = await runWithFailures(pendingBatch(6), [
      timeout(),
      timeout(),
      null,
      timeout(),
      timeout(),
    ])

    expect(calls).toBe(6)
    expect(summary.failed).toBe(4)
    expect(summary.skipped).toBe(0)
  })

  /**
   * A 404 EGY fizetésre vonatkozik (nincs ilyen PaymentId), nem az egész
   * integrációra. Nem növeli a szállítási számlálót, tehát 25 ilyen rekord sem
   * tudja megszakítani a futást — különben egyetlen hibás rendelés
   * befagyasztaná az egész mentőhálót.
   */
  it('csupa HTTP 404 → SOHA nem szakít meg, minden rendelés sorra kerül', async () => {
    const notFound = (): BarionApiError =>
      new BarionApiError({ message: '404', kind: 'http', endpoint: 'GET x', httpStatus: 404 })
    const { calls, summary } = await runWithFailures(pendingBatch(5), [
      notFound(),
      notFound(),
      notFound(),
      notFound(),
      notFound(),
    ])

    expect(calls).toBe(5)
    expect(summary.failed).toBe(5)
    expect(summary.skipped).toBe(0)
  })
})
