'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import {
  BARION_SIGNUP,
  trackAccountSignUp,
  type BarionSignUpEvent,
} from '@/lib/analytics/barion-events'
import { identifyUser } from '@/lib/analytics/posthog'
import { DEFAULT_AUTH_RETURN_URL, sanitizeReturnUrl } from '@/lib/return-url'
import { registerUser, type AuthResult, type RegisterInput } from '../../lib/auth-client'
import { ctaLabel, ctaProgressLabel } from '../../lib/cta-vocabulary'

/**
 * RegisterForm — a regisztrációs űrlap (Payload auth REST-re).
 *
 * HÁROM MEZŐ, TÖBB NINCS: név, e-mail-cím, jelszó. Magyar hibaüzenetek
 * (foglalt e-mail, gyenge jelszó — min. 12 karakter).
 *
 * ═══ MIÉRT NINCS ITT SZÁMLÁZÁSI ADAT (tulajdonosi döntés, 2026-08-17) ═══
 * Korábban egy összecsukható „Számlázási adatok (opcionális)" blokk állt itt.
 * Kikerült: a számlázási adatot ott kérjük, ahol számla készül belőle — a
 * fizetés során.
 *
 * A döntés nem ízlés kérdése, hanem három forrás egybehangzó szabálya:
 *
 * 1. GOV.UK Service Manual, „Ask users for information": „Only ask for
 *    information you need… Every question you ask makes it harder for users to
 *    complete the service." A regisztrációhoz számlázási cím nem kell.
 *    https://www.gov.uk/service-manual/design/collecting-personal-information
 * 2. NN/g, „Website Forms Usability: Top 10 Recommendations": „Keep it short.
 *    Eliminate unnecessary fields" — a hosszabb űrlap kevesebb befejezett
 *    beküldést jelent, akkor is, ha a többlet mező opcionális, mert a
 *    felhasználó a HOSSZÁT látja, mielőtt olvasna.
 *    https://www.nngroup.com/articles/web-form-design/
 * 3. Baymard Institute, checkout-kutatás: az elhagyás egyik vezető oka a „too
 *    long / complicated" folyamat; a mezőszám csökkentése közvetlenül javítja a
 *    befejezési arányt. https://baymard.com/blog/checkout-flow-average-form-fields
 *
 * NEM VÉSZ EL SEMMI. Ugyanezek a mezők két helyen élnek tovább:
 *   - a pénztárban (`CheckoutForm` + `src/lib/checkout/form-submission.ts`),
 *     ahol a számla ténylegesen készül, és
 *   - a fiók „Adataim" lapján (`AccountView`), ahol a vevő bármikor elmentheti
 *     őket, és onnan a pénztár előtölti (WCAG 2.2 · 3.3.7 Redundant Entry).
 * A `RegisterInput` továbbra is ismeri a mezőket — az API-szerződéshez nem
 * nyúltunk, csak a regisztrációs FELÜLET nem kérdezi őket.
 *
 * RÁADÁS: ezzel megszűnt a `.kc-auth-form__billing summary` célfelület-kivétele
 * is (natív <summary>, ~27–30px: a 2.5.8 AA teljesült, a projekt 44px-es célja
 * nem — nyitott tételként volt jelentve a gomb-kontraszt őrben).
 */
export interface RegisterFormProps {
  /** Gyökér-relatív útvonal; a hívó oldal `sanitizeReturnUrl`-lel szűri. */
  returnUrl: string
}

/**
 * ═══ A FRISSEN REGISZTRÁLT FELHASZNÁLÓ AZONOSÍTÓJA ═══
 *
 * MÉRT TÉNY: a Payload REST create-végpontja `{ doc, message }` alakú törzset
 * ad (201), ahol a `doc.id` az új rekord azonosítója — a telepített csomagban
 * ellenőrizve: node_modules/payload/dist/collections/endpoints/create.js
 * (`Response.json({ doc, message }, { status: httpStatus.CREATED })`).
 *
 * A kiolvasás indoklása (miért a válasz klónjából, és miért nem az
 * `AuthResult`-ból) azonos a belépésével — lásd
 * `src/components/auth/LoginForm.tsx` `readLoginUserId` fejlécét.
 * A segédfüggvény SZÁNDÉKOSAN nem onnan importálódik: a `LoginForm` modulja
 * kliens-komponenst exportál, azt a regisztrációs oldal csomagjába behúzni
 * fölösleges. (Ugyanaz a minta, mint a repóban hét helyen élő, modul-lokális
 * `isRecord` — a közös helyre emelés a vezető harvest-döntése.)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Az új felhasználó azonosítója a create-válasz klónjából; sosem dob. */
export async function readRegisteredUserId(
  response: Response,
): Promise<number | string | null> {
  try {
    const body: unknown = await response.clone().json()
    if (!isRecord(body)) {
      return null
    }
    const doc = body.doc
    if (!isRecord(doc)) {
      return null
    }
    const id = doc.id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  } catch {
    return null
  }
}

/** A `trackedRegister` injektálható függőségei (a teszt kémeket ad be). */
export interface TrackedRegisterDeps {
  /**
   * A második paraméter a MEGFIGYELŐ `fetch` (lásd a `TrackedLoginDeps`
   * azonos mezőjét). Opcionális, hogy a csak `(input)`-ot váró teszt-kémek is
   * beadhatók maradjanak.
   */
  register: (input: RegisterInput, fetchImpl?: typeof fetch) => Promise<AuthResult>
  track: (event: BarionSignUpEvent) => boolean
  /** Alapértelmezés: a PostHog `identifyUser` (consent/kulcs nélkül no-op). */
  identify?: (userId: number | string) => boolean
  /** Alapértelmezés: a böngésző `fetch`-e (a tesztben injektált hamis fetch). */
  fetchImpl?: typeof fetch
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
 * A `track` és az `identify` hívás saját `try/catch`-ben fut — a mérés hibája
 * nem ronthatja el a regisztrációt (lásd a LoginForm azonos indoklását).
 *
 * SZEMÉLYES ADAT NEM MEGY KI: kizárólag a Payload `id`. Az épp beírt név és
 * e-mail-cím SOHA (a posthog.ts fejlécének tilalma).
 */
export async function trackedRegister(
  input: RegisterInput,
  deps: TrackedRegisterDeps = {
    register: registerUser,
    track: (event) => trackAccountSignUp(event),
  },
): Promise<AuthResult> {
  const identify = deps.identify ?? identifyUser
  const baseFetch: typeof fetch = deps.fetchImpl ?? ((request, init) => fetch(request, init))

  let userId: number | string | null = null
  const observingFetch: typeof fetch = async (request, init) => {
    const response = await baseFetch(request, init)
    if (response.ok) {
      userId = await readRegisteredUserId(response)
    }
    return response
  }

  const result = await deps.register(input, observingFetch)
  if (result.ok) {
    try {
      deps.track(BARION_SIGNUP.registration)
    } catch {
      // A mérés hibája nem érheti el a felhasználót.
    }
    if (userId !== null) {
      try {
        identify(userId)
      } catch {
        // Ugyanaz a garancia: az azonosítás hibája nem érinti a regisztrációt.
      }
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

      {error ? (
        <div aria-live="assertive" className="kc-auth-form__error" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={submitting} type="submit">
        {submitting ? ctaProgressLabel('sign-up') : ctaLabel('sign-up')}
      </Button>
    </form>
  )
}
