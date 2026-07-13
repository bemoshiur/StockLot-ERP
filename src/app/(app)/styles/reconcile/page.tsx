import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { aggregateStock } from '@/lib/inventory'
import { MergeForm } from './merge-form'

export default async function ReconcileStylesPage() {
  await requireCan('styles.write')

  const [received, sold, styles] = await Promise.all([
    db.receiptLine.groupBy({ by: ['styleId'], _sum: { quantity: true } }),
    db.saleLine.groupBy({ by: ['styleId'], _sum: { quantity: true } }),
    db.productStyle.findMany({
      where: { active: true },
      select: { id: true, styleCode: true, styleName: true },
      orderBy: { styleName: 'asc' },
    }),
  ])

  const agg = aggregateStock(
    received.map((r) => ({ styleId: r.styleId, quantity: r._sum.quantity ?? 0 })),
    sold.map((s) => ({ styleId: s.styleId, quantity: s._sum.quantity ?? 0 })),
  )

  const options = styles
    .map((s) => {
      const onHand = (agg.get(s.id) ?? { closing: 0 }).closing
      return { id: s.id, styleName: s.styleName, label: `${s.styleName} (${s.styleCode}) — onHand ${onHand}` }
    })
    .sort((a, b) => a.styleName.localeCompare(b.styleName))

  const candidates = styles
    .map((s) => {
      const a = agg.get(s.id) ?? { received: 0, sold: 0, closing: 0, negative: false }
      return { ...s, ...a }
    })
    .filter((s) => s.negative)
    .sort((a, b) => a.closing - b.closing)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Reconcile styles" />
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Merge a duplicate/variant style into the correct one; its sales, receipts and aliases move over and
        net stock corrects.
      </p>

      <MergeForm styles={options.map((o) => ({ id: o.id, label: o.label }))} />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Likely merge candidates (negative on-hand)
      </h2>
      {candidates.length === 0 ? (
        <EmptyState message="No styles are showing negative on-hand." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Style</th>
                  <th className="px-4 py-3 text-right font-medium">Received</th>
                  <th className="px-4 py-3 text-right font-medium">Sold</th>
                  <th className="px-4 py-3 text-right font-medium">On hand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {candidates.map((c) => (
                  <tr key={c.id} className="bg-red-50/60 dark:bg-red-950/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {c.styleName}
                      <span className="ml-2 font-mono text-xs text-slate-400">{c.styleCode}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{c.received.toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{c.sold.toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600">
                      {c.closing.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
