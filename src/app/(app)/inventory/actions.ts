'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'
import { receiptSchema } from '@/lib/validators/receipt'
import { periodLockError } from '@/lib/period'
import type { FormState } from '@/components/ui'

export async function createReceipt(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('inventory.write')

  let lines: unknown
  try {
    lines = JSON.parse(String(formData.get('linesJson') ?? '[]'))
  } catch {
    return { error: 'Could not read the receipt lines' }
  }

  const parsed = receiptSchema.safeParse({
    supplierId: formData.get('supplierId'),
    receiptDate: formData.get('receiptDate'),
    challanNo: formData.get('challanNo'),
    isOpeningStock: formData.get('isOpeningStock') === 'on',
    remarks: formData.get('remarks'),
    lines,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const data = parsed.data

  const styleIds = [...new Set(data.lines.map((l) => l.styleId))]
  const found = await db.productStyle.count({ where: { id: { in: styleIds } } })
  if (found !== styleIds.length) return { error: 'One of the selected styles no longer exists' }

  const periodMonth = data.receiptDate.slice(0, 7)
  const lock = await periodLockError(periodMonth)
  if (lock) return { error: lock }

  const billAmount = Number(formData.get('billAmount') ?? 0) || 0

  const receiptDate = new Date(data.receiptDate)
  const receipt = await db.purchaseReceipt.create({
    data: {
      challanNo: data.challanNo ?? null,
      receiptDate,
      periodMonth,
      supplierId: data.supplierId ?? null,
      isOpeningStock: data.isOpeningStock,
      billAmount,
      remarks: data.remarks ?? null,
      createdById: user.id,
      updatedById: user.id,
      lines: {
        create: data.lines.map((l) => ({
          styleId: l.styleId,
          quantity: l.quantity,
          subCategoryNote: l.subCategoryNote ?? null,
        })),
      },
    },
  })

  await writeAudit({ userId: user.id, entity: 'PurchaseReceipt', entityId: receipt.id, action: 'CREATE' })
  revalidatePath('/inventory')
  revalidatePath('/inventory/net-stock')
  redirect(`/inventory/${receipt.id}`)
}
