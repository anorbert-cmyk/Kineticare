'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { forgotPassword } from '../../lib/auth-client'

/**
 * ForgotPasswordForm — jelszó-visszaállító link kérése.
 *
 * A Payload forgot-password végpontja 200-at ad (ne szivárogjon, létezik-e a
 * cím); rate-limitnél 429 jöhet — a kliens mindkettőre ugyanazt a megerősítő
 * üzenetet mutatja (lásd auth-client.ts).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      return
    }
    setSubmitting(true)
    await forgotPassword(email.trim())
    setSubmitting(false)
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
      <Button disabled={submitting || !email.trim()} type="submit">
        {submitting ? 'Küldés…' : 'Visszaállító link küldése'}
      </Button>
    </form>
  )
}
