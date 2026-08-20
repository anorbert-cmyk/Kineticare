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
        <StatCard
          label="Folyamatban (leadva / várakozik)"
          value={(funnel.created + funnel.paymentPending).toLocaleString('hu-HU')}
        />
        {/* A nullánál nagyobb sikertelen fizetés a Payload saját hibaszínét
            kapja (--theme-error-500 — ugyanaz a token, amit a
            CourseProgressPanel hibaüzenete használ), a jelentést a címke
            szövege hordozza, nem a szín (WCAG 1.4.1). */}
        <StatCard
          label="Sikertelen fizetés"
          value={funnel.paymentFailed.toLocaleString('hu-HU')}
          valueColor={funnel.paymentFailed > 0 ? 'var(--theme-error-500)' : undefined}
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
