import type { Metadata } from 'next'
import Link from 'next/link'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { ctaLabel } from '@/lib/cta-vocabulary'

/**
 * /belepes-atallas — az ÁTKÖLTÖZTETETT vevő egyetlen belépő útja.
 *
 * ═══ MILYEN PROBLÉMÁT OLD MEG ═══
 * A systeme.io-ról áthozott, FIZETŐ vevő levelet kap arról, hogy a régi
 * jelszavával nem tud belépni. Ha ez a levél a `/elfelejtett-jelszo` lapra
 * viszi, a lap H1-e azt kérdezi tőle, hogy „Elfelejtetted a jelszavad?" —
 * amit ő NEM tett: az ő jelszava a régi rendszerben működött. A cím tehát nem
 * az ő helyzetét írja le.
 *
 * WCAG 2.2 · 2.4.6 (Headings and Labels): „Headings and labels describe topic
 * or purpose." A haszonélvezők között a megértés a szempont: „users with
 * cognitive or visual disabilities … benefit from orientation and scanning".
 * https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html
 *
 * NN/g, Information Scent: a kattintás értékének becslése „a mix of cues that
 * they get from the link label, the context in which the link is shown, and
 * their prior experiences" — ha a levél „költözésről" ír, a céllap címének is
 * arról kell szólnia, különben a vevő azt hiszi, rossz helyre jutott.
 * https://www.nngroup.com/articles/information-scent/
 *
 * ═══ MIÉRT KÜLÖN LAP, ÉS MIÉRT NEM SÁV A `/belepes` OLDALON ═══
 * GOV.UK Design System, Notification banner: „Using a notification banner is
 * unlikely to be the right approach in a linear service … For a linear
 * service, it will usually make sense to stick to the 'one thing per page'
 * approach, and avoid using a notification banner", és „There's evidence that
 * people often miss them" (banner-vakság).
 * https://design-system.service.gov.uk/components/notification-banner/
 * A `/belepes` ráadásul pont azt a cselekvést kínálja elsődlegesen (jelszavas
 * belépés), amely ennél a vevőnél BIZTOSAN elbukik.
 *
 * GOV.UK Service Manual, Form structure — „one thing per page": segít a
 * használónak „understand what you're asking them to do", „focus on the
 * specific question and its answer" és „use the service on a mobile device".
 * https://www.gov.uk/service-manual/design/form-structure
 *
 * ═══ MIÉRT UGYANAZ A VÉGPONT ÉS UGYANAZ A GOMBFELIRAT ═══
 * A kért cselekvés bitre azonos a `/elfelejtett-jelszo`-éval: e-mail-cím →
 * visszaállító link. Ezért ugyanaz az űrlap, ugyanaz a Payload-végpont,
 * ugyanaz az enumeráció-védelem és ugyanaz a kérés-korlát fut — és ugyanaz a
 * §3.2 #21 felirat áll a gombon (WCAG 2.2 · 3.2.4 Consistent Identification).
 * Auth-folyamat, access-szabály és kérés-korlát NEM módosult.
 *
 * ═══ INDEXELÉS ═══
 * Ez levél-céllap, nem keresőtalálat. Külön `robots` meta nem kell: a
 * `src/app/robots.ts` `DISALLOWED_PATHS` listáján ÁLL a `/belepes`, a
 * robots.txt tiltás pedig ELŐTAG-egyezés (Google, Robots.txt Specification:
 * „/fish … matches any path that starts with /fish"), tehát a
 * `/belepes-atallas` is tiltott. Ez a slug-választás egyik oka.
 * https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
 */

export const metadata: Metadata = {
  title: 'Jelszó beállítása az új felületen',
  description:
    'A korábbi rendszer jelszava nem költözött át. Kérj beállító linket arra az e-mail-címre, amellyel a kurzust megvetted.',
}

/**
 * A kérés-korlát EMBERI nyelven. A két szám a `password-forgot-email` keretét
 * írja le (`src/lib/security/rate-limit.ts`: 3 kérés / 10 perc, a CÍMZETT
 * e-mail-címére kulcsolva). A számokat őr-teszt köti a szabályhoz, hogy a
 * keret átállításakor ne maradjon itt hazug mondat.
 *
 * MIÉRT ÁLL EGYÁLTALÁN A LAPON: a „nem jött meg a levél, kérek még egyet"
 * ötödik próbálkozás után a felhasználó ELAKAD, és nem tudja, miért. NN/g,
 * 1. heurisztika (Visibility of system status): „The design should always keep
 * users informed about what is going on, through appropriate feedback within a
 * reasonable amount of time."
 * https://www.nngroup.com/articles/ten-usability-heuristics/
 */
export const ATALLAS_KERES_KORLAT_MONDAT =
  'Ugyanarra a címre 10 percen belül legfeljebb 3 levelet küldünk ki, ezért ha többször is kérted, várj néhány percet az újabb próbálkozással.'

/**
 * A migrációs terv 1. szakaszának 4. alapelve szó szerint megköveteli a
 * hozzáférés kimondását: „A megvásárolt kurzusaid átkerültek, újra fizetni NEM
 * kell." Ez a vevő legfőbb félelme, ezért nem sejtetjük, hanem kimondjuk, és a
 * lapon KÉTSZER szerepel: a beküldés előtt és a beküldés után is.
 */
export const ATALLAS_HOZZAFERES_MONDAT =
  'A megvásárolt kurzusaid megvannak, újra fizetned nem kell.'

export default function BelepesAtallasPage() {
  return (
    <Section>
      <Container size="narrow">
        <div className="kc-atallas">
          <h1>Állítsd be a jelszavad az új felületen</h1>

          {/* A „nem te hibáztál" kimondása NEM udvariaskodás. NN/g,
              Error-Message Guidelines: „Remember that when users make errors,
              it's not their fault. Errors highlight flaws in your design."
              https://www.nngroup.com/articles/errors-forms-design-guidelines/
              A jelenség maga is iparági alapeset: Auth0, Bulk User Import —
              „Users with passwords hashed by unsupported algorithms must reset
              their password when they log in for the first time after the bulk
              import."
              https://auth0.com/docs/manage-users/user-migration/bulk-user-imports */}
          <p className="kc-auth-lead">
            A Kineticare kurzusai új, saját felületre költöztek. A régi jelszavad ide nem jött át,
            mert a korábbi oldal külön rendszer volt, és a jelszavakat onnan nem vesszük át. Nem te
            hibáztál: mindenkinek új jelszót kell beállítania, aki eddig a régi oldalon vásárolt.
          </p>

          <p className="kc-atallas__notice">
            <strong>{ATALLAS_HOZZAFERES_MONDAT}</strong> Ugyanazzal az e-mail-címmel éred el őket,
            amellyel a régi oldalon vásároltál.
          </p>

          {/* EGY kért cselekvés a lapon: a lap alján álló két hivatkozás
              (segítség, visszaút) szöveglink, nem gomb — a vizuális
              elsődlegesség így egyedül a beküldő gombé marad. */}
          <ForgotPasswordForm
            emailHint="Azt a címet add meg, amellyel a régi oldalon vásároltál."
            successNote={ATALLAS_HOZZAFERES_MONDAT}
          />

          <h2>Mi történik, miután elküldted?</h2>
          <ol className="kc-atallas__steps">
            <li>Küldünk egy levelet a megadott címre.</li>
            <li>A levélben lévő linken beállítod a saját jelszavad.</li>
            <li>Belépés után a Kurzusaim oldalon megtalálod az anyagaidat.</li>
          </ol>

          <h2>Nem érkezett meg a levél?</h2>
          <p>
            Nézd meg a levélszemét mappát is, és keress rá a Kineticare szóra.{' '}
            {ATALLAS_KERES_KORLAT_MONDAT} Ha így sem találod, vagy nem emlékszel, melyik címmel
            vásároltál, szólj nekünk, és megkeressük a fiókodat.
          </p>

          {/* §3.2 #33 („Írj nekünk") és a #15 mintázata („Vissza a <hova>") —
              mindkettő a jóváhagyott szótárból, tehát a `/kapcsolat` és a
              `/belepes` célon nem keletkezik új felirat (WCAG 2.2 · 3.2.4). */}
          <div className="kc-auth-actions">
            <Link href="/kapcsolat">{ctaLabel('contact-open')}</Link>
            <Link href="/belepes">Vissza a belépéshez</Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
