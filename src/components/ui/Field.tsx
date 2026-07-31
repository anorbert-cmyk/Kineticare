import type { InputHTMLAttributes } from 'react'

/**
 * Field — label + input + segédszöveg/hiba egységes egységként.
 *
 * Props:
 * - label: a mező felirata (kötelező az akadálymentességhez)
 * - name/id: az input azonosítója (id nélkül a name-ből generálódik)
 * - hint: segédszöveg az input alatt
 * - error: hibaüzenet — megadva hibaállapot (piros keret + role="alert" szöveg);
 *   az aria-invalid és aria-describedby automatikusan beáll
 * - required: csillag-jelölés a labelen + HTML required
 * - a többi natív input-attribútum átadható (type, placeholder, autoComplete…)
 *
 * A komponens kontrollálatlan; űrlap-oldali state-kezelés a hívó feladata.
 */

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  name: string
  id?: string
  hint?: string
  error?: string
}

export function Field({ label, name, id, hint, error, required, className, ...inputProps }: FieldProps) {
  const inputId = id ?? `kc-field-${name}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={['kc-field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="kc-field__label" htmlFor={inputId}>
        {label}
        {required ? (
          <>
            {' '}
            <span aria-hidden="true" className="kc-field__required">
              *
            </span>
            <span className="kc-visually-hidden"> (kötelező)</span>
          </>
        ) : null}
      </label>
      <input
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={['kc-field__input', error ? 'kc-field__input--error' : '']
          .filter(Boolean)
          .join(' ')}
        id={inputId}
        name={name}
        required={required}
      />
      {hint ? (
        <p className="kc-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="kc-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
