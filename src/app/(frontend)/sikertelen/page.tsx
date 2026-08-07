import type { Metadata } from 'next'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'A fizetés nem sikerült',
  description: 'A fizetésedet a bank elutasította vagy megszakította — újrapróbálhatod bármikor.',
}

interface SikertelenPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * /sikertelen — a fizetés sikertelensége (a Barion elutasítás/megszakítás
 * utáni oldal, vagy a köszönőoldal `failed` ágának célja).
 */
export default async function SikertelenPage({ searchParams }: SikertelenPageProps) {
  const params = await searchParams
  const termek = typeof params.termek === 'string' ? params.termek : null

  return (
    <Section>
      <Container size="narrow">
        <div className="kc-thankyou kc-thankyou--failed">
          <h1>A fizetés nem sikerült</h1>
          <p>
            A fizetésedet a bank elutasította vagy megszakította. Semmi sem került levonásra —
            újrapróbálhatod bármikor.
          </p>
          <p>
            Ha többször is elutasított a bank, érdemes ellenőrizni a kártyaadataidat, vagy a
            bankodat felhívni. Ha segítségre van szükséged, írj nekünk.
          </p>
          <div className="kc-thankyou__actions">
            {termek ? (
              <Button href={`/penztar?termek=${encodeURIComponent(termek)}`}>Újrapróbálom a fizetést</Button>
            ) : (
              <Button href="/kurzusok">Vissza a kurzusokhoz</Button>
            )}
            <Button href="/kapcsolat" variant="secondary">Kapcsolat</Button>
          </div>
        </div>
      </Container>
    </Section>
  )
}
