import { getPayload } from 'payload'

import {
  createStripeWebhookHandler,
  registerStripeWebhookProcessor,
} from '../../../../../lib/stripe-webhook/route-handler'
import config from '../../../../../payload.config'

/**
 * Stripe webhook-végpont (a Barion callback-útvonal tükreképe).
 *
 * - A handler AZONNAL verifikálja az aláírást (nyers body!), dedupol
 *   (webhook-events, provider='stripe') és 200-at válaszol — a sessions.
 *   retrieve alapú jóváhagyásra sosem vár.
 * - Az aszinkron feldolgozás a next/server after()-folyamatában indul; a
 *   hibás/kimaradt eseményeket a T-014 webhook-retry job viszi tovább — ehhez
 *   itt regisztráljuk a 'stripe' processzort.
 *
 * Deploy-teendő: a Stripe-dashboardon a /api/stripe/webhook végponthoz a
 * checkout.session.completed (és checkout.session.async_payment_succeeded)
 * eseményeket kell bekötni, a signing secret a STRIPE_WEBHOOK_SECRET envbe.
 */
const getPayloadInstance = () => getPayload({ config })

registerStripeWebhookProcessor(getPayloadInstance)

export const POST = createStripeWebhookHandler({ getPayload: getPayloadInstance })
