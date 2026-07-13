import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { taka, shortDate } from '@/lib/format'
import { PaymentForm } from './payment-form'

export default async function PayablesPage() {
  const user = await requireCan('payables.read')
  const canWrite = can(user.role, 'payables.write')
  const today = new Date().toISOString().slice(0, 10)

  const [suppliers, recentPayments] = await Promise.all([
    db.supplier.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        receipts: { select: { billAmount: true } },
        payments: { select: { amount: true } },
      },
    }),
    db.supplierPayment.findMany({
      include: { supplier: true },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    }),
  ])

  const rows = suppliers
    .map((s) => {
      const billed =
        s.receipts.reduce((a, r) => a + Number(r.billAmount), 0) + Number(s.openingPayableBalance)
      const paid = s.payments.reduce((a, p) => a + Number(p.amount), 0)
      return { id: s.id, name: s.name, billed, paid, outstanding: billed - paid }
    })
    .sort((a, b) => b.outstanding - a.outstanding)

  const totalBilled = rows.reduce((a, r) => a + r.billed, 0)
  const totalPaid = rows.reduce((a, r) => a + r.paid, 0)
  const totalOutstanding = totalBilled - totalPaid

  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Accounts Payable" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total billed" value={taka(totalBilled)} />
        <Stat label="Total paid" value={taka(totalPaid)} />
        <Stat label="Total outstanding" value={taka(totalOutstanding)} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">By supplier</h2>
        <Card>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No active suppliers yet." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                    <th className="px-5 py-2 font-medium">Supplier</th>
                    <th className="px-5 py-2 text-right font-medium">Billed</th>
                    <th className="px-5 py-2 text-right font-medium">Paid</th>
                    <th className="px-5 py-2 text-right font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2 text-slate-900 dark:text-slate-100">{r.name}</td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">{taka(r.billed)}</td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">{taka(r.paid)}</td>
                      <td
                        className={`px-5 py-2 text-right tabular-nums font-medium ${
                          r.outstanding > 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {taka(r.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {canWrite && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Record supplier payment</h2>
          <Card>
            <PaymentForm suppliers={supplierOptions} today={today} />
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent payments</h2>
        <Card>
          {recentPayments.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No payments recorded yet." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="text-slate-500">{shortDate(p.paymentDate)} · {p.supplier.name} · {p.method}</span>
                  <span className="tabular-nums text-slate-900 dark:text-slate-100">{taka(Number(p.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  )
}
