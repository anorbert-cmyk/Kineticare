'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { registerUser, type RegisterInput } from '../../lib/auth-client'

/**
 * RegisterForm — a regisztrációs űrlap (Payload auth REST-re).
 *
 * A számlázási mezők is rögzíthetők a profilhoz (billingName/Zip/City/Street,
 * taxNumber) — a Users-séma ezeket tárolja, a checkout előtölti őket.
 * Magyar hibaüzenetek (foglalt e-mail, gyenge jelszó — min. 12 karakter).
 */
export interface RegisterFormProps {
  returnUrl: string
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
    const result = await registerUser(values)
    setSubmitting(false)
    if (result.ok) {
      window.location.href = returnUrl
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
