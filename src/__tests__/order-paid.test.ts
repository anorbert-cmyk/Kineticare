import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { INVITE_TOKEN_TTL_MS } from '../lib/customer-import/invite'
import { orderConfirmationEmail } from '../lib/email/templates/order'
import { onOrderPaid } from '../lib/order-paid'
import type { Order } from '../payload-types'

/**
 * W4-03 visszaigazoló e-mail + a friss paid-átmenet mellékhatásainak tesztjei.
 * A küldés és a job-queue injektált — nincs valódi e-mail vagy job-rendszer.
 */

const ORDER_NUMBER = 'KH-2026-000123'

describe('orderConfirmationEmail sablon', () => {
  const template = orderConfirmationEmail({
    orderNumber: ORDER_NUMBER,
    buyerName: 'Teszt Anna <script>',
    items: [
      { title: 'DEMO-KEZREHAB-001', quantity: 1, totalHuf: 19990 },
      { title: 'Második kurzus', quantity: 2, totalHuf: 29980 },
    ],
    totalHuf: 49970,
    coursesUrl: 'https://staging.example.test/kurzusaim',
    invoiceNote: true,
  })

  it('tárgy a rendelésszámmal, magyar szöveg, CTA a kurzusaimra', () => {
    expect(template.subject).toBe(`Sikeres vásárlás — ${ORDER_NUMBER}`)
    expect(template.html).toContain(ORDER_NUMBER)
    expect(template.html).toContain('https://staging.example.test/kurzusaim')
    expect(template.text).toContain(ORDER_NUMBER)
    expect(template.text).toContain('https://staging.example.test/kurzusaim')
  })

  it('tételek és végösszeg (formázott HUF) szerepel', () => {
    const normalizedText = template.text.replace(/ /g, ' ')
    expect(normalizedText).toContain('DEMO-KEZREHAB-001 — 1 db')
    expect(normalizedText).toContain('Második kurzus — 2 db')
    expect(normalizedText).toContain('49 970')
  })

  it('a vevő neve escape-elve (XSS-biztos e-mail)', () => {
    expect(template.html).not.toContain('<script>')
    expect(template.html).toContain('&lt;script&gt;')
  })

  it('invoiceNote=true esetén a számla-hivatkozás bekerül; false esetén nem', () => {
    expect(template.html).toContain('Számlázz.hu')
    const without = orderConfirmationEmail({
      orderNumber: ORDER_NUMBER,
      items: [],
      totalHuf: 0,
      coursesUrl: 'https://x.test/kurzusaim',
      invoiceNote: false,
    })
    expect(without.html).not.toContain('Számlázz.hu')
  })
})

// ---------------------------------------------------------------------------
// onOrderPaid — a mellékhatás-orchestrátor
// ---------------------------------------------------------------------------

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 101,
    orderNumber: ORDER_NUMBER,
    status: 'paid',
    customerEmail: 'anna@example.test',
    totalHufSnapshot: 19990,
    items: [{ product: 42, quantity: 1, titleSnapshot: 'DEMO-KEZREHAB-001', priceHufSnapshot: 19990 }],
    customerSnapshot: { name: 'Teszt Anna', email: 'anna@example.test' },
    ...overrides,
  } as unknown as Order
}

describe('onOrderPaid', () => {
  it('sorba állítja az invoice-jobot ÉS kiküldi a visszaigazoló e-mailt a snapshotból', async () => {
    const queued: number[] = []
    const sent: Array<{ to: string; subject: string; text: string }> = []

    await onOrderPaid({
      payload: {} as never,
      order: createOrder(),
      queueInvoice: async (orderId) => {
        queued.push(orderId)
        return true
      },
      send: async (input) => {
        sent.push({ to: input.to, subject: input.subject, text: input.text })
        return { ok: true, provider: 'noop' }
      },
    })

    expect(queued).toEqual([101])
    expect(sent).toHaveLength(1)
    expect(sent[0]?.to).toBe('anna@example.test')
    expect(sent[0]?.subject).toContain(ORDER_NUMBER)
    expect(sent[0]?.text).toContain('DEMO-KEZREHAB-001')
  })

  it('queue-hiba esetén az e-mail akkor is kimegy (best-effort, nem dob)', async () => {
    const sent: string[] = []
    await onOrderPaid({
      payload: {} as never,
      order: createOrder(),
      queueInvoice: async () => {
        throw new Error('queue nem elérhető')
      },
      send: async (input) => {
        sent.push(input.to)
        return { ok: true, provider: 'noop' }
      },
    })
    expect(sent).toEqual(['anna@example.test'])
  })

  it('e-mail-küldési hiba (ok:false) is csak naplózás — nem dob', async () => {
    await expect(
      onOrderPaid({
        payload: {} as never,
        order: createOrder(),
        queueInvoice: async () => true,
        send: async () => ({ ok: false, provider: 'smtp' as const, retryable: true, error: 'SMTP down' }),
      }),
    ).resolves.toBeUndefined()
  })

  it('címzett nélküli rendelésnél az e-mail kimarad (a job ettől megy)', async () => {
    const queued: number[] = []
    const sent: string[] = []
    const order = createOrder({ customerEmail: null, customerSnapshot: {} })
    await onOrderPaid({
      payload: {} as never,
      order,
      queueInvoice: async (orderId) => {
        queued.push(orderId)
        return true
      },
      send: async (input) => {
        sent.push(input.to)
        return { ok: true, provider: 'noop' }
      },
    })
    expect(queued).toEqual([101])
    expect(sent).toHaveLength(0)
  })
})


// ---------------------------------------------------------------------------
// Vendég-vásárlás: a visszaigazoló levél HÁROM változata
// ---------------------------------------------------------------------------

/**
 * A vendég-vásárlás után a levél AKTIVÁLÓ levél is: a most létrehozott (vagy
 * még jelszó nélküli) fiókhoz jelszó-beállító linket visz. Meglévő, működő
 * fióknál viszont jelszó-beállítót SZÁNDÉKOSAN nem küldünk — ott a belépésre
 * irányítunk. A link TITOK: sem a token, sem a teljes link nem kerülhet naplóba.
 */

// DUMMY érték, egyértelműen jelölve — NEM valódi Payload reset-token.
const ACTIVATION_TOKEN = 'DUMMY-AKTIVALO-TOKEN-NEM-VALODI'
const ACTIVATION_URL = `https://shop.example.test/jelszo-visszaallitas?token=${ACTIVATION_TOKEN}`

const logOutput = (spy: MockInstance<(...args: unknown[]) => void>): string =>
  spy.mock.calls.map((call) => call.map((arg) => String(arg)).join(' ')).join('\n')

/** Hangosan dobó link-készítő: ahol linknek NEM szabad készülnie. */
const nemKeszulhetLink = async (): Promise<string | null> => {
  throw new Error('TESZT: ezen az ágon NEM szabad aktiváló linket készíteni')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('onOrderPaid — a levél változata a fiók állapotából', () => {
  it('MOST létrehozott (jelszó nélküli) fiók → aktiváló levél a jelszó-beállító linkkel', async () => {
    const sent: Array<{ subject: string; html: string; text: string }> = []

    await onOrderPaid({
      payload: {} as never,
      order: createOrder(),
      queueInvoice: async () => true,
      account: { passwordSetupPending: true, alreadyLinked: false, email: 'anna@example.test' },
      createActivationUrl: async () => ACTIVATION_URL,
      send: async (input) => {
        sent.push({ subject: input.subject, html: input.html, text: input.text })
        return { ok: true, provider: 'noop' }
      },
    })

    expect(sent).toHaveLength(1)
    expect(sent[0].text).toContain(ACTIVATION_URL)
    expect(sent[0].text).toContain('Jelszó beállítása')
    expect(sent[0].text).toContain('fiókot készítettünk')
    // Generált jelszó SOHA nem mehet ki levélben — csak a link.
    expect(sent[0].text).not.toMatch(/jelszavad:|ideiglenes jelszó/i)
  })

  it('MEGLÉVŐ, működő fiók (vendégként vásárolt) → belépés-link, jelszó-beállító NÉLKÜL', async () => {
    const sent: Array<{ text: string }> = []

    await onOrderPaid({
      payload: {} as never,
      order: createOrder(),
      queueInvoice: async () => true,
      account: { passwordSetupPending: false, alreadyLinked: false, email: 'anna@example.test' },
      // Ezen az ágon link-készítésnek NEM szabad futnia.
      createActivationUrl: nemKeszulhetLink,
      send: async (input) => {
        sent.push({ text: input.text })
        return { ok: true, provider: 'noop' }
      },
    })

    expect(sent).toHaveLength(1)
    expect(sent[0].text).toContain('/belepes')
    expect(sent[0].text).toContain('már elérhető a meglévő fiókodban')
    expect(sent[0].text).not.toContain('jelszo-visszaallitas')
  })

  it('BEJELENTKEZETT vásárlás → a levél változatlan (Kurzusaim CTA)', async () => {
    const sent: Array<{ text: string }> = []

    await onOrderPaid({
      payload: {} as never,
      order: createOrder(),
      queueInvoice: async () => true,
      account: { passwordSetupPending: false, alreadyLinked: true, email: 'anna@example.test' },
      createActivationUrl: nemKeszulhetLink,
      send: async (input) => {
        sent.push({ text: input.text })
        return { ok: true, provider: 'noop' }
      },
    })

    expect(sent[0].text).toContain('Kurzusaim megnyitása')
    expect(sent[0].text).not.toContain('/belepes')
    expect(sent[0].text).not.toContain('jelszo-visszaallitas')
  })

  it('ha az aktiváló link NEM készül el, a levél akkor is kimegy (belépés-linkkel)', async () => {
    const sent: Array<{ text: string }> = []

    await onOrderPaid({
      payload: {} as never,
      order: createOrder(),
      queueInvoice: async () => true,
      account: { passwordSetupPending: true, alreadyLinked: false, email: 'anna@example.test' },
      createActivationUrl: async () => null,
      send: async (input) => {
        sent.push({ text: input.text })
        return { ok: true, provider: 'noop' }
      },
    })

    expect(sent).toHaveLength(1)
    expect(sent[0].text).toContain('/belepes')
    expect(sent[0].text).toContain('Elfelejtett jelszó')
  })

  it('az alapértelmezett link-készítő a Payload forgotPassword-jét használja (30 napos, e-mail nélkül)', async () => {
    const forgotPassword = vi.fn(async () => ACTIVATION_TOKEN)
    const sent: Array<{ text: string }> = []
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://shop.example.test'

    await onOrderPaid({
      payload: { forgotPassword } as unknown as Payload,
      order: createOrder(),
      queueInvoice: async () => true,
      account: { passwordSetupPending: true, alreadyLinked: false, email: 'anna@example.test' },
      send: async (input) => {
        sent.push({ text: input.text })
        return { ok: true, provider: 'noop' }
      },
    })

    expect(forgotPassword).toHaveBeenCalledWith({
      collection: 'users',
      data: { email: 'anna@example.test' },
      disableEmail: true,
      expiration: INVITE_TOKEN_TTL_MS,
    })
    expect(sent[0].text).toContain(
      `https://shop.example.test/jelszo-visszaallitas?token=${ACTIVATION_TOKEN}`,
    )
  })

  it('a NAPLÓ sem a tokent, sem a teljes linket nem tartalmazza', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await onOrderPaid({
      payload: {
        forgotPassword: async () => ACTIVATION_TOKEN,
      } as unknown as Payload,
      order: createOrder(),
      queueInvoice: async () => true,
      account: { passwordSetupPending: true, alreadyLinked: false, email: 'anna@example.test' },
      send: async () => ({ ok: true, provider: 'noop' }),
    })

    const output = logOutput(logSpy)
    expect(output).not.toContain(ACTIVATION_TOKEN)
    expect(output).not.toContain('jelszo-visszaallitas')
  })
})
