'use client'

import { dispatchConsentOpenEvent } from '@/lib/analytics/consent'

/**
 * ConsentSettingsButton — a süti-hozzájárulás visszavonási/módosítási felülete
 * (GDPR): a footer „Süti-beállítások" gombja, amely a ConsentBanner-t nyitja
 * újra ('kc:analytics-consent-open' esemény). A consent-állapotgép változatlan —
 * a banner meglévő döntései (Elfogadom/Elutasítom) ugyanúgy írják a tárolót.
 *
 * Szándékosan NEM külön oldal: a legkisebb mértékű, mindig elérhető felület.
 */
export function ConsentSettingsButton() {
  return (
    <button type="button" onClick={() => dispatchConsentOpenEvent()}>
      Süti-beállítások
    </button>
  )
}
