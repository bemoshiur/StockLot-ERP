import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { taka, shortDate } from '@/lib/format'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { SearchBar, Pagination, parseListParams, PAGE_SIZE } from '@/components/list-controls'

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireCan('expenses.read')
  const writable = can(user.role, 'expenses.write')
  const sp = await searchParams
  const { q, page } = parseListParams(sp)

  const where: Prisma.ExpenseWhereInput = q
    ? {
        OR: [
          { payeeOrVendor: { contains: q, mode: 'insensitive' } },
          { detail: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }
    : {}

  const [expenses, total, operatingAgg] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true },
    }),
    db.expense.count({ where }),
    // Total over ALL non-advance expenses, independent of the paginated list above.
    db.expense.aggregate({ _sum: { amount: true }, where: { isAdvance: false } }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const operatingTotal = Number(operatingAgg._sum.amount ?? 0)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Expenses"
        action={writable ? { href: '/expenses/new', label: 'New expense' } : undefined}
        secondary={
          <a
            href="/api/export/expenses"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Export CSV
          </a>
        }
      />
      {expenses.length === 0 ? (
        <EmptyState message="No expenses yet. Record your first expense to start tracking operating cost." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Payee</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Paid</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((e) => (
                  <tr key={e.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{shortDate(e.expenseDate)}</td>
                    <td className="px-4 py-3 font-medium">
                      {e.category.name}
                      {e.isAdvance && (
                        <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Advance
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{e.payeeOrVendor ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{taka(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{taka(Number(e.paidAmount))}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/expenses/${e.id}`}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      >
                        {writable ? 'Edit' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 dark:border-slate-800">
                <tr className="text-slate-900 dark:text-slate-100">
                  <td className="px-4 py-3 font-medium" colSpan={3}>
                    Operating expense <span className="font-normal text-slate-400">(excludes advances)</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{taka(operatingTotal)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
      <Pagination page={page} totalPages={totalPages} params={{ q }} />
    </div>
  )
}
