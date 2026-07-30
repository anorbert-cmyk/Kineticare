import { describe, expect, it, vi } from 'vitest'

import { stripSensitiveFields, writeAuditLog, type AuditLogStore } from '../lib/audit'
import { auditActionsForChange, auditAfterChange } from '../plugins/audit'

describe('writeAuditLog', () => {
  it('sikeres íráskor továbbadja az adatot (requestId a req fejlécéből)', async () => {
    const create = vi.fn<AuditLogStore['create']>(async () => ({ id: 1 }))
    const store: AuditLogStore = { create }
    const headers = new Headers({ 'x-request-id': 'req-42' })

    const ok = await writeAuditLog({
      store,
      actor: 7,
      action: 'role-change',
      entityType: 'users',
      entityId: 99,
      before: { role: 'customer' },
      after: { role: 'staff' },
      req: { headers },
      ipAddress: '203.0.113.9',
    })

    expect(ok).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    const args = create.mock.calls[0][0]
    expect(args.collection).toBe('audit-logs')
    expect(args.overrideAccess).toBe(true)
    expect(args.data).toMatchObject({
      actor: 7,
      action: 'role-change',
      entityType: 'users',
      entityId: '99',
      requestId: 'req-42',
      ipAddress: '203.0.113.9',
      before: { role: 'customer' },
      after: { role: 'staff' },
    })
  })

  it('best-effort: DB-hiba esetén NEM dob, hanem false-szal tér vissza és warn-naplot ír', async () => {
    const create = vi.fn<AuditLogStore['create']>(async () => {
      throw new Error('relation "audit_logs" does not exist')
    })
    const store: AuditLogStore = { create }

    await expect(
      writeAuditLog({ store, action: 'publish', entityType: 'pages', entityId: 1 }),
    ).resolves.toBe(false)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('a before/after-ból eltávolítja az érzékeny mezőket', async () => {
    const create = vi.fn<AuditLogStore['create']>(async () => ({ id: 1 }))
    const store: AuditLogStore = { create }

    await writeAuditLog({
      store,
      action: 'role-change',
      after: { email: 'a@b.hu', password: 'titok', hash: 'x', salt: 'y', role: 'staff' },
    })

    expect(create.mock.calls[0][0].data.after).toEqual({ email: 'a@b.hu', role: 'staff' })
  })
})

describe('stripSensitiveFields', () => {
  it('mélyen és tömbben is tisztít, a körkörös hivatkozást null-ra cseréli', () => {
    const circular: Record<string, unknown> = { name: 'x' }
    circular.self = circular
    const input = {
      user: { password: 'p', nested: [{ token: 't', keep: 1 }] },
      circular,
    }
    const output = stripSensitiveFields(input) as Record<string, unknown>
    expect(output.user).toEqual({ nested: [{ keep: 1 }] })
    expect((output.circular as Record<string, unknown>).self).toBeNull()
  })
})

describe('auditActionsForChange', () => {
  it('create mindig auditált', () => {
    expect(auditActionsForChange('pages', 'create', { id: 1 }, undefined)).toEqual(['create'])
  })

  it('publish-átmenetet észlel pages/posts (status) és products (_status) esetén', () => {
    expect(
      auditActionsForChange('pages', 'update', { status: 'published' }, { status: 'draft' }),
    ).toEqual(['publish'])
    // Újra-publish nem új esemény:
    expect(
      auditActionsForChange('posts', 'update', { status: 'published' }, { status: 'published' }),
    ).toEqual([])
    // A products a drafts _status mezőn publikál:
    expect(
      auditActionsForChange('products', 'update', { _status: 'published' }, { _status: 'draft' }),
    ).toEqual(['publish'])
  })

  it('orders refund-mező változásra refund-update', () => {
    expect(
      auditActionsForChange(
        'orders',
        'update',
        { refundReason: 'hibás termék', refundedAt: null },
        { refundReason: null, refundedAt: null },
      ),
    ).toEqual(['refund-update'])
    expect(auditActionsForChange('orders', 'update', { amount: 5000 }, { amount: 4990 })).toEqual(
      [],
    )
  })

  it('users role-változásra role-change', () => {
    expect(
      auditActionsForChange('users', 'update', { role: 'staff' }, { role: 'customer' }),
    ).toEqual(['role-change'])
    expect(
      auditActionsForChange('users', 'update', { lastLoginAt: 'b' }, { lastLoginAt: 'a' }),
    ).toEqual([])
  })
})

type CreateCall = {
  collection: string
  data: Record<string, unknown>
  overrideAccess?: boolean
}

describe('audit plugin injekciós hook', () => {
  function createReq() {
    return {
      payload: {
        create: vi.fn<(args: CreateCall) => Promise<{ id: number }>>(async () => ({ id: 1 })),
      },
      headers: new Headers({ 'x-request-id': 'req-hook-1' }),
      user: { id: 5, role: 'owner' },
    }
  }

  it('role-change → audit-bejegyzés before/after-rel', async () => {
    const req = createReq()
    await auditAfterChange({
      doc: { id: 12, role: 'staff', email: 'x@y.hu' },
      previousDoc: { id: 12, role: 'customer', email: 'x@y.hu' },
      req: req as never,
      operation: 'update',
      collection: { slug: 'users' } as never,
    } as never)

    expect(req.payload.create).toHaveBeenCalledTimes(1)
    const args = req.payload.create.mock.calls[0][0]
    expect(args.collection).toBe('audit-logs')
    expect(args.data).toMatchObject({
      actor: 5,
      action: 'role-change',
      entityType: 'users',
      entityId: '12',
      requestId: 'req-hook-1',
    })
    expect(args.data.before).toMatchObject({ role: 'customer' })
    expect(args.data.after).toMatchObject({ role: 'staff' })
  })

  it('nem-auditált változás (pl. lastLoginAt) nem ír bejegyzést', async () => {
    const req = createReq()
    await auditAfterChange({
      doc: { id: 12, role: 'staff', lastLoginAt: 'b' },
      previousDoc: { id: 12, role: 'staff', lastLoginAt: 'a' },
      req: req as never,
      operation: 'update',
      collection: { slug: 'users' } as never,
    } as never)

    expect(req.payload.create).not.toHaveBeenCalled()
  })

  it('az audit-írás hibája nem törli meg az eredeti műveletet (best-effort)', async () => {
    const req = createReq()
    req.payload.create = vi.fn<(args: CreateCall) => Promise<{ id: number }>>(async () => {
      throw new Error('DB leállt')
    })
    const doc = { id: 3, status: 'published' }
    const result = await auditAfterChange({
      doc,
      previousDoc: { id: 3, status: 'draft' },
      req: req as never,
      operation: 'update',
      collection: { slug: 'pages' } as never,
    } as never)

    expect(result).toBe(doc)
  })
})
