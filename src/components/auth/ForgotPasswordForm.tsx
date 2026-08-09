'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { forgotPassword, GENERIC_AUTH_ERROR } from '../../lib/auth-client'

/**
 * ForgotPasswordForm — jelszó-visszaállító link kérése.
 *
 * A Payload forgot-password végpontja mindig 200-at ad (ne szivárogjon,
 * létezik-e a cím) — a kliens ugyanazt a megerősítő üzenetet mutatja.
 * KIVÉTEL: az IP-alapú kérés-korlát (A2) 429-e, amikor e-mail sem ment ki —
 * ilyenkor hibaüzenet jár a megerősítő képernyő helyett.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await forgotPassword(email.trim())
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message ?? GENERIC_AUTH_ERROR)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div aria-live="polite" className="kc-auth-success" role="status">
        <h2>Ellenőrizd az e-mail-fiókodat</h2>
        <p>
          Ha a <strong>{email}</strong> címhez tartozik fiók, néhány percen belül megérkezik a
          jelszó-visszaállító link. A link 1 óráig érvényes.
        </p>
      </div>
    )
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
      {error ? (
        <div aria-live="assertive" className="kc-auth-form__error" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={submitting || !email.trim()} type="submit">
        {submitting ? 'Küldés…' : 'Visszaállító link küldése'}
      </Button>
    </form>
  )
}
