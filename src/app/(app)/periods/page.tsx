import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { closePeriod, reopenPeriod } from './actions'

export default async function PeriodsPage() {
  await requireCan('periods.manage')

  const [salesMonths, expenseMonths, depositMonths, capitalMonths, purchaseMonths, periods] =
    await Promise.all([
      db.salesChallan.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
      db.expense.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
      db.treasuryDeposit.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
      db.capitalMovement.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
      db.purchaseReceipt.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
      db.period.findMany(),
    ])

  const months = Array.from(
    new Set(
      [salesMonths, expenseMonths, depositMonths, capitalMonths, purchaseMonths]
        .flat()
        .map((r) => r.periodMonth),
    ),
  ).sort((a, b) => b.localeCompare(a))

  const byMonth = new Map(periods.map((p) => [p.month, p]))

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Periods" />
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Closing a month blocks any new or edited sales, expenses, purchases and treasury entries
        dated in it. Reopen to make corrections.
      </p>

      {months.length === 0 ? (
        <EmptyState message="No activity yet. Months appear here once sales, expenses, purchases or treasury entries are recorded." />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {months.map((month) => {
              const closed = byMonth.get(month)?.status === 'CLOSED'
              const label = new Date(month + '-01').toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })
              return (
                <li key={month} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
                    <StatusBadge closed={closed} />
                  </div>
                  {closed ? (
                    <form action={reopenPeriod.bind(null, month)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Reopen
                      </button>
                    </form>
                  ) : (
                    <form action={closePeriod.bind(null, month)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Close month
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ closed }: { closed: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        closed
          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
      }`}
    >
      {closed ? 'Closed' : 'Open'}
    </span>
  )
}
