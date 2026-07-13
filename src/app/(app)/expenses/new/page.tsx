import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, EmptyState } from '@/components/ui'
import { ExpenseForm } from '../expense-form'
import { createExpense } from '../actions'

export default async function NewExpensePage() {
  await requireCan('expenses.write')
  const categories = await db.expenseCategory.findMany({ orderBy: { sortOrder: 'asc' } })

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New expense" />
      {categories.length === 0 ? (
        <EmptyState message="No expense categories exist yet. Add categories before recording expenses." />
      ) : (
        <ExpenseForm action={createExpense} categories={categories} submitLabel="Create expense" />
      )}
    </div>
  )
}
