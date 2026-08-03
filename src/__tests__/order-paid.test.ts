import { describe, expect, it } from 'vitest'

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
