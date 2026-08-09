/**
 * Stripe gateway kliensmodul — nyilvános belépési pont.
 *
 * A Stripe a MÁSODIK fizetési gateway a Barion MELLÉ (a Barion marad az
 * alapértelmezett): a @payloadcms/plugin-ecommerce adaptereként sosem, hanem
 * a Barionnal azonos mintájú saját modulként épül (a plugin paymentMethods
 * tömbje továbbra is üres — lásd src/plugins/ecommerce.ts és a T-063 guardot).
 *
 * A Barion-modultól eltérően a Stripe OPCIONÁLIS-enabled (a Számlázz.hu-minta):
 * STRIPE_SECRET_KEY nélkül enabled=false, és a gateway egyszerűen nem
 * választható — az app ettől változatlanul működik.
 */

export {
  getStripeClient,
  getStripeConfig,
  resolveStripeClient,
  STRIPE_API_VERSION,
  wrapStripeError,
} from './client'
export {
  constructWebhookEvent,
  createCheckoutSession,
  hufToFiller,
  retrieveCheckoutSession,
  type ConstructWebhookEventDeps,
  type CreateCheckoutSessionDeps,
  type CreateCheckoutSessionParams,
  type RetrieveCheckoutSessionDeps,
  type StripeCheckoutItemInput,
  type StripeCheckoutSessionResult,
} from './checkout-session'
export {
  StripeApiError,
  type StripeClientConfig,
  type StripeEnv,
  type StripeErrorKind,
  type StripeGatewayClient,
} from './types'
