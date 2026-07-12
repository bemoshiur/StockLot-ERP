import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { challanTotals } from '@/lib/sales'
import { taka, shortDate, STATUS_STYLES, STATUS_LABELS } from '@/lib/format'

export default async function SalesPage() {
  const user = await requireCan('sales.read')
  const writable = can(user.role, 'sales.write')
  const challans = await db.salesChallan.findMany({
    orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
    include: { customer: true, lines: true, payments: true },
    take: 200,
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Sales" action={writable ? { href: '/sales/new', label: 'New sale' } : undefined} />
      {challans.length === 0 ? (
        <EmptyState message="No sales yet. Create your first challan to record a sale, compute profit, and track dues." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Challan</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Invoice</th>
                  <th className="px-4 py-3 text-right font-medium">Collected</th>
                  <th className="px-4 py-3 text-right font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {challans.map((c) => {
                  const t = challanTotals(
                    c.lines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice), unitCost: Number(l.unitCostSnapshot) })),
                    c.payments.map((p) => ({ amountCollected: Number(p.amountCollected), discountOrWaiver: Number(p.discountOrWaiver) })),
                  )
                  return (
                    <tr key={c.id} className="text-slate-900 dark:text-slate-100">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{shortDate(c.saleDate)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.challanNo ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{c.customer.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{taka(t.invoiceTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{taka(t.collectedTotal)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${t.dueTotal > 0 ? 'font-semibold text-red-600' : 'text-slate-400'}`}>{taka(t.dueTotal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/sales/${c.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Open</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
