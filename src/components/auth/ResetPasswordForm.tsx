'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { resetPassword } from '../../lib/auth-client'

/**
 * ResetPasswordForm — új jelszó beállítása a visszaállító tokennel.
 */
export interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (password.length < 12) {
      setError('A jelszónak legalább 12 karakter hosszúnak kell lennie.')
      return
    }
    if (password !== passwordConfirm) {
      setError('A két jelszó nem egyezik.')
      return
    }
    setSubmitting(true)
    const result = await resetPassword({ token, password })
    setSubmitting(false)
    if (result.ok) {
      setDone(true)
      return
    }
    setError(result.message ?? 'A jelszó-visszaállítás nem sikerült. Kérj új linket.')
  }

  if (done) {
    return (
      <div aria-live="polite" className="kc-auth-success" role="status">
        <h2>Új jelszó beállítva</h2>
        <p>Sikeresen beállítottad az új jelszavadat. Most már be tudsz lépni vele.</p>
        <a className="kc-button kc-button--primary" href="/belepes">Belépés</a>
      </div>
    )
  }

  return (
    <form className="kc-auth-form" noValidate onSubmit={handleSubmit}>
      <Field
        autoComplete="new-password"
        hint="Legalább 12 karakter."
        label="Új jelszó"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      <Field
        autoComplete="new-password"
        label="Új jelszó mégegyszer"
        name="passwordConfirm"
        onChange={(event) => setPasswordConfirm(event.target.value)}
        required
        type="password"
        value={passwordConfirm}
      />
      {error ? (
        <div aria-live="assertive" className="kc-auth-form__error" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={submitting} type="submit">
        {submitting ? 'Beállítás…' : 'Jelszó beállítása'}
      </Button>
    </form>
  )
}
