'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { updateProfile, type ProfileUpdateInput } from '../../lib/account-client'
import type { CourseAccessView } from '../../lib/course-access'
import { courseTitle } from '../../lib/courses'
import { formatPriceHuf } from '../../lib/format-price'
import type { Order, User } from '../../payload-types'

/**
 * AccountView — a fiók áttekintése (adataim, rendeléseim, kurzusaim).
 *
 * A kurzusoknál a hozzáférés lejárata is látszik (A1); a szöveget a szerver
 * állítja elő (src/lib/course-access.ts), itt már csak megjelenítés történik.
 */
export interface AccountViewProps {
  user: User
  orders: Order[]
  /** productId → hozzáférés-állapot; hiányzó bejegyzés = korlátlan hozzáférés. */
  accessByProductId?: Record<number, CourseAccessView>
}

const ORDER_STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  created: { label: 'Létrehozva', tone: 'neutral' },
  payment_pending: { label: 'Fizetés folyamatban', tone: 'warning' },
  paid: { label: 'Fizetve', tone: 'success' },
  payment_failed: { label: 'Sikertelen fizetés', tone: 'danger' },
  cancelled: { label: 'Törölve', tone: 'neutral' },
  refunded: { label: 'Visszatérítve', tone: 'info' },
}

export function AccountView({ accessByProductId, user, orders }: AccountViewProps) {
  const [profile, setProfile] = useState<ProfileUpdateInput>({
    name: user.name ?? '',
    billingName: user.billingName ?? '',
    billingZip: user.billingZip ?? '',
    billingCity: user.billingCity ?? '',
    billingStreet: user.billingStreet ?? '',
    taxNumber: user.taxNumber ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (key: keyof ProfileUpdateInput, value: string) => {
    setProfile((previous) => ({ ...previous, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await updateProfile(profile)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
    }
  }

  const purchasedProducts = Array.isArray(user.purchases) ? user.purchases : []

  return (
    <div className="kc-account">
      <Card className="kc-account__section">
        <h2>Adataim</h2>
        <div className="kc-account__grid">
          <Field
            label="Név"
            name="name"
            onChange={(event) => update('name', event.target.value)}
            value={profile.name ?? ''}
          />
          <Field
            label="E-mail-cím"
            name="email"
            readOnly
            value={user.email ?? ''}
          />
          <Field
            label="Számlázási név"
            name="billingName"
            onChange={(event) => update('billingName', event.target.value)}
            value={profile.billingName ?? ''}
          />
          <Field
            label="Irányítószám"
            name="billingZip"
            onChange={(event) => update('billingZip', event.target.value)}
            value={profile.billingZip ?? ''}
          />
          <Field
            label="Település"
            name="billingCity"
            onChange={(event) => update('billingCity', event.target.value)}
            value={profile.billingCity ?? ''}
          />
          <Field
            label="Cím"
            name="billingStreet"
            onChange={(event) => update('billingStreet', event.target.value)}
            value={profile.billingStreet ?? ''}
          />
          <Field
            hint="Csak céges vásárlás esetén."
            label="Adószám"
            name="taxNumber"
            onChange={(event) => update('taxNumber', event.target.value)}
            value={profile.taxNumber ?? ''}
          />
        </div>
        <div className="kc-account__actions">
          <Button disabled={saving} onClick={handleSave}>
            {saving ? 'Mentés…' : 'Mentés'}
          </Button>
          {saved ? <span className="kc-account__saved" role="status">Mentve.</span> : null}
        </div>
      </Card>

      <Card className="kc-account__section">
        <h2>Kurzusaim</h2>
        {purchasedProducts.length === 0 ? (
          <p>
            Még nincs kurzusod. <Link href="/kurzusok">Nézd meg a kurzusainkat</Link> — az első
            ingyenes is lehet.
          </p>
        ) : (
          <ul className="kc-account__courses" role="list">
            {purchasedProducts.map((entry) => {
              const product = typeof entry === 'object' && entry !== null ? entry : null
              const productId = product?.id ?? (typeof entry === 'number' ? entry : null)
              if (productId === null) {
                return null
              }
              const access = accessByProductId?.[productId]
              const expired = access?.hasAccess === false
              return (
                <li key={productId}>
                  <a
                    className="kc-account__course"
                    href={expired ? `/kurzusok/${productId}` : `/kurzusaim/${productId}`}
                  >
                    {product ? courseTitle(product) : `Kurzus #${productId}`}
                  </a>
                  {expired ? (
                    <span className="kc-course-access kc-course-access--expired">
                      {access?.expiredMessage}
                    </span>
                  ) : access?.expiryLabel ? (
                    <span className="kc-course-access">{access.expiryLabel}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="kc-account__section">
        <h2>Rendeléseim</h2>
        {orders.length === 0 ? (
          <p>Még nincs rendelésed.</p>
        ) : (
          <ul className="kc-account__orders" role="list">
            {orders.map((order) => {
              const status = (order.status ? ORDER_STATUS_LABELS[order.status] : undefined) ?? {
                label: order.status ?? 'Ismeretlen',
                tone: 'neutral' as const,
              }
              const total = typeof order.totalHufSnapshot === 'number' ? order.totalHufSnapshot : null
              return (
                <li key={order.id} className="kc-account__order">
                  <div className="kc-account__order-row">
                    <span className="kc-account__order-number">{order.orderNumber}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <div className="kc-account__order-meta">
                    <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('hu-HU') : ''}</span>
                    {total !== null ? <span>{formatPriceHuf(total)}</span> : null}
                    {order.invoicePdfUrl ? (
                      <a href={order.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                        Számla letöltése
                      </a>
                    ) : order.status === 'paid' ? (
                      <span className="kc-account__order-invoice-pending">A számla feldolgozás alatt</span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
