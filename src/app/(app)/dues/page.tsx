import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { challanTotals } from '@/lib/sales'
import { agingBuckets } from '@/lib/aging'
import { taka } from '@/lib/format'

export default async function DuesPage() {
  await requireCan('sales.read')
  const asOf = new Date()

  const customers = await db.customer.findMany({
    where: { active: true },
    include: { challans: { include: { lines: true, payments: true } } },
  })

  const rows = customers
    .map((cust) => {
      const opening = Number(cust.openingDueBalance)
      const challanDues = cust.challans.map((c) => ({
        saleDate: c.saleDate,
        due: challanTotals(
          c.lines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice), unitCost: Number(l.unitCostSnapshot) })),
          c.payments.map((p) => ({ amountCollected: Number(p.amountCollected), discountOrWaiver: Number(p.discountOrWaiver) })),
        ).dueTotal,
      }))
      const agingItems = [...challanDues]
      if (opening > 0) agingItems.push({ saleDate: new Date(0), due: opening })
      const buckets = agingBuckets(agingItems, asOf)
      return { id: cust.id, name: cust.name, buckets }
    })
    .filter((r) => r.buckets.total > 0)
    .sort((a, b) => b.buckets.total - a.buckets.total)

  const grand = rows.reduce(
    (a, r) => ({
      current: a.current + r.buckets.current,
      d1_30: a.d1_30 + r.buckets.d1_30,
      d31_60: a.d31_60 + r.buckets.d31_60,
      d60plus: a.d60plus + r.buckets.d60plus,
      total: a.total + r.buckets.total,
    }),
    { current: 0, d1_30: 0, d31_60: 0, d60plus: 0, total: 0 },
  )

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Dues (Accounts Receivable)" />
      {rows.length === 0 ? (
        <EmptyState message="No outstanding dues. Every customer is settled." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Current</th>
                  <th className="px-4 py-3 text-right font-medium">1–30d</th>
                  <th className="px-4 py-3 text-right font-medium">31–60d</th>
                  <th className="px-4 py-3 text-right font-medium">60d+</th>
                  <th className="px-4 py-3 text-right font-medium">Total due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/customers/${r.id}`} className="hover:underline">{r.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{taka(r.buckets.current)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{taka(r.buckets.d1_30)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{taka(r.buckets.d31_60)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">{taka(r.buckets.d60plus)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600">{taka(r.buckets.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 font-semibold dark:border-slate-800">
                <tr>
                  <td className="px-4 py-3">All customers</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(grand.current)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(grand.d1_30)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(grand.d31_60)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(grand.d60plus)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">{taka(grand.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
