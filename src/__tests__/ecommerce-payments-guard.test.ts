import { describe, expect, it, vi } from 'vitest'

/**
 * T-063 config-guard (Stripe-bővítéssel kiterjesztve): a plugin paymentMethods
 * tömbje ÜRES marad — a Stripe NEM a @payloadcms/plugin-ecommerce adaptereként,
 * hanem a Barionnal azonos mintájú SAJÁT modulként épül (src/lib/stripe/*).
 *
 * Ez azért kritikus, mert a plugin confirmOrder-útvonala (ismert beta-hiba:
 * nem ellenőrzi a fizetés tényleges státuszát) csak akkor jön létre, ha a
 * paymentMethods nem üres — az üres tömb + a withoutPluginPaymentEndpoints
 * szűrő együtt garantálja, hogy a confirmOrder HTTP-n SOHA nem hívható.
 *
 * A teszt a valódi payload.config betöltésénél elkapja a pluginbe adott
 * opciókat (vi.mock), így a bekötés maga van őrizve — nem egy másolat.
 */

const capturedPluginOptions = vi.hoisted(() => ({ options: [] as unknown[] }))

vi.mock('@payloadcms/plugin-ecommerce', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@payloadcms/plugin-ecommerce')>()
  return {
    ...actual,
    ecommercePlugin: (options: Parameters<typeof actual.ecommercePlugin>[0]) => {
      capturedPluginOptions.options.push(options)
      return actual.ecommercePlugin(options)
    },
  }
})

import configPromise from '../payload.config'

describe('T-063 config-guard — a plugin fizetési felülete zárt marad (Stripe mellett is)', () => {
  it('az ecommerce plugin ÜRES paymentMethods tömbbel van bekötve', async () => {
    await configPromise

    expect(capturedPluginOptions.options.length).toBeGreaterThan(0)
    const options = capturedPluginOptions.options[0] as { payments?: { paymentMethods?: unknown[] } }
    expect(options.payments?.paymentMethods).toEqual([])
  })

  it('a végleges config NEM tartalmaz plugin /payments/* végpontot (a Stripe sem regisztrál ilyet)', async () => {
    const config = await configPromise

    const paths = (config.endpoints ?? []).map((endpoint) => endpoint.path)
    expect(paths.filter((path) => path.startsWith('/payments/'))).toEqual([])
  })

  it('a saját Stripe webhook-végpont a pluginon KÍVÜL él (Next route, nem plugin-endpoint)', async () => {
    const config = await configPromise

    const paths = (config.endpoints ?? []).map((endpoint) => endpoint.path)
    // A /api/stripe/webhook Next.js route (src/app/(frontend)/api/stripe/webhook/route.ts),
    // nem Payload-endpoint — a config endpoints listájában NEM szerepelhet.
    expect(paths.some((path) => path.includes('stripe'))).toBe(false)
  })
})
