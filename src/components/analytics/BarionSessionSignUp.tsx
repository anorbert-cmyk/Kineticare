'use client'

import { useEffect } from 'react'

import {
  BARION_SIGNUP,
  browserSnapshotStorage,
  claimBarionSessionSignUp,
  trackSignUp,
} from '@/lib/analytics/barion-events'

/**
 * BarionSessionSignUp — az IMPLICIT, munkamenet-nyitó `signUp`.
 *
 * ═══ MIÉRT ═══
 * A hivatalos leírás szerint a `signUp` eseményt nem csak regisztrációkor kell
 * elküldeni, hanem a belépéseknél is; és ha a látogató ÁLLANDÓ (megjegyzett)
 * bejelentkezéssel tér vissza — tehát belépési űrlapot sosem lát —, akkor
 * munkamenetenként EGYSZER egy implicit signUp jelzi, hogy a munkamenetet
 * bejelentkezett felhasználó nyitotta. Enélkül a visszatérő, hűséges vevő a
 * Barion felé teljesen névtelen marad.
 *
 * ═══ MIÉRT A FEJLÉCBEN ═══
 * A bejelentkezettség tényét az oldalkereten belül egyetlen helyen ismerjük
 * szerver-oldalon: a fejléc `getHeaderAuthState()`-je (a védett oldalakkal
 * AZONOS `payload.auth` úton). A fejléc minden oldalon ott van, tehát a jelzés
 * nem attól függ, melyik lapon lép be a látogató. Új auth-lekérdezést nem
 * vezetünk be — az két igazságot jelentene.
 *
 * ═══ MUNKAMENETENKÉNT EGY ═══
 * A reteszt a `claimBarionSessionSignUp` adja (sessionStorage + memória; az
 * indoklás a barion-events.ts-ben). Oldalletöltésenkénti küldés a Barion
 * riportjában némán felnagyítaná a belépés-számot.
 *
 * A KIFEJEZETT belépés/regisztráció ugyanezt a reteszt foglalja el
 * (`trackAccountSignUp`), ezért a beléptetés utáni átirányításkor ez a
 * komponens NEM küld második eseményt ugyanarra a belépésre.
 *
 * SZEMÉLYES ADAT nem megy ki: az esemény a `contentType`/`id`/`name` hármast
 * viszi, felhasználó-azonosítót nem.
 */
export interface BarionSessionSignUpProps {
  /** A fejléc szerver-oldalon megállapított hitelesítési bitje. */
  signedIn: boolean
}

export function BarionSessionSignUp({ signedIn }: BarionSessionSignUpProps): null {
  useEffect(() => {
    if (!signedIn) {
      return
    }
    if (!claimBarionSessionSignUp(browserSnapshotStorage())) {
      return
    }
    trackSignUp(BARION_SIGNUP.persistentLogin)
  }, [signedIn])
  return null
}
