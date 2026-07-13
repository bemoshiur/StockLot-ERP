'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'
import { saleSchema } from '@/lib/validators/sale'
import { paymentSchema } from '@/lib/validators/payment'
import { returnSchema } from '@/lib/validators/return'
import { periodLockError } from '@/lib/period'
import { lineAmount, lineGrossProfit, challanTotals, challanStatus, roundMoney } from '@/lib/sales'
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
  const lock = await periodLockError(periodMonth)
  if (lock) return { error: lock }
  // A draft is parked without posting to the receivable ledger or the books.
  const asDraft = formData.get('asDraft') === 'on'
  const status = asDraft ? 'DRAFT' : challanStatus({ invoiceTotal: totals.invoiceTotal, collectedTotal: 0, discountTotal: 0 })

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
    if (!asDraft) {
      await tx.receivableEntry.create({
        data: {
          customerId: data.customerId,
          challanId: c.id,
          entryType: 'INVOICE',
          amount: totals.invoiceTotal,
          entryDate: saleDate,
        },
      })
    }
    return c
  })

  await writeAudit({ userId: user.id, entity: 'SalesChallan', entityId: challan.id, action: 'CREATE' })
  revalidatePath('/sales')
  redirect(`/sales/${challan.id}`)
}

export async function recordPayment(challanId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('payments.write')

  const parsed = paymentSchema.safeParse({
    amountCollected: formData.get('amountCollected'),
    discountOrWaiver: formData.get('discountOrWaiver'),
    method: formData.get('method'),
    receiptDate: formData.get('receiptDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const p = parsed.data
  if (p.amountCollected + p.discountOrWaiver <= 0) return { error: 'Enter an amount or a discount' }

  const challan = await db.salesChallan.findUnique({ where: { id: challanId }, include: { lines: true } })
  if (!challan) return { error: 'Challan not found' }
  const payLock = await periodLockError(challan.periodMonth)
  if (payLock) return { error: payLock }
  const lineInputs = challan.lines.map((l) => ({
    quantity: l.quantity,
    unitPrice: Number(l.unitPrice),
    unitCost: Number(l.unitCostSnapshot),
  }))
  const receiptDate = new Date(p.receiptDate)

  // The over-payment guard and all writes run in ONE transaction that re-reads
  // payments from committed state, so a double-submit / concurrent collector
  // cannot both pass the guard and over-collect (SQLite serializes writers).
  const outcome = await db.$transaction(async (tx) => {
    const payments = await tx.paymentReceipt.findMany({ where: { challanId } })
    const totals = challanTotals(
      lineInputs,
      payments.map((pr) => ({ amountCollected: Number(pr.amountCollected), discountOrWaiver: Number(pr.discountOrWaiver) })),
    )
    if (p.amountCollected + p.discountOrWaiver > totals.dueTotal + 0.005)
      return { error: `Amount + discount (৳${p.amountCollected + p.discountOrWaiver}) exceeds the due of ৳${totals.dueTotal}` }

    const newStatus = challanStatus({
      invoiceTotal: totals.invoiceTotal,
      collectedTotal: totals.collectedTotal + p.amountCollected,
      discountTotal: totals.discountTotal + p.discountOrWaiver,
    })
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
    return { ok: true as const }
  })
  if ('error' in outcome) return { error: outcome.error }

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

function revalidateSales(challanId: string) {
  revalidatePath('/sales')
  revalidatePath(`/sales/${challanId}`)
  revalidatePath('/dues')
  revalidatePath('/reports')
  revalidatePath('/inventory/net-stock')
}

/** Void/cancel a challan: reverses its receivable ledger and drops it from the books.
 *  Only allowed when it has no payments (reverse payments via a return first). */
export async function voidChallan(challanId: string): Promise<void> {
  const user = await requireCan('sales.write')
  const challan = await db.salesChallan.findUnique({ where: { id: challanId }, include: { payments: true } })
  if (!challan || challan.status === 'VOID' || challan.status === 'DRAFT') return
  if (challan.payments.length > 0) return // guarded in the UI; no-op if reached

  await db.$transaction(async (tx) => {
    const entries = await tx.receivableEntry.findMany({ where: { challanId } })
    const net = entries.reduce((a, e) => a + Number(e.amount), 0)
    if (net !== 0)
      await tx.receivableEntry.create({
        data: { customerId: challan.customerId, challanId, entryType: 'VOID', amount: -net, entryDate: new Date() },
      })
    await tx.salesChallan.update({ where: { id: challanId }, data: { status: 'VOID', updatedById: user.id } })
  })
  await writeAudit({
    userId: user.id,
    entity: 'SalesChallan',
    entityId: challanId,
    action: 'UPDATE',
    changes: [{ field: 'status', oldValue: challan.status, newValue: 'VOID' }],
  })
  revalidateSales(challanId)
}

/** Confirm a DRAFT challan: posts the invoice to the receivable ledger and dispatches it. */
export async function confirmDraft(challanId: string): Promise<void> {
  const user = await requireCan('sales.write')
  const challan = await db.salesChallan.findUnique({ where: { id: challanId }, include: { lines: true } })
  if (!challan || challan.status !== 'DRAFT') return
  const totals = challanTotals(
    challan.lines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice), unitCost: Number(l.unitCostSnapshot) })),
    [],
  )
  await db.$transaction(async (tx) => {
    await tx.receivableEntry.create({
      data: { customerId: challan.customerId, challanId, entryType: 'INVOICE', amount: totals.invoiceTotal, entryDate: challan.saleDate },
    })
    await tx.salesChallan.update({ where: { id: challanId }, data: { status: 'DISPATCHED', updatedById: user.id } })
  })
  await writeAudit({
    userId: user.id,
    entity: 'SalesChallan',
    entityId: challanId,
    action: 'UPDATE',
    changes: [{ field: 'status', oldValue: 'DRAFT', newValue: 'DISPATCHED' }],
  })
  revalidateSales(challanId)
}

/** Record a sales return / credit note against a challan: adds stock back and
 *  posts a negative RETURN entry to the customer's receivable ledger. */
export async function createReturn(challanId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('sales.write')

  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get('linesJson') ?? '[]'))
  } catch {
    return { error: 'Could not read the return lines' }
  }
  const parsed = returnSchema.safeParse({ reason: formData.get('reason'), returnDate: formData.get('returnDate'), lines: raw })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const data = parsed.data
  const retLock = await periodLockError(data.returnDate.slice(0, 7))
  if (retLock) return { error: retLock }
  const returnLines = data.lines.filter((l) => l.quantity > 0)
  if (returnLines.length === 0) return { error: 'Enter a return quantity for at least one line' }

  const challan = await db.salesChallan.findUnique({ where: { id: challanId }, include: { lines: true, returns: { include: { lines: true } } } })
  if (!challan) return { error: 'Challan not found' }
  if (!['DISPATCHED', 'PARTIALLY_PAID', 'PAID'].includes(challan.status))
    return { error: 'Only a dispatched/paid challan can be returned' }

  // A return line must reference a style on the challan and not exceed (sold − already returned).
  const soldByStyle = new Map<string, { quantity: number; unitPrice: number }>()
  for (const l of challan.lines) {
    const cur = soldByStyle.get(l.styleId) ?? { quantity: 0, unitPrice: Number(l.unitPrice) }
    cur.quantity += l.quantity
    soldByStyle.set(l.styleId, cur)
  }
  const returnedByStyle = new Map<string, number>()
  for (const r of challan.returns) for (const rl of r.lines) returnedByStyle.set(rl.styleId, (returnedByStyle.get(rl.styleId) ?? 0) + rl.quantity)

  let returnAmount = 0
  const createLines: { styleId: string; quantity: number; unitPrice: number; lineAmount: number }[] = []
  for (const rl of returnLines) {
    const sold = soldByStyle.get(rl.styleId)
    if (!sold) return { error: 'A return line does not match any style on this challan' }
    const remaining = sold.quantity - (returnedByStyle.get(rl.styleId) ?? 0)
    if (rl.quantity > remaining) return { error: `Cannot return more than the ${remaining} remaining for a style` }
    const amt = roundMoney(rl.quantity * sold.unitPrice)
    returnAmount += amt
    createLines.push({ styleId: rl.styleId, quantity: rl.quantity, unitPrice: sold.unitPrice, lineAmount: amt })
  }
  returnAmount = roundMoney(returnAmount)
  const returnDate = new Date(data.returnDate)

  const created = await db.$transaction(async (tx) => {
    const ret = await tx.salesReturn.create({
      data: {
        challanId,
        returnDate,
        periodMonth: data.returnDate.slice(0, 7),
        reason: data.reason ?? null,
        createdById: user.id,
        lines: { create: createLines },
      },
    })
    await tx.receivableEntry.create({
      data: { customerId: challan.customerId, challanId, entryType: 'RETURN', amount: -returnAmount, entryDate: returnDate },
    })
    return ret
  })
  await writeAudit({ userId: user.id, entity: 'SalesReturn', entityId: created.id, action: 'CREATE' })
  revalidateSales(challanId)
  redirect(`/documents/credit-note/${created.id}`)
}
