import type { CSSProperties } from 'react'

import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

/**
 * Faq — gyakori kérdések (audit M8/K7: ellenérv-kezelés a vásárlás előtt).
 *
 * Statikus magyar szöveg az audit által azonosított kérdésekkel. A natív
 * <details>/<summary> kliens-oldali JS nélkül is működik (SSR-barát).
 * A válaszok óvatosak: műtét utáni helyzetben mindig a kezelőorvos/gyógytornász
 * jóváhagyása az irányadó — orvosi ígéretet nem teszünk.
 */

/**
 * Exportált, hogy a kezdőlap FAQPage JSON-LD-je UGYANEBBŐL a forrásból épüljön.
 * Így a strukturált adat és a látható szöveg nem tud szétcsúszni — az eltérő
 * schema és oldalszöveg a leggyakoribb ok, amiért a keresők elvetik a rich
 * resultot, az AI pedig téves választ idéz.
 */
export const FAQ_ITEMS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Műtét után is végezhetem a gyakorlatokat?',
    answer:
      'A kurzusok általános rehabilitációs programok. Műtét után mindig a kezelőorvosod vagy gyógytornászod jóváhagyásával kezdj bele — ha bizonytalan vagy, írj nekünk a kapcsolat oldalon, és segítünk eligazodni.',
  },
  {
    question: 'Fájdalmasak a gyakorlatok?',
    answer:
      'Nem kell, hogy fájjanak. A gyakorlatokat a saját tűrőképességedhez igazítod; éles fájdalom esetén hagyd abba, és kérj szakmai segítséget.',
  },
  {
    question: 'Mennyi időt vesz igénybe naponta?',
    answer:
      'Napi 10–15 perc is elég — a rövid, rendszeres gyakorlás hozza a tartós eredményt, nem az egyszeri nagy erőfeszítés.',
  },
  {
    question: 'Szükségem van eszközökre a gyakorlatokhoz?',
    answer:
      'Nem. A gyakorlatok többsége saját testsúllyal, otthon található eszközökkel végezhető — ahol bármi kell, azt a videóban jelezzük.',
  },
]

const itemStyle: CSSProperties = {
  borderBottom: '1px solid var(--kc-color-border)',
  padding: 'var(--kc-space-4, 1rem) 0',
}

const summaryStyle: CSSProperties = {
  cursor: 'pointer',
  fontWeight: 'var(--kc-font-weight-bold)' as CSSProperties['fontWeight'],
  fontSize: 'var(--kc-text-base)',
  lineHeight: 'var(--kc-leading-heading)',
}

const answerStyle: CSSProperties = {
  margin: 'var(--kc-space-3, 0.75rem) 0 0',
  color: 'var(--kc-color-text-muted)',
}

export function Faq() {
  return (
    <Section variant="default">
      <Container size="narrow">
        <h2 className="kc-section-title">Gyakori kérdések</h2>
        <div style={{ marginTop: 'var(--kc-space-5, 1.5rem)' }}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} style={itemStyle}>
              <summary style={summaryStyle}>{item.question}</summary>
              <p style={answerStyle}>{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  )
}
