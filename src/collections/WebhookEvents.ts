import type { Access, CollectionConfig } from 'payload'

/**
 * Webhook-events collection (T-014) — fizetési/ügyfél-események idempotens
 * feldolgozásának nyilvántartása.
 *
 * Minden bejövő provider-webhook (Barion, Cloudflare Stream, Számlázz.hu) itt
 * kap egy rekordot a feldolgozás előtt; a (provider, externalId) pár egyedi,
 * így ugyanaz az esemény sosem dolgozódhat fel kétszer — a deduplikációs
 * logika az src/lib/idempotency.ts-ben él.
 *
 * Access-politika: owner és staff olvashatja (hibakeresés/audit), de API-n
 * kívülről nem hozható létre, nem módosítható és nem törölhető — kizárólag
 * rendszerfolyamat írja (overrideAccess-szel).
 */
const isOwnerOrStaff: Access = ({ req }) => req.user?.role === 'owner' || req.user?.role === 'staff'

export const WebhookEvents: CollectionConfig = {
  slug: 'webhook-events',
  admin: {
    useAsTitle: 'externalId',
    defaultColumns: ['provider', 'externalId', 'eventType', 'status', 'attempts', 'updatedAt'],
    group: 'Rendszer',
  },
  access: {
    read: isOwnerOrStaff,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  // Egyedi összetett kulcs: ugyanattól a providertől ugyanaz az externalId csak
  // egyszer szerepelhet — ez a deduplikáció adatbázis-szintű garanciája.
  indexes: [
    {
      fields: ['provider', 'externalId'],
      unique: true,
    },
  ],
  fields: [
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: [
        { label: 'Barion', value: 'barion' },
        { label: 'Cloudflare Stream', value: 'stream' },
        { label: 'Számlázz.hu', value: 'szamlazz' },
      ],
    },
    {
      name: 'externalId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'eventType',
      type: 'text',
    },
    {
      name: 'payload',
      type: 'json',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      index: true,
      options: [
        { label: 'Received', value: 'received' },
        { label: 'Processed', value: 'processed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'lastError',
      type: 'text',
    },
    {
      name: 'requestId',
      type: 'text',
    },
    {
      // A feldolgozás VÉGLEGES üzleti kimenetelének ideje — csak sikeres/
      // elutasított lezáráskor töltődik; hiba esetén NULL marad, hogy az
      // esemény újrapróbálható legyen (retry-job).
      name: 'processedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description:
          'A sikeres/végleges feldolgozás időpontja. Hiba (failed) esetén szándékosan üres — az esemény újrapróbálható marad.',
      },
    },
    {
      // Az utolsó feldolgozás üzleti kimenetele (géppel szűrhető nyom).
      name: 'result',
      type: 'select',
      options: [
        { label: 'Paid (rendelés fizetve + jogosultság megadva)', value: 'paid' },
        { label: 'Cancelled (rendelés lemondva)', value: 'cancelled' },
        { label: 'Függő — újrapollolásra vár', value: 'pending_repoll' },
        { label: 'Átmenet elutasítva (állapotgép-védelem)', value: 'rejected' },
        { label: 'Sikertelen feldolgozás (újrapróbálható)', value: 'failed' },
      ],
      admin: {
        readOnly: true,
        description:
          'Az utolsó feldolgozás üzleti kimenetele. pending_repoll = a fizetés még függő, a poll-job (külön ticket) dolgozza fel újra.',
      },
    },
  ],
}
