'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import {
  BARION_SIGNUP,
  trackAccountSignUp,
  type BarionSignUpEvent,
} from '@/lib/analytics/barion-events'
import { DEFAULT_AUTH_RETURN_URL, sanitizeReturnUrl } from '@/lib/return-url'
import { loginUser, type AuthResult } from '../../lib/auth-client'

/**
 * LoginForm — a bejelentkezés űrlapja (Payload auth REST-re).
 *
 * A returnUrl-paraméterrel tér vissza oda, ahonnan jött (csak belső
 * útvonal — open-redirect ellen védve). Magyar hibaüzenetek.
 */
export interface LoginFormProps {
  /** Gyökér-relatív útvonal; a hívó oldal `sanitizeReturnUrl`-lel szűri. */
  returnUrl: string
}

/** A `trackedLogin` injektálható függőségei (a teszt kémeket ad be). */
export interface TrackedLoginDeps {
  login: (input: { email: string; password: string }) => Promise<AuthResult>
  track: (event: BarionSignUpEvent) => boolean
}

/**
 * Belépés + Barion `signUp`.
 *
 * ═══ MIÉRT A SIKERES VÁLASZ UTÁN, ÉS NEM MOUNTKOR ═══
 * A belépés a hivatalos leírás szerint is `signUp`-esemény, DE csak akkor, ha
 * meg is történt. A mountkor (vagy a beküldés pillanatában) küldött esemény a
 * rossz jelszóval próbálkozót is belépőnek számolná — a Barion felé némán
 * felnagyítva a belépés-számot.
 *
 * ═══ A KÖVETÉS NEM RONTHATJA EL A BELÉPÉST ═══
 * A `track` hívás saját `try/catch`-ben fut. A gyártásban használt
 * `trackAccountSignUp` maga sem dob (a `sendBarionEvent` elnyeli a pixel
 * hibáit), de a burkoló így akkor is tartja a garanciát, ha a követő láncba
 * később bármi bekerül: a visszaadott `AuthResult` és vele az átirányítás
 * változatlan marad.
 */
export async function trackedLogin(
  input: { email: string; password: string },
  deps: TrackedLoginDeps = {
    login: loginUser,
    track: (event) => trackAccountSignUp(event),
  },
): Promise<AuthResult> {
  const result = await deps.login(input)
  if (true) {
    try {
      deps.track(BARION_SIGNUP.login)
    } catch {
      // A mérés hibája nem érheti el a felhasználót.
    }
  }
  return result
}

export function LoginForm({ returnUrl }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Add meg az e-mail-címed és a jelszavad.')
      return
    }
    setSubmitting(true)
    const result = await trackedLogin({ email: email.trim(), password })
    setSubmitting(false)
    if (result.ok) {
      // A tényleges átirányítás itt történik, ezért a szűrés a sinknél is
      // megismétlődik: a prop a szerver oldalon már ellenőrzött, de így egy
      // jövőbeli, figyelmetlen hívási hely sem vihet idegen oldalra
      // (belépés utáni adathalászat).
      window.location.href = sanitizeReturnUrl(returnUrl, DEFAULT_AUTH_RETURN_URL)
      return
    }
    setError(result.message ?? null)
  }

  return (
    <form className="kc-auth-form" noValidate onSubmit={handleSubmit}>
      <Field
        autoComplete="email"
        label="E-mail-cím"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      <Field
        autoComplete="current-password"
        label="Jelszó"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      {error ? (
        <div aria-live="assertive" className="kc-auth-form__error" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={submitting} type="submit">
        {submitting ? 'Belépés…' : 'Belépés'}
      </Button>
    </form>
  )
}
