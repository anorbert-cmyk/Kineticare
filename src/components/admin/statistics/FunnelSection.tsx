import type { OrderFunnelCounts } from '../../../lib/statistics/revenue'
import { StatCard } from './StatCard'
import { cardRowStyle, noticeStyle, sectionStyle } from './styles'

/**
 * „Ami beavatkozást kérhet" szekció: a rendelés-tölcsér operatív oldala.
 * A tölcsér a TELJES állományt számolja (nem a 12 hónapos ablakot), mert a
 * nyitott vagy sikertelen fizetés akkor is teendő, ha régi.
 */
export function FunnelSection({ funnel }: { funnel: OrderFunnelCounts }) {
  const needsAttention = funnel.created + funnel.paymentPending + funnel.paymentFailed
  return (
    <section style={sectionStyle}>
      <h2>Ami beavatkozást kérhet</h2>
      <div style={cardRowStyle}>
        <StatCard label="Fizetve" value={funnel.paid.toLocaleString('hu-HU')} />
        {/* „vagy", nem per-jel: a GOV.UK stílus-szabály szerint a / nem
            helyettesíti az „or"-t (képernyőolvasónak és keresőnek is rossz) —
            https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/
            (Slashes szócikk); összhangban a ui-sztenderdek §3.1 natív magyar
            mikroszöveg-szabályával. */}
        <StatCard
          label="Folyamatban (leadva vagy várakozik)"
          value={(funnel.created + funnel.paymentPending).toLocaleString('hu-HU')}
        />
        {/* A nullánál nagyobb sikertelen fizetés a márka danger tokenjét
            kapja (--kc-as-danger = #b3261e, a fehér kártyán számolt 6,54:1
            kontraszttal — custom.scss jegyzőkönyv; a Payload --theme-error-500
            a tartalék, ha a márka-CSS nem töltődik be). A jelentést a címke
            szövege hordozza, nem a szín (WCAG 1.4.1). */}
        <StatCard
          label="Sikertelen fizetés"
          value={funnel.paymentFailed.toLocaleString('hu-HU')}
          valueColor={
            funnel.paymentFailed > 0 ? 'var(--kc-as-danger, var(--theme-error-500))' : undefined
          }
        />
        <StatCard label="Megszakítva" value={funnel.cancelled.toLocaleString('hu-HU')} />
      </div>
      <p style={noticeStyle}>
        {needsAttention === 0
          ? 'Nincs nyitott vagy sikertelen fizetés, ami beavatkozást kérne.'
          : `${needsAttention.toLocaleString('hu-HU')} rendelés vár még befejezésre vagy újrakezdésre (leadva, fizetésre vár, vagy a kártya nem ment át). A visszatérített rendelések nem számítanak bevételnek.`}
      </p>
    </section>
  )
}
