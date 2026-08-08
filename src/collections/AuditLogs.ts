import type { Access, CollectionConfig } from 'payload'

/**
 * Audit-logs collection (T-015) — pénzügyi és jogosultság-érzékeny műveletek
 * megváltoztathatatlan nyilvántartása (ki, mit, melyik entitáson, miről-mire).
 *
 * A bejegyzéseket kizárólag rendszerfolyamat írja (src/lib/audit.ts,
 * overrideAccess-szel); API-n kívülről sem létrehozni, sem módosítani, sem
 * törölni nem lehet — az audit-trail integritása így garantált. Olvasni csak
 * owner szerepkörrel szabad (a before/after tartalom személyes adatot is
 * hordozhat).
 *
 * GDPR-megjegyzés: az ipAddress személyes adat, a retention-jét (törlés/
 * anonimizálás a törvényi megőrzési idő letelte után) egy későbbi cleanup-job
 * kezeli — ez a ticket szándékosan nem implementálja.
 */
const isOwner: Access = ({ req }) => req.user?.role === 'owner'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: {
    singular: 'Naplóbejegyzés',
    plural: 'Műveletnapló',
  },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['actor', 'action', 'entityType', 'entityId', 'createdAt'],
    group: 'Rendszer',
    description:
      'Ki, mikor, mit módosított a pénzügyi és jogosultsági műveletekben. Csak olvasható.',
  },
  access: {
    read: isOwner,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Ki csinálta',
    },
    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
      label: 'Művelet',
    },
    {
      name: 'entityType',
      type: 'text',
      index: true,
      label: 'Érintett típus',
    },
    {
      name: 'entityId',
      type: 'text',
      label: 'Érintett azonosító',
    },
    {
      name: 'before',
      type: 'json',
      label: 'Előtte',
    },
    {
      name: 'after',
      type: 'json',
      label: 'Utána',
    },
    {
      name: 'requestId',
      type: 'text',
      label: 'Kérésazonosító',
    },
    {
      // Lásd a GDPR-megjegyzést a fájl fejlécében: retention = későbbi cleanup-job.
      name: 'ipAddress',
      type: 'text',
      label: 'IP-cím',
    },
  ],
}
