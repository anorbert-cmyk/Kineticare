'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { loginUser } from '../../lib/auth-client'

/**
 * LoginForm — a bejelentkezés űrlapja (Payload auth REST-re).
 *
 * A returnUrl-paraméterrel tér vissza oda, ahonnan jött (csak belső
 * útvonal — open-redirect ellen védve). Magyar hibaüzenetek.
 */
export interface LoginFormProps {
  returnUrl: string
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
    const result = await loginUser({ email: email.trim(), password })
    setSubmitting(false)
    if (result.ok) {
      window.location.href = returnUrl
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
