'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit, diff } from '@/lib/audit'
import { expenseSchema } from '@/lib/validators/expense'
import type { FormState } from '@/components/ui'

function parse(formData: FormData) {
  return expenseSchema.safeParse({
    expenseDate: formData.get('expenseDate'),
    categoryId: formData.get('categoryId'),
    payeeOrVendor: formData.get('payeeOrVendor'),
    detail: formData.get('detail'),
    amount: formData.get('amount'),
    paidAmount: formData.get('paidAmount'),
    isAdvance: formData.get('isAdvance') === 'on',
    remarks: formData.get('remarks'),
  })
}

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('expenses.write')
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const { data } = parsed
  const created = await db.expense.create({
    data: {
      expenseDate: new Date(data.expenseDate),
      periodMonth: data.expenseDate.slice(0, 7),
      categoryId: data.categoryId,
      payeeOrVendor: data.payeeOrVendor,
      detail: data.detail,
      amount: data.amount,
      paidAmount: data.paidAmount,
      isAdvance: data.isAdvance,
      remarks: data.remarks,
      createdById: user.id,
      updatedById: user.id,
    },
  })
  await writeAudit({ userId: user.id, entity: 'Expense', entityId: created.id, action: 'CREATE' })
  revalidatePath('/expenses')
  redirect('/expenses')
}

export async function updateExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('expenses.write')
  const id = String(formData.get('id'))
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const { data } = parsed
  const before = await db.expense.findUnique({ where: { id } })
  if (!before) return { error: 'Expense not found' }
  const after = await db.expense.update({
    where: { id },
    data: {
      expenseDate: new Date(data.expenseDate),
      periodMonth: data.expenseDate.slice(0, 7),
      categoryId: data.categoryId,
      payeeOrVendor: data.payeeOrVendor,
      detail: data.detail,
      amount: data.amount,
      paidAmount: data.paidAmount,
      isAdvance: data.isAdvance,
      remarks: data.remarks,
      updatedById: user.id,
    },
  })
  await writeAudit({
    userId: user.id,
    entity: 'Expense',
    entityId: id,
    action: 'UPDATE',
    changes: diff(
      {
        expenseDate: before.expenseDate.toISOString().slice(0, 10),
        categoryId: before.categoryId,
        payeeOrVendor: before.payeeOrVendor,
        detail: before.detail,
        amount: before.amount.toString(),
        paidAmount: before.paidAmount.toString(),
        isAdvance: before.isAdvance,
        remarks: before.remarks,
      },
      {
        expenseDate: data.expenseDate,
        categoryId: data.categoryId,
        payeeOrVendor: data.payeeOrVendor,
        detail: data.detail,
        amount: String(after.amount),
        paidAmount: String(after.paidAmount),
        isAdvance: data.isAdvance,
        remarks: data.remarks,
      },
    ),
  })
  revalidatePath('/expenses')
  redirect('/expenses')
}
