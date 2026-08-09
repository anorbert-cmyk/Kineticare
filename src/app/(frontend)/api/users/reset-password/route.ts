import { REST_POST } from '@payloadcms/next/routes'
import { getPayload } from 'payload'

import { createResetPasswordHandler } from '../../../../../lib/security/reset-password-route'
import config from '../../../../../payload.config'

/**
 * POST /api/users/reset-password — jelszó-visszaállítás a jelszó-politika
 * szerveroldali kikényszerítésével (OWASP A07).
 *
 * Ez az útvonal SZÁNDÉKOSAN ugyanaz, amit eddig a Payload REST catch-all
 * (`src/app/(payload)/api/[...slug]/route.ts`) szolgált ki: a Next.js a konkrét
 * szegmenst előbbre sorolja a `[...slug]` mintánál, ezért minden ide érkező
 * kérés — a saját űrlapé, az admin reset-oldaláé és a végpont közvetlen hívása
 * is — átmegy a politika-ellenőrzésen. A tényleges jelszócserét változatlanul a
 * Payload beépített végpontja végzi (`forwardToPayload`).
 *
 * A handler a src/lib/security/reset-password-route.ts-ben él
 * (függőség-injekcióval, egységtesztelhetően); itt csak a valódi config
 * bekötése történik — a checkout- és grant-purchase-végpontok mintájára.
 *
 * A konfig relatív import: a vitest nem oldja fel a tsconfig `@payload-config`
 * aliasát, a relatív útvonal viszont a buildben és a tesztekben is működik.
 */
const payloadRestPost = REST_POST(config)

export const POST = createResetPasswordHandler({
  getPayload: () => getPayload({ config }),
  forwardToPayload: (request) =>
    payloadRestPost(request, {
      params: Promise.resolve({ slug: ['users', 'reset-password'] }),
    }),
})
