/**
 * Memóriában élő, minimális Payload-utánzat a vásárló-import teszteléséhez.
 *
 * Csak azt a néhány műveletet valósítja meg, amit a `src/lib/customer-import/`
 * modulok használnak (find / findByID / create / update / count /
 * forgotPassword / sendEmail), de ÁLLAPOTOT tart: az írások látszanak a
 * következő olvasáson. Enélkül az idempotencia (kétszer futtatva a második kör
 * csupa kihagyás) nem lenne bizonyítható.
 *
 * A repó bevett tesztmintáját követi: a szűk objektum `as unknown as Payload`
 * castolással megy be a lib-be (`any` sehol).
 *
 * MINDEN ADAT KITALÁLT — valódi vásárlói adat tesztfixtúrába sem kerülhet.
 */

import type { Payload } from 'payload'

export interface FakeUser {
  /** A where-szűrő mezőnév szerint olvas — ezért kell az index-szignatúra. */
  [field: string]: unknown
  id: number
  email: string
  name: string
  role: 'owner' | 'staff' | 'customer'
  purchases: number[]
  /** A tesztben csak azt ellenőrizzük, hogy MEGVÁLTOZOTT-e — értéke közömbös. */
  password: string
  resetPasswordToken?: string
}

export interface FakeProduct {
  [field: string]: unknown
  id: number
  sku: string
}

/** Egy megírt audit-bejegyzés (a régi vásárlás dátumának megőrzése). */
export interface FakeAuditLog {
  action: string
  entityType?: string
  entityId?: string
  after?: Record<string, unknown>
}

/** Egy elküldött levél a fake postaládában (a tesztek ebből olvasnak). */
export interface FakeSentEmail {
  to: string
  subject: string
  html: string
  text: string
}

export interface FakeDb {
  users: FakeUser[]
  products: FakeProduct[]
  /** Ezekre az e-mailekre az írás hibára fut (DB-hiba szimulálása). */
  failWritesFor?: string[]
  /** Ezekre az e-mailekre a forgotPassword `null`-t ad (ismeretlen felhasználó). */
  unknownForgotPassword?: string[]
  /** Ezekre a címekre a sendEmail KIVÉTELT dob (hálózati hiba szimulálása). */
  throwEmailFor?: string[]
  /** Ezekre a címekre a sendEmail `{ ok: false }` SendResultot ad (a saját adapter viselkedése). */
  rejectEmailFor?: string[]
  nextId: number
  calls: {
    create: number
    update: number
    forgotPassword: string[]
  }
  /** A kiküldött levelek — a küldés-tesztek ezt vizsgálják. */
  sentEmails: FakeSentEmail[]
  /** A megírt audit-bejegyzések (`audit-logs` collection). */
  auditLogs: FakeAuditLog[]
}

export function createFakeDb(overrides: Partial<FakeDb> = {}): FakeDb {
  return {
    users: [],
    products: [],
    nextId: 100,
    calls: { create: 0, update: 0, forgotPassword: [] },
    sentEmails: [],
    auditLogs: [],
    ...overrides,
  }
}

interface Condition {
  equals?: unknown
  in?: unknown
}

function matchesWhere(doc: Record<string, unknown>, where: unknown): boolean {
  if (typeof where !== 'object' || where === null) {
    return true
  }
  for (const [field, rawCondition] of Object.entries(where)) {
    if (typeof rawCondition !== 'object' || rawCondition === null) {
      continue
    }
    const condition = rawCondition as Condition
    const value = doc[field]
    if (condition.equals !== undefined && value !== condition.equals) {
      return false
    }
    if (Array.isArray(condition.in) && !condition.in.includes(value)) {
      return false
    }
  }
  return true
}

interface FindArgs {
  collection: string
  where?: unknown
}

interface CreateArgs {
  collection: string
  data: Record<string, unknown>
}

interface UpdateArgs {
  collection: string
  id: number
  data: Record<string, unknown>
}

interface ForgotPasswordArgs {
  data: { email: string }
}

interface SendEmailArgs {
  to?: unknown
  subject?: unknown
  html?: unknown
  text?: unknown
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** A fake Payload példány — a lib-ek felé teljes értékű `Payload`-ként viselkedik. */
export function createFakePayload(db: FakeDb): Payload {
  const collectionOf = (name: string): Record<string, unknown>[] =>
    name === 'users' ? db.users : db.products

  const fake = {
    find: async (args: FindArgs) => ({
      docs: collectionOf(args.collection).filter((doc) => matchesWhere(doc, args.where)),
    }),
    findByID: async (args: { collection: string; id: number }) => {
      const doc = collectionOf(args.collection).find((entry) => entry.id === args.id)
      if (doc === undefined) {
        throw new Error(`Nincs ilyen rekord: ${args.collection}#${args.id}`)
      }
      return doc
    },
    count: async (args: { collection: string }) => ({
      totalDocs: collectionOf(args.collection).length,
    }),
    create: async (args: CreateArgs) => {
      // Az audit-bejegyzés nem felhasználó: külön listába gyűlik, és NEM
      // számít bele a create-hívások számlálójába (az idempotencia-tesztek
      // a felhasználó-írásokat számolják).
      if (args.collection === 'audit-logs') {
        const after = args.data.after
        db.auditLogs.push({
          action: asString(args.data.action),
          entityType: typeof args.data.entityType === 'string' ? args.data.entityType : undefined,
          entityId: typeof args.data.entityId === 'string' ? args.data.entityId : undefined,
          after: typeof after === 'object' && after !== null ? (after as Record<string, unknown>) : undefined,
        })
        return { id: db.nextId++ }
      }
      db.calls.create += 1
      const email = asString(args.data.email)
      if (db.failWritesFor?.includes(email)) {
        throw new Error('adatbázis-hiba (teszt)')
      }
      const purchases = Array.isArray(args.data.purchases) ? args.data.purchases : []
      const user: FakeUser = {
        id: db.nextId,
        email,
        name: asString(args.data.name),
        role: args.data.role === 'staff' || args.data.role === 'owner' ? args.data.role : 'customer',
        purchases: purchases.filter((value): value is number => typeof value === 'number'),
        password: asString(args.data.password),
      }
      db.nextId += 1
      db.users.push(user)
      return user
    },
    update: async (args: UpdateArgs) => {
      db.calls.update += 1
      const doc = collectionOf(args.collection).find((entry) => entry.id === args.id)
      if (doc === undefined) {
        throw new Error(`Nincs ilyen rekord: ${args.collection}#${args.id}`)
      }
      if (db.failWritesFor?.includes(asString(doc.email))) {
        throw new Error('adatbázis-hiba (teszt)')
      }
      Object.assign(doc, args.data)
      return doc
    },
    forgotPassword: async (args: ForgotPasswordArgs) => {
      db.calls.forgotPassword.push(args.data.email)
      if (db.unknownForgotPassword?.includes(args.data.email)) {
        // A Payload ismeretlen e-mailnél szándékosan `null`-t ad vissza.
        return null
      }
      const user = db.users.find((entry) => entry.email === args.data.email)
      if (user === undefined) {
        return null
      }
      const token = `token-${user.id}-${db.calls.forgotPassword.length}`
      user.resetPasswordToken = token
      return token
    },
    /**
     * A Payload `sendEmail`-je: a visszatérési értéket az adapter dönti el.
     * A projekt saját adaptere SOSEM dob, hanem `{ ok: false }` SendResultot ad
     * — a fake mindkét hibaágat tudja szimulálni (dobás és `ok: false`).
     */
    sendEmail: async (args: SendEmailArgs) => {
      const to = asString(args.to)
      if (db.throwEmailFor?.includes(to)) {
        throw new Error('levelező-szolgáltató elérhetetlen (teszt)')
      }
      if (db.rejectEmailFor?.includes(to)) {
        return { ok: false, provider: 'resend', retryable: true, error: 'HTTP 422 (teszt)' }
      }
      db.sentEmails.push({
        to,
        subject: asString(args.subject),
        html: asString(args.html),
        text: asString(args.text),
      })
      return { ok: true, provider: 'resend', id: `msg-${db.sentEmails.length}` }
    },
  }

  return fake as unknown as Payload
}
