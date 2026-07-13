import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { challanTotals } from '@/lib/sales'
import { aggregateStock } from '@/lib/inventory'
import { monthlyPnL, expensesTotal, expensesByCategory } from '@/lib/finance'
import { taka } from '@/lib/format'
import { PageHeader, Card, EmptyState } from '@/components/ui'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireCan('reports.read')
  const sp = await searchParams

  // Available months across sales + expenses.
  const [saleMonths, expMonths] = await Promise.all([
    db.salesChallan.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
    db.expense.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
  ])
  const months = [...new Set([...saleMonths, ...expMonths].map((m) => m.periodMonth))].sort().reverse()
  const month = sp.month && months.includes(sp.month) ? sp.month : months[0]

  if (!month) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Reports" />
        <EmptyState message="No sales or expenses recorded yet. Reports appear once you start entering transactions." />
      </div>
    )
  }

  const [challans, expenses, deposits, received, sold, styles] = await Promise.all([
    db.salesChallan.findMany({ where: { periodMonth: month }, include: { lines: true, payments: true } }),
    db.expense.findMany({ where: { periodMonth: month }, include: { category: true } }),
    db.treasuryDeposit.findMany({ where: { periodMonth: month } }),
    db.receiptLine.groupBy({ by: ['styleId'], _sum: { quantity: true } }),
    db.saleLine.groupBy({ by: ['styleId'], _sum: { quantity: true } }),
    db.productStyle.count({ where: { active: true } }),
  ])

  // Sales aggregation for the month.
  let qty = 0
  const totals = { invoiceTotal: 0, grossProfit: 0, collectedTotal: 0, discountTotal: 0, dueTotal: 0 }
  for (const c of challans) {
    qty += c.lines.reduce((a, l) => a + l.quantity, 0)
    const t = challanTotals(
      c.lines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice), unitCost: Number(l.unitCostSnapshot) })),
      c.payments.map((p) => ({ amountCollected: Number(p.amountCollected), discountOrWaiver: Number(p.discountOrWaiver) })),
    )
    totals.invoiceTotal += t.invoiceTotal
    totals.grossProfit += t.grossProfit
    totals.collectedTotal += t.collectedTotal
    totals.discountTotal += t.discountTotal
    totals.dueTotal += t.dueTotal
  }

  // Expenses.
  const expRows = expenses.map((e) => ({ categoryName: e.category.name, amount: Number(e.amount), isAdvance: e.isAdvance }))
  const totalExpense = expensesTotal(expRows)
  const byCategory = expensesByCategory(expRows)

  // Other income + P&L.
  const otherIncome = deposits.reduce((a, d) => a + Number(d.otherIncome), 0)
  const pnl = monthlyPnL({ grossProfit: totals.grossProfit, totalExpense, otherIncome })

  // Net stock (all-time position).
  const agg = aggregateStock(
    received.map((r) => ({ styleId: r.styleId, quantity: r._sum.quantity ?? 0 })),
    sold.map((s) => ({ styleId: s.styleId, quantity: s._sum.quantity ?? 0 })),
  )
  const netStock = [...agg.values()].reduce((a, v) => a + v.closing, 0)

  const fmtMonth = (m: string) => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Reports" />

      {/* Month selector */}
      <div className="flex flex-wrap gap-2">
        {months.map((m) => (
          <Link
            key={m}
            href={`/reports?month=${m}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              m === month
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {fmtMonth(m)}
          </Link>
        ))}
      </div>

      {/* Monthly P&L */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Profit & Loss — {fmtMonth(month)}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Gross profit" value={taka(totals.grossProfit)} tone="green" />
          <Stat label="Total expense" value={taka(totalExpense)} tone="red" />
          <Stat label="Net profit (before other)" value={taka(pnl.netProfitBeforeOther)} />
          <Stat label="Net profit" value={taka(pnl.netProfit)} tone="green" />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Gross profit is accrual-based (invoice − standard cost). Other income this month: {taka(otherIncome)}.
        </p>
      </div>

      {/* Sales summary */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Sales</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Quantity" value={qty.toLocaleString('en-US')} />
          <Stat label="Invoiced" value={taka(totals.invoiceTotal)} />
          <Stat label="Collected" value={taka(totals.collectedTotal)} />
          <Stat label="Discount" value={taka(totals.discountTotal)} />
          <Stat label="Due" value={taka(totals.dueTotal)} tone={totals.dueTotal > 0 ? 'red' : undefined} />
        </div>
      </div>

      {/* Expense by category */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Expenses by category</h2>
        <Card>
          {byCategory.size === 0 ? (
            <div className="p-5 text-sm text-slate-400">No expenses this month.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...byCategory.entries()].map(([name, amt]) => (
                  <tr key={name}>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">{taka(amt)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold dark:border-slate-800">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{taka(totalExpense)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Net stock (on hand)" value={netStock.toLocaleString('en-US') + ' pcs'} />
        <Stat label="Active styles" value={String(styles)} />
        <Stat label="Outstanding due (month)" value={taka(totals.dueTotal)} tone={totals.dueTotal > 0 ? 'red' : undefined} />
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-green-700 dark:text-green-400' : tone === 'red' ? 'text-red-600' : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  )
}
