'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { forgotPassword, GENERIC_AUTH_ERROR } from '../../lib/auth-client'
import { ctaLabel, ctaProgressLabel } from '../../lib/cta-vocabulary'

/**
 * ForgotPasswordForm — jelszó-visszaállító link kérése.
 *
 * A Payload forgot-password végpontja mindig 200-at ad (ne szivárogjon,
 * létezik-e a cím) — a kliens ugyanazt a megerősítő üzenetet mutatja.
 * KIVÉTEL: az IP-alapú kérés-korlát (A2) 429-e, amikor e-mail sem ment ki —
 * ilyenkor hibaüzenet jár a megerősítő képernyő helyett.
 *
 * ═══ MIÉRT KAPOTT KÉT SZÖVEG-PROPOT (2026-08-21) ═══
 * Ugyanez az űrlap szolgálja ki a `/elfelejtett-jelszo` lapot ÉS a
 * `/belepes-atallas` lapot (a systeme.io-ról átköltöztetett vevők egyetlen
 * belépő útja). A két lapon a KÉRT CSELEKVÉS azonos — ezért ugyanaz a végpont,
 * ugyanaz a kérés-korlát és ugyanaz a §3.2 #21 gombfelirat (WCAG 2.2 · 3.2.4
 * Consistent Identification) —, a KÖRÜLÖTTE ÁLLÓ MAGYARÁZAT viszont nem: aki
 * levelet kapott arról, hogy a régi jelszava nem működik, nem „elfelejtette" a
 * jelszavát.
 *
 * A két prop SZÁNDÉKOSAN puszta szöveg, nem `variant` felsorolás:
 *  - az átállás KAMPÁNY-szöveg, aminek egy helyen (a lap fájljában) kell
 *    állnia, hogy a tulajdonos egy fájlban átnézhesse és később egy fájlból
 *    törölhesse;
 *  - az űrlap így tartalom-mentes marad: nem tud az átállásról, tehát egy
 *    későbbi harmadik hívóhely sem kényszerít újabb `variant`-ágat.
 *
 * Amit a propok NEM érintenek: a végpont, a kérés-korlát, az enumeráció-védő
 * feltételes mondat („Ha a … címhez tartozik fiók") és a hibaág. Ezek a
 * biztonsági szerződés részei, nem a hívó dolga.
 */
/**
 * Üres mezővel való beküldés MAGYAR üzenete.
 *
 * ═══ MIÉRT NEM LETILTOTT GOMB (mérve, 2026-08-21) ═══
 * A gomb korábban `disabled` volt, amíg a mező üres. Chromium-mal, VALÓDI
 * Tab-billentyűvel bejárva a `/belepes-atallas` lap fókusz-lánca ez volt:
 * mező → „Írj nekünk" → „Vissza a belépéshez" — a BEKÜLDŐ GOMB KIMARADT.
 * A natív `disabled` kiesik a Tab-sorrendből, tehát a billentyűzetes és a
 * képernyőolvasós látogató a lap elsődleges cselekvését meg sem találta,
 * és arról sem kapott hírt, miért nem használható.
 *
 * A repó saját szabálya ugyanezt írja elő (`src/components/ui/Button.tsx`
 * fejléce): „Ahol a letiltás a felhasználó által ORVOSOLHATÓ hiányból fakad …
 * ott a gombot NEM tiltjuk le … a beküldést pedig validáció fogja meg, világos
 * magyar hibaüzenettel."
 * GOV.UK Design System, Button: „Disabled buttons have poor contrast and can
 * confuse some users, so avoid them if possible."
 * https://design-system.service.gov.uk/components/button/
 *
 * A `submitting` alatti letiltás MARAD: az nem orvosolható hiány, hanem
 * rendszerállapot (dupla küldés elleni védelem), és néhány másodpercig tart.
 */
export const URES_EMAIL_HIBA = 'Add meg az e-mail-címed.'

export interface ForgotPasswordFormProps {
  /**
   * Segédszöveg az e-mail-mező alatt (`Field.hint` → `aria-describedby`,
   * WCAG 2.2 · 3.3.2 Labels or Instructions). Alapból nincs.
   */
  emailHint?: string
  /**
   * Egy MÁSODIK mondat a beküldés utáni megerősítő panelen, az enumeráció-védő
   * mondat UTÁN. Az elsőt sosem írja felül.
   */
  successNote?: string
}

/**
 * Minden prop opcionális, ezért a `<ForgotPasswordForm />` alak változatlanul
 * érvényes. Alapértelmezett paraméter-objektum (`= {}`) SZÁNDÉKOSAN nincs: attól
 * a komponens típusa `(props?: …) => …` lenne, amit a `React.createElement`
 * túlterhelései nem fogadnak el propokkal (mérve: TS2769 a felületi őr-tesztben).
 */
export function ForgotPasswordForm({ emailHint, successNote }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      setError(URES_EMAIL_HIBA)
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
        {successNote ? <p className="kc-auth-success__note">{successNote}</p> : null}
      </div>
    )
  }

  return (
    <form className="kc-auth-form" noValidate onSubmit={handleSubmit}>
      <Field
        autoComplete="email"
        hint={emailHint}
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
      {/* §3.2 #21: e-mail indul a látogatónak, tehát elkötelezés (P-1a → E/1).
          A korábbi „Visszaállító link küldése" deverbális főnévi alak volt. */}
      <Button disabled={submitting} type="submit">
        {submitting ? ctaProgressLabel('password-reset-request') : ctaLabel('password-reset-request')}
      </Button>
    </form>
  )
}
