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
import { registerUser, type AuthResult, type RegisterInput } from '../../lib/auth-client'

/**
 * RegisterForm — a regisztrációs űrlap (Payload auth REST-re).
 *
 * A számlázási mezők is rögzíthetők a profilhoz (billingName/Zip/City/Street,
 * taxNumber) — a Users-séma ezeket tárolja, a checkout előtölti őket.
 * Magyar hibaüzenetek (foglalt e-mail, gyenge jelszó — min. 12 karakter).
 */
export interface RegisterFormProps {
  /** Gyökér-relatív útvonal; a hívó oldal `sanitizeReturnUrl`-lel szűri. */
  returnUrl: string
}

/** A `trackedRegister` injektálható függőségei (a teszt kémeket ad be). */
export interface TrackedRegisterDeps {
  register: (input: RegisterInput) => Promise<AuthResult>
  track: (event: BarionSignUpEvent) => boolean
}

/**
 * Regisztráció + Barion `signUp`.
 *
 * Az esemény a SIKERES válasz után megy ki: a foglalt e-mail-cím vagy a túl
 * rövid jelszó miatt elutasított próbálkozás nem regisztráció, és nem is
 * szabad annak látszania a Barion riportjában.
 *
 * A `trackAccountSignUp` a munkamenet signUp-reteszét is elfoglalja: a
 * regisztráció utáni átirányításkor a fejléc implicit, munkamenet-nyitó
 * signUp-ja már ugyanazt az eseményt jelentené másodszor.
 *
 * A `track` hívás saját `try/catch`-ben fut — a mérés hibája nem ronthatja el
 * a regisztrációt (lásd a LoginForm azonos indoklását).
 */
export async function trackedRegister(
  input: RegisterInput,
  deps: TrackedRegisterDeps = {
    register: registerUser,
    track: (event) => trackAccountSignUp(event),
  },
): Promise<AuthResult> {
  const result = await deps.register(input)
  if (result.ok) {
    try {
      deps.track(BARION_SIGNUP.registration)
    } catch {
      // A mérés hibája nem érheti el a felhasználót.
    }
  }
  return result
}

export function RegisterForm({ returnUrl }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterInput>({
    email: '',
    password: '',
    name: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (key: keyof RegisterInput, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!values.name.trim() || !values.email.trim() || !values.password) {
      setError('Add meg a neved, az e-mail-címed és a jelszavad.')
      return
    }
    if (values.password.length < 12) {
      setError('A jelszónak legalább 12 karakter hosszúnak kell lennie.')
      return
    }
    setSubmitting(true)
    const result = await trackedRegister(values)
    setSubmitting(false)
    if (result.ok) {
      // A szűrés a sinknél is megismétlődik (lásd LoginForm): a prop a szerver
      // oldalon már ellenőrzött, de az átirányítás itt történik, és idegen
      // eredetre semmiképp nem mehet.
      window.location.href = sanitizeReturnUrl(returnUrl, DEFAULT_AUTH_RETURN_URL)
      return
    }
    setError(result.message ?? 'A regisztráció nem sikerült. Próbáld újra.')
  }

  return (
    <form className="kc-auth-form" noValidate onSubmit={handleSubmit}>
      <Field
        autoComplete="name"
        label="Név"
        name="name"
        onChange={(event) => update('name', event.target.value)}
        required
        value={values.name}
      />
      <Field
        autoComplete="email"
        label="E-mail-cím"
        name="email"
        onChange={(event) => update('email', event.target.value)}
        required
        type="email"
        value={values.email}
      />
      <Field
        autoComplete="new-password"
        hint="Legalább 12 karakter."
        label="Jelszó"
        name="password"
        onChange={(event) => update('password', event.target.value)}
        required
        type="password"
        value={values.password}
      />

      <details className="kc-auth-form__billing">
        <summary>Számlázási adatok (opcionális — a checkout előtölti)</summary>
        <Field
          label="Számlázási név"
          name="billingName"
          onChange={(event) => update('billingName', event.target.value)}
          value={values.billingName ?? ''}
        />
        <div className="kc-checkout-billing__grid">
          <Field
            label="Irányítószám"
            name="billingZip"
            onChange={(event) => update('billingZip', event.target.value)}
            value={values.billingZip ?? ''}
          />
          <Field
            label="Település"
            name="billingCity"
            onChange={(event) => update('billingCity', event.target.value)}
            value={values.billingCity ?? ''}
          />
        </div>
        <Field
          label="Cím"
          name="billingStreet"
          onChange={(event) => update('billingStreet', event.target.value)}
          value={values.billingStreet ?? ''}
        />
        <Field
          hint="Csak céges vásárlás esetén."
          label="Adószám (céges vásárlásnál)"
          name="taxNumber"
          onChange={(event) => update('taxNumber', event.target.value)}
          value={values.taxNumber ?? ''}
        />
      </details>

      {error ? (
        <div aria-live="assertive" className="kc-auth-form__error" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={submitting} type="submit">
        {submitting ? 'Regisztráció…' : 'Regisztráció'}
      </Button>
    </form>
  )
}
