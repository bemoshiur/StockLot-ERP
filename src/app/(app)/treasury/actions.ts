'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'
import { signedMovementAmount } from '@/lib/finance'
import { capitalMovementSchema, treasuryDepositSchema } from '@/lib/validators/treasury'
import { periodLockError } from '@/lib/period'
import type { FormState } from '@/components/ui'

export async function addCapitalMovement(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('treasury.write')
  const parsed = capitalMovementSchema.safeParse({
    partnerId: formData.get('partnerId'),
    movementType: formData.get('movementType'),
    amount: formData.get('amount'),
    date: formData.get('date'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const d = parsed.data
  const lock = await periodLockError(d.date.slice(0, 7))
  if (lock) return { error: lock }

  const created = await db.capitalMovement.create({
    data: {
      partnerId: d.partnerId,
      movementType: d.movementType,
      amount: signedMovementAmount(d.movementType, d.amount),
      date: new Date(d.date),
      periodMonth: d.date.slice(0, 7),
      notes: d.notes ?? null,
      createdById: user.id,
    },
  })
  await writeAudit({ userId: user.id, entity: 'CapitalMovement', entityId: created.id, action: 'CREATE' })
  revalidatePath('/treasury')
  return { error: undefined }
}

export async function addDeposit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('treasury.write')
  const parsed = treasuryDepositSchema.safeParse({
    payerPartnerId: formData.get('payerPartnerId'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    depositDate: formData.get('depositDate'),
    otherIncome: formData.get('otherIncome'),
    remarks: formData.get('remarks'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const d = parsed.data
  if (d.amount <= 0 && d.otherIncome <= 0) return { error: 'Enter a deposit amount or other income' }
  const lock = await periodLockError(d.depositDate.slice(0, 7))
  if (lock) return { error: lock }

  const created = await db.treasuryDeposit.create({
    data: {
      payerPartnerId: d.payerPartnerId ?? null,
      amount: d.amount,
      method: d.method,
      depositDate: new Date(d.depositDate),
      periodMonth: d.depositDate.slice(0, 7),
      destination: 'Alib',
      otherIncome: d.otherIncome,
      remarks: d.remarks ?? null,
      createdById: user.id,
    },
  })
  await writeAudit({ userId: user.id, entity: 'TreasuryDeposit', entityId: created.id, action: 'CREATE' })
  revalidatePath('/treasury')
  return { error: undefined }
}
