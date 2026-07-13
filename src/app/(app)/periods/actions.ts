'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'

export async function closePeriod(month: string): Promise<void> {
  const user = await requireCan('periods.manage')
  await db.period.upsert({
    where: { month },
    update: { status: 'CLOSED', closedAt: new Date(), closedById: user.id },
    create: { month, status: 'CLOSED', closedAt: new Date(), closedById: user.id },
  })
  await writeAudit({
    userId: user.id,
    entity: 'Period',
    entityId: month,
    action: 'UPDATE',
    changes: [{ field: 'status', oldValue: null, newValue: 'CLOSED' }],
  })
  revalidatePath('/periods')
}

export async function reopenPeriod(month: string): Promise<void> {
  const user = await requireCan('periods.manage')
  await db.period.upsert({
    where: { month },
    update: { status: 'OPEN', closedAt: null, closedById: null },
    create: { month, status: 'OPEN' },
  })
  await writeAudit({
    userId: user.id,
    entity: 'Period',
    entityId: month,
    action: 'UPDATE',
    changes: [{ field: 'status', oldValue: null, newValue: 'OPEN' }],
  })
  revalidatePath('/periods')
}
