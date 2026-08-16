'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { logger } from '@/lib/logger'

/**
 * A `(frontend)` route-group hibahatára: váratlan (szerver- vagy
 * kliensoldali) renderelési hiba után ez a lap áll a helyén. A fejlécet és a
 * láblécet a layout adja, a szekció-hierarchiát a `.kc-error-page` osztályok.
 *
 * SZÖVEG — GOV.UK „There is a problem with the service" minta:
 * https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/
 * A minta címe „Sorry, there is a problem with the service", a törzs pedig
 * rövid „Try again later." mondat és kapcsolatfelvételi adat. Kimondottan
 * tiltja a technikai kódot („500", „bad request") és a
 * „technikai nehézségeink vannak" fordulatot. Ezért nincs a látható szövegben
 * hibakód, a nyitósor pedig bocsánatkérő, nem hibáztató
 * (NN/g, Error-Message Guidelines:
 * https://www.nngroup.com/articles/error-message-guidelines/).
 *
 * ÁLLAPOTOK — a `docs/ui-sztenderdek.md` gombállapot-táblája (és a
 * `docs/gomb-inventar.md` 500-as sora) szerint az újrapróbálás gombjának
 * KELL „folyamatban" állapot: enélkül a látogató a nem reagáló gombot
 * többször megnyomja. A `useTransition` addig tartja a jelzést, amíg a Next
 * `reset()` utáni újrarenderelése tart, a gomb pedig ilyenkor letiltott.
 * A felirat három ponttal jelez folyamatot, nem gondolatjellel
 * (magyar mikroszöveg-szabályzat, `docs/ui-sztenderdek.md` 3.1).
 *
 * NAPLÓZÁS: a strukturált loggeren át (CLAUDE.md kódolási konvenciók), nem
 * közvetlen konzol-hívással. A `digest` a Next szerver-oldali azonosítója; ezt
 * naplózzuk, hogy a felhasználói bejelentés a szerverlogban megtalálható
 * legyen. A hibaüzenetet magát NEM írjuk ki a felületre.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    logger.error('Frontend render-hiba', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  const handleRetry = (): void => {
    setRetried(true)
    startTransition(() => {
      reset()
    })
  }

  return (
    <Section>
      <Container className="kc-error-page" size="narrow">
        {/* Felvezető sor nincs: a GOV.UK minta tiltja a hibakódot („500"), egy
            „Hiba" felvezető pedig a címsort ismételné meg. */}
        <h1 className="kc-error-page__title">Elnézést, valami elromlott</h1>
        {/* Nincs benne ígéret, amit nem tudunk betartani (pl. a rendelés
            sorsáról): a felirat csak igazat mondhat (termektervezes skill 2.). */}
        <p className="kc-error-page__text">
          Az oldal betöltése most nem sikerült. Próbáld meg újra, vagy térj vissza rá kicsit később.
        </p>
        <div className="kc-error-page__actions">
          <Button disabled={isPending} onClick={handleRetry}>
            {isPending ? 'Újratöltés folyamatban…' : 'Próbáld újra'}
          </Button>
          <Button href="/" variant="secondary">
            Vissza a kezdőlapra
          </Button>
        </div>
        {/* A letiltott gomb mellett mindig áll magyarázat, miért nem használható
            (docs/ui-sztenderdek.md gombállapot-tábla). Az `aria-live` miatt a
            képernyőolvasó is megkapja az állapotváltást. */}
        <p aria-live="polite" className="kc-error-page__contact">
          {isPending
            ? 'Betöltjük az oldalt újra, ez néhány másodperc.'
            : retried
              ? 'Ha másodszorra sem sikerül, írj nekünk, és megnézzük, mi történt.'
              : null}
        </p>
        <p className="kc-error-page__contact">
          Ha a hiba ismétlődik, írj a <Link href="/kapcsolat">kapcsolati oldalon</Link>, és
          megkeressük a megoldást.
        </p>
      </Container>
    </Section>
  )
}
