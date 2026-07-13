'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'
import { supplierPaymentSchema } from '@/lib/validators/supplierPayment'
import { periodLockError } from '@/lib/period'
import type { FormState } from '@/components/ui'

export async function addSupplierPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('payables.write')
  const parsed = supplierPaymentSchema.safeParse({
    supplierId: formData.get('supplierId'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    paymentDate: formData.get('paymentDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const d = parsed.data

  const lock = await periodLockError(d.paymentDate.slice(0, 7))
  if (lock) return { error: lock }

  const created = await db.supplierPayment.create({
    data: {
      supplierId: d.supplierId,
      amount: d.amount,
      method: d.method,
      paymentDate: new Date(d.paymentDate),
      periodMonth: d.paymentDate.slice(0, 7),
      notes: d.notes ?? null,
      createdById: user.id,
    },
  })
  await writeAudit({ userId: user.id, entity: 'SupplierPayment', entityId: created.id, action: 'CREATE' })
  revalidatePath('/payables')
  return { error: undefined }
}
