import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { taka, shortDate } from '@/lib/format'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { ReportTabs } from '@/components/report-tabs'
import { buildCashBook, type CashEntry } from '@/lib/ledger'

export default async function CashbookPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireCan('reports.read')
  const sp = await searchParams

  const [saleMonths, expMonths, depMonths, capMonths, payMonths] = await Promise.all([
    db.salesChallan.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
    db.expense.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
    db.treasuryDeposit.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
    db.capitalMovement.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
    db.supplierPayment.findMany({ distinct: ['periodMonth'], select: { periodMonth: true } }),
  ])
  const months = [...new Set([...saleMonths, ...expMonths, ...depMonths, ...capMonths, ...payMonths].map((m) => m.periodMonth))]
    .sort()
    .reverse()
  const month = sp.month && months.includes(sp.month) ? sp.month : months[0]

  if (!month) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Reports" />
        <ReportTabs />
        <EmptyState message="No cash transactions recorded yet. The cash book fills in as you record collections, payments, expenses, and deposits." />
      </div>
    )
  }

  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))

  // Opening balance = net of every cash movement strictly before this month.
  const [
    payBefore, capInBefore, capOutBefore, otherBefore, depBefore, expBefore, supBefore,
  ] = await Promise.all([
    db.paymentReceipt.aggregate({ _sum: { amountCollected: true }, where: { receiptDate: { lt: start } } }),
    db.capitalMovement.aggregate({ _sum: { amount: true }, where: { date: { lt: start }, amount: { gt: 0 } } }),
    db.capitalMovement.aggregate({ _sum: { amount: true }, where: { date: { lt: start }, amount: { lt: 0 } } }),
    db.treasuryDeposit.aggregate({ _sum: { otherIncome: true }, where: { depositDate: { lt: start } } }),
    db.treasuryDeposit.aggregate({ _sum: { amount: true }, where: { depositDate: { lt: start } } }),
    db.expense.aggregate({ _sum: { paidAmount: true }, where: { expenseDate: { lt: start } } }),
    db.supplierPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { lt: start } } }),
  ])
  const opening =
    Number(payBefore._sum.amountCollected ?? 0) +
    Number(capInBefore._sum.amount ?? 0) +
    Number(capOutBefore._sum.amount ?? 0) + // already negative
    Number(otherBefore._sum.otherIncome ?? 0) -
    Number(depBefore._sum.amount ?? 0) -
    Number(expBefore._sum.paidAmount ?? 0) -
    Number(supBefore._sum.amount ?? 0)

  // This month's movements.
  const [payments, capital, deposits, expenses, supplierPayments] = await Promise.all([
    db.paymentReceipt.findMany({
      where: { receiptDate: { gte: start, lt: end } },
      include: { challan: { include: { customer: true } } },
    }),
    db.capitalMovement.findMany({ where: { date: { gte: start, lt: end } }, include: { partner: true } }),
    db.treasuryDeposit.findMany({ where: { depositDate: { gte: start, lt: end } }, include: { payer: true } }),
    db.expense.findMany({ where: { expenseDate: { gte: start, lt: end } }, include: { category: true } }),
    db.supplierPayment.findMany({ where: { paymentDate: { gte: start, lt: end } }, include: { supplier: true } }),
  ])

  const entries: CashEntry[] = []
  for (const p of payments) {
    entries.push({ date: p.receiptDate, description: `Collection — ${p.challan.customer.name}`, category: 'Collection', direction: 'IN', amount: Number(p.amountCollected) })
  }
  for (const c of capital) {
    const amt = Number(c.amount)
    entries.push(
      amt >= 0
        ? { date: c.date, description: `Capital — ${c.partner.name}`, category: 'Capital in', direction: 'IN', amount: amt }
        : { date: c.date, description: `Capital withdrawal — ${c.partner.name}`, category: 'Capital out', direction: 'OUT', amount: Math.abs(amt) },
    )
  }
  for (const d of deposits) {
    const other = Number(d.otherIncome)
    if (other > 0) entries.push({ date: d.depositDate, description: `Other income${d.payer ? ` — ${d.payer.name}` : ''}`, category: 'Other income', direction: 'IN', amount: other })
    const amt = Number(d.amount)
    if (amt > 0) entries.push({ date: d.depositDate, description: `Deposit to ${d.destination}`, category: 'Deposit', direction: 'OUT', amount: amt })
  }
  for (const e of expenses) {
    const paid = Number(e.paidAmount)
    if (paid > 0) entries.push({ date: e.expenseDate, description: `${e.category.name}${e.payeeOrVendor ? ` — ${e.payeeOrVendor}` : ''}`, category: 'Expense', direction: 'OUT', amount: paid })
  }
  for (const s of supplierPayments) {
    entries.push({ date: s.paymentDate, description: `Supplier — ${s.supplier.name}`, category: 'Supplier payment', direction: 'OUT', amount: Number(s.amount) })
  }

  const cb = buildCashBook(entries, opening)
  const fmtMonth = (mo: string) => new Date(mo + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Reports" />
      <ReportTabs />

      <div className="flex flex-wrap gap-2">
        {months.map((mo) => (
          <Link
            key={mo}
            href={`/reports/cashbook?month=${mo}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mo === month ? 'bg-primary text-white' : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {fmtMonth(mo)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Opening balance" value={taka(opening)} />
        <Stat label="Received" value={taka(cb.totalIn)} tone="green" />
        <Stat label="Paid" value={taka(cb.totalOut)} tone="red" />
        <Stat label="Closing balance" value={taka(cb.closing)} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">Cash book — {fmtMonth(month)}</h2>
        <Card>
          {cb.rows.length === 0 ? (
            <div className="p-5 text-sm text-zinc-400">No cash movements this month. Closing balance carries the opening balance.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">In</th>
                    <th className="px-4 py-3 text-right font-medium">Out</th>
                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr className="text-zinc-400">
                    <td className="px-4 py-2.5" colSpan={4}>Opening balance</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{taka(opening)}</td>
                  </tr>
                  {cb.rows.map((r, i) => (
                    <tr key={i} className="text-zinc-900">
                      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-500">{shortDate(r.date)}</td>
                      <td className="px-4 py-2.5">{r.description}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-green-700">{r.direction === 'IN' ? taka(r.amount) : ''}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-600">{r.direction === 'OUT' ? taka(r.amount) : ''}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{taka(r.balance)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-zinc-200 font-semibold">
                    <td className="px-4 py-2.5" colSpan={2}>Closing balance</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-green-700">{taka(cb.totalIn)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-600">{taka(cb.totalOut)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{taka(cb.closing)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="mt-2 text-xs text-zinc-400">
          Operational cash: collections, capital and other income in; supplier payments, expenses paid, capital withdrawals and Alib deposits out.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-600' : 'text-zinc-900'
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  )
}
