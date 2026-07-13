import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { ExpenseForm } from '../expense-form'
import { updateExpense } from '../actions'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCan('expenses.write')
  const { id } = await params
  const [expense, categories] = await Promise.all([
    db.expense.findUnique({ where: { id } }),
    db.expenseCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  if (!expense) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit expense" />
      <ExpenseForm
        action={updateExpense}
        categories={categories}
        submitLabel="Save changes"
        values={{
          id: expense.id,
          categoryId: expense.categoryId,
          expenseDate: expense.expenseDate.toISOString().slice(0, 10),
          payeeOrVendor: expense.payeeOrVendor,
          detail: expense.detail,
          amount: expense.amount.toString(),
          paidAmount: expense.paidAmount.toString(),
          isAdvance: expense.isAdvance,
        }}
      />
    </div>
  )
}
