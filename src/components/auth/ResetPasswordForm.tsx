'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { resetPassword } from '../../lib/auth-client'
import {
  formatPasswordPolicyErrors,
  validatePasswordStrength,
} from '../../lib/security/password-policy'

/**
 * ResetPasswordForm — új jelszó beállítása a visszaállító tokennel.
 *
 * A kliensoldali ellenőrzés UGYANAZT a `validatePasswordStrength` függvényt
 * hívja, amit a végpont is (src/lib/security/reset-password-route.ts), így a
 * felhasználó pontosan azt a magyar üzenetet látja, amit a szerver adna — csak
 * hálózati kör nélkül. Az e-mail-szabályt a kliens nem tudja ellenőrizni (a
 * visszaállító oldalon csak a token van meg, a cím nem), azt a szerver fogja meg.
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
    const violations = validatePasswordStrength({ password })
    if (violations.length > 0) {
      setError(formatPasswordPolicyErrors(violations))
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
        <Link className="kc-button kc-button--primary" href="/belepes">Belépés</Link>
      </div>
    )
  }

  return (
    <form className="kc-auth-form" noValidate onSubmit={handleSubmit}>
      <Field
        autoComplete="new-password"
        hint="Legalább 12 karakter, kisbetűvel, nagybetűvel és számmal."
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
