import { ArrowIcon } from './icons'
import type { PrimaryAction, SecondaryAction } from './navigation'

/**
 * A LEJÁTSZÓ ALSÓ AKCIÓSÁVJA — a „mi a következő lépésem?" kérdés egyetlen,
 * mindig elérhető válasza.
 *
 * ═══ MIÉRT EGY PRIMER GOMB, ÉS MIÉRT MOND CÍMET ═══
 * A régi felület minden epizódnál külön „Megjelölöm megnézettnek" gombot
 * kínált, a továbblépés pedig a listából ment — két külön mozdulat ugyanarra a
 * szándékra. Itt EGY elsődleges gomb van, ami az állapot szerint jelöl ÉS lép
 * (`primaryAction`, navigation.ts). A felirata tartalmazza a CÉLT
 * („Kész, tovább: Csuklókörzés"), mert egy önmagában álló „Következő" a
 * képernyőolvasó gomb-listájában értelmezhetetlen (WCAG 2.4.6), a hangvezérlés
 * pedig a LÁTHATÓ feliratot keresi (2.5.3 Label in Name) — ezért a
 * `aria-label` a látható szöveggel kezdődik, nem helyettesíti azt.
 *
 * ═══ MIÉRT NINCS LETILTOTT „ELŐZŐ" ═══
 * Az első leckén az „Előző" gomb NEM jelenik meg letiltva, hanem egyáltalán nem
 * kerül ki. A letiltott vezérlő fókuszálhatatlan zaj a billentyűzeten és
 * hamis ígéret az egérrel: a hiánya őszintébb és nyugodtabb.
 *
 * A sáv `position: sticky; bottom: 0` (player.css): a hosszú szöveges leckéken
 * is végig kéznél van, anélkül hogy a tartalom fölé úszó, elnyomhatatlan
 * fixed réteg lenne.
 */

export interface PlayerActionsProps {
  previous: SecondaryAction | null
  primary: PrimaryAction | null
  /** Épp fut-e a szerverhívás (jelölés) — a dupla kattintás ellen. */
  busy: boolean
  onPrevious: (lessonRef: string) => void
  onPrimary: () => void
}

export function PlayerActions({
  busy,
  onPrevious,
  onPrimary,
  previous,
  primary,
}: PlayerActionsProps) {
  if (previous === null && primary === null) {
    return null
  }

  return (
    <div className="kc-player-actions">
      {previous === null ? (
        <span className="kc-player-actions__spacer" />
      ) : (
        <button
          aria-label={previous.ariaLabel}
          className="kc-player-actions__previous"
          onClick={() => onPrevious(previous.targetRef)}
          type="button"
        >
          <ArrowIcon direction="vissza" />
          <span className="kc-player-actions__label">{previous.label}</span>
        </button>
      )}

      {primary === null ? null : (
        <button
          aria-label={primary.ariaLabel}
          className={[
            'kc-player-actions__primary',
            primary.kind === 'course-complete' ? 'kc-player-actions__primary--done' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={primary.disabled || busy}
          onClick={onPrimary}
          type="button"
        >
          <span className="kc-player-actions__primary-text">
            {primary.moduleHint === null ? null : (
              <span aria-hidden="true" className="kc-player-actions__hint">
                {primary.moduleHint}
              </span>
            )}
            <span className="kc-player-actions__label">
              {busy ? 'Mentés…' : primary.label}
            </span>
          </span>
          {primary.kind === 'course-complete' ? null : <ArrowIcon direction="előre" />}
        </button>
      )}
    </div>
  )
}
