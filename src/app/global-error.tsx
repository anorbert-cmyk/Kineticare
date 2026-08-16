/* eslint-disable @next/next/no-html-link-for-pages --
   Ebben a fájlban SZÁNDÉKOSAN nincs `next/link`. A `global-error` akkor fut,
   amikor maga a GYÖKÉR-LAYOUT dőlt el; ilyenkor a kliensoldali router
   állapotában nem bízhatunk, és a `next/link` kliens-navigációja ugyanabba a
   hibás fába vinne vissza. A sima `<a>` teljes lapújratöltést kér, ami a
   biztos kiút. A Next saját `global-error` példája sem használ routert:
   https://nextjs.org/docs/app/api-reference/file-conventions/error */
'use client'

import { useEffect } from 'react'

import { logger } from '@/lib/logger'

import './(frontend)/styles.css'

/**
 * GLOBÁLIS hibahatár — a legkülső háló.
 *
 * Mikor lép működésbe: ha maga a GYÖKÉR-LAYOUT dől el (`(frontend)/layout.tsx`
 * vagy `(payload)/layout.tsx`). Ilyenkor a `(frontend)/error.tsx` már nem tud
 * megjelenni, mert azt a layout keretezné. A `global-error.js` a Next
 * konvenciója szerint a layout HELYETT renderel, ezért SAJÁT `<html>`-t és
 * `<body>`-t kell adnia, és a globális stílusokat is magának kell behúznia.
 * https://nextjs.org/docs/app/api-reference/file-conventions/error
 *
 * A fájl hiánya nem elméleti kockázat volt: enélkül a Next BEÉPÍTETT, angol
 * nyelvű, csupasz hibalapja jelenik meg (production-ben gyakorlatilag üres
 * fehér lap), keret, magyar szöveg és továbbvezető link nélkül.
 *
 * SZÖVEG: a GOV.UK „There is a problem with the service" mintája
 * (https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/)
 * — bocsánatkérő cím, rövid „próbáld később" mondat, kapcsolatfelvétel; se
 * hibakód, se „technikai nehézségeink vannak" fordulat. Az NN/g
 * Error-Message Guidelines ugyanezt kéri: közérthető, pontos, konstruktív
 * (https://www.nngroup.com/articles/error-message-guidelines/).
 *
 * A linkek itt SZÁNDÉKOSAN sima `<a>` elemek, nem `next/link`: ha a
 * gyökér-layout dőlt el, a kliensoldali router állapota sem megbízható, és a
 * teljes lapújratöltés a biztos út.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Gyökér-szintű render-hiba', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="hu">
      <body>
        <main className="kc-section" id="tartalom">
          <div className="kc-container kc-container--narrow kc-error-page">
            <h1 className="kc-error-page__title">Elnézést, valami elromlott</h1>
            <p className="kc-error-page__text">
              Az oldal betöltése most nem sikerült. Próbáld meg újra, vagy térj vissza rá kicsit
              később.
            </p>
            <div className="kc-error-page__actions">
              <button className="kc-button kc-button--primary" onClick={reset} type="button">
                Próbáld újra
              </button>
              <a className="kc-button kc-button--secondary" href="/">
                Vissza a kezdőlapra
              </a>
            </div>
            <p className="kc-error-page__contact">
              Ha a hiba ismétlődik, írj a <a href="/kapcsolat">kapcsolati oldalon</a>, és
              megkeressük a megoldást.
            </p>
          </div>
        </main>
      </body>
    </html>
  )
}
