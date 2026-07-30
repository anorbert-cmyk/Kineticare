import type { Plugin } from 'payload'

import { resetPasswordEmail, verifyEmail } from './templates/auth'

/**
 * Users auth e-mail sablonok config-szintű injekciója (T-018).
 *
 * A Users.ts collection-fájlhoz (más workerek scope-ja) nem nyúlunk — az
 * audit pluginéval azonos mintával a buildConfig plugins-láncából egészítjük
 * ki a users collection auth-konfigját:
 *
 * - forgot-password: mindig rákerül a reset sablon,
 * - verify: csak akkor, ha a megerősítő e-mail amúgy is engedélyezve van
 *   (különben az objektum-forma BEkapcsolná a kötelező verifikációt, ami noop
 *   provider mellett kizárná a felhasználókat). A verify sablon kész és
 *   exportált (verifyEmail) — a bekapcsolás a verify engedélyezésével együtt
 *   örökli a sablont.
 */

function userDisplayName(user: unknown): string | null {
  if (typeof user !== 'object' || user === null) {
    return null
  }
  const name = (user as Record<string, unknown>).name
  return typeof name === 'string' ? name : null
}

export const usersAuthEmails: Plugin = (config) => {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
  const adminRoute = config.routes?.admin ?? '/admin'

  return {
    ...config,
    collections: (config.collections ?? []).map((collection) => {
      if (collection.slug !== 'users') {
        return collection
      }
      const auth = typeof collection.auth === 'object' ? collection.auth : {}
      const existingForgotPassword =
        typeof auth.forgotPassword === 'object' ? auth.forgotPassword : {}
      const existingVerify = typeof auth.verify === 'object' ? auth.verify : {}

      return {
        ...collection,
        auth: {
          ...auth,
          forgotPassword: {
            ...existingForgotPassword,
            generateEmailSubject: () => resetPasswordEmail({ resetUrl: '' }).subject,
            generateEmailHTML: (args?: { token?: string; user?: unknown }) => {
              const resetUrl = `${serverURL}${adminRoute}/reset/${args?.token ?? ''}`
              return resetPasswordEmail({ name: userDisplayName(args?.user), resetUrl }).html
            },
          },
          // A verify CSAK engedélyezett állapotban kap sablont (lásd a fejlécet).
          ...(auth.verify
            ? {
                verify: {
                  ...existingVerify,
                  generateEmailSubject: () => verifyEmail({ verifyUrl: '' }).subject,
                  generateEmailHTML: (args?: { token?: string; user?: unknown }) => {
                    const verifyUrl = `${serverURL}${adminRoute}/verify/${args?.token ?? ''}`
                    return verifyEmail({ name: userDisplayName(args?.user), verifyUrl }).html
                  },
                },
              }
            : {}),
        },
      }
    }),
  }
}

export default usersAuthEmails
