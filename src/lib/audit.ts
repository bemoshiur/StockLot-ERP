import { db } from '@/lib/db'

export type FieldChange = { field: string; oldValue: string | null; newValue: string | null }

/** Normalize a value to null (for null/undefined/empty) or its string form. */
const norm = (v: unknown): string | null => (v == null || v === '' ? null : String(v))

/** Return the list of fields whose normalized value changed between two plain objects. */
export function diff(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): FieldChange[] {
  const out: FieldChange[] = []
  for (const key of new Set([...Object.keys(oldObj), ...Object.keys(newObj)])) {
    const o = norm(oldObj[key])
    const n = norm(newObj[key])
    if (o !== n) out.push({ field: key, oldValue: o, newValue: n })
  }
  return out
}

export async function writeAudit(p: {
  userId?: string
  entity: string
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  changes?: FieldChange[]
}): Promise<void> {
  if (p.action === 'UPDATE' && p.changes) {
    if (p.changes.length === 0) return
    await db.auditLog.createMany({
      data: p.changes.map((c) => ({
        userId: p.userId,
        entity: p.entity,
        entityId: p.entityId,
        action: p.action,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
    })
  } else {
    await db.auditLog.create({
      data: { userId: p.userId, entity: p.entity, entityId: p.entityId, action: p.action },
    })
  }
}
