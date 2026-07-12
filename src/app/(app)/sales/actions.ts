'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'
import { saleSchema } from '@/lib/validators/sale'
import { paymentSchema } from '@/lib/validators/payment'
import { lineAmount, lineGrossProfit, challanTotals, challanStatus } from '@/lib/sales'
import type { FormState } from '@/components/ui'

export async function createSale(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('sales.write')

  let lines: unknown
  try {
    lines = JSON.parse(String(formData.get('linesJson') ?? '[]'))
  } catch {
    return { error: 'Could not read the sale lines' }
  }

  const parsed = saleSchema.safeParse({
    customerId: formData.get('customerId'),
    saleDate: formData.get('saleDate'),
    locationId: formData.get('locationId'),
    challanNo: formData.get('challanNo'),
    remarks: formData.get('remarks'),
    lines,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const data = parsed.data

  // Snapshot current standard cost per style.
  const styleIds = [...new Set(data.lines.map((l) => l.styleId))]
  const styles = await db.productStyle.findMany({ where: { id: { in: styleIds } } })
  const costById = new Map(styles.map((s) => [s.id, Number(s.standardCost)]))
  if (styleIds.some((id) => !costById.has(id))) return { error: 'One of the selected styles no longer exists' }

  const lineRows = data.lines.map((l) => {
    const unitCost = costById.get(l.styleId)!
    return {
      styleId: l.styleId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      unitCostSnapshot: unitCost,
      lineAmount: lineAmount(l.quantity, l.unitPrice),
      lineGrossProfit: lineGrossProfit(l.quantity, l.unitPrice, unitCost),
    }
  })

  const totals = challanTotals(
    data.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, unitCost: costById.get(l.styleId)! })),
    [],
  )
  const saleDate = new Date(data.saleDate)
  const periodMonth = data.saleDate.slice(0, 7)
  const status = challanStatus({ invoiceTotal: totals.invoiceTotal, collectedTotal: 0, discountTotal: 0 })

  const challan = await db.$transaction(async (tx) => {
    const c = await tx.salesChallan.create({
      data: {
        challanNo: data.challanNo ?? null,
        saleDate,
        periodMonth,
        customerId: data.customerId,
        locationId: data.locationId ?? null,
        status,
        remarks: data.remarks ?? null,
        createdById: user.id,
        updatedById: user.id,
        lines: { create: lineRows },
      },
    })
    await tx.receivableEntry.create({
      data: {
        customerId: data.customerId,
        challanId: c.id,
        entryType: 'INVOICE',
        amount: totals.invoiceTotal,
        entryDate: saleDate,
      },
    })
    return c
  })

  await writeAudit({ userId: user.id, entity: 'SalesChallan', entityId: challan.id, action: 'CREATE' })
  revalidatePath('/sales')
  redirect(`/sales/${challan.id}`)
}

export async function recordPayment(challanId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('payments.write')

  const challan = await db.salesChallan.findUnique({
    where: { id: challanId },
    include: { lines: true, payments: true },
  })
  if (!challan) return { error: 'Challan not found' }

  const parsed = paymentSchema.safeParse({
    amountCollected: formData.get('amountCollected'),
    discountOrWaiver: formData.get('discountOrWaiver'),
    method: formData.get('method'),
    receiptDate: formData.get('receiptDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const p = parsed.data

  const totals = challanTotals(
    challan.lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      unitCost: Number(l.unitCostSnapshot),
    })),
    challan.payments.map((pr) => ({
      amountCollected: Number(pr.amountCollected),
      discountOrWaiver: Number(pr.discountOrWaiver),
    })),
  )

  if (p.amountCollected + p.discountOrWaiver > totals.dueTotal + 0.005)
    return { error: `Amount + discount (৳${p.amountCollected + p.discountOrWaiver}) exceeds the due of ৳${totals.dueTotal}` }
  if (p.amountCollected + p.discountOrWaiver <= 0) return { error: 'Enter an amount or a discount' }

  const newStatus = challanStatus({
    invoiceTotal: totals.invoiceTotal,
    collectedTotal: totals.collectedTotal + p.amountCollected,
    discountTotal: totals.discountTotal + p.discountOrWaiver,
  })
  const receiptDate = new Date(p.receiptDate)

  await db.$transaction(async (tx) => {
    await tx.paymentReceipt.create({
      data: {
        challanId,
        receiptDate,
        amountCollected: p.amountCollected,
        discountOrWaiver: p.discountOrWaiver,
        method: p.method,
        notes: p.notes ?? null,
        collectedById: user.id,
      },
    })
    await tx.receivableEntry.create({
      data: { customerId: challan.customerId, challanId, entryType: 'PAYMENT', amount: -p.amountCollected, entryDate: receiptDate },
    })
    if (p.discountOrWaiver > 0)
      await tx.receivableEntry.create({
        data: { customerId: challan.customerId, challanId, entryType: 'WAIVER', amount: -p.discountOrWaiver, entryDate: receiptDate },
      })
    await tx.salesChallan.update({ where: { id: challanId }, data: { status: newStatus, updatedById: user.id } })
  })

  await writeAudit({
    userId: user.id,
    entity: 'SalesChallan',
    entityId: challanId,
    action: 'UPDATE',
    changes: [{ field: 'payment', oldValue: null, newValue: `+৳${p.amountCollected} (${p.method})` }],
  })
  revalidatePath(`/sales/${challanId}`)
  revalidatePath('/sales')
  revalidatePath('/dues')
  return { error: undefined }
}
