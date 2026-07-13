import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { aggregateStock } from '@/lib/inventory'

export default async function NetStockPage() {
  await requireCan('inventory.read')

  const [received, sold] = await Promise.all([
    db.receiptLine.groupBy({ by: ['styleId'], _sum: { quantity: true } }),
    db.saleLine.groupBy({ by: ['styleId'], _sum: { quantity: true } }),
  ])

  const agg = aggregateStock(
    received.map((r) => ({ styleId: r.styleId, quantity: r._sum.quantity ?? 0 })),
    sold.map((s) => ({ styleId: s.styleId, quantity: s._sum.quantity ?? 0 })),
  )

  // Include every active style PLUS any style that has movement even if inactive,
  // so the total and negative-stock alerts never silently drop stock.
  const movedIds = [...agg.keys()]
  const styles = await db.productStyle.findMany({
    where: { OR: [{ active: true }, { id: { in: movedIds } }] },
    select: { id: true, styleCode: true, styleName: true, isBulkLot: true, active: true },
  })

  const rows = styles
    .map((s) => {
      const a = agg.get(s.id) ?? { received: 0, sold: 0, closing: 0, negative: false }
      return { ...s, ...a }
    })
    .sort((x, y) => y.closing - x.closing)

  const totalClosing = rows.reduce((a, r) => a + r.closing, 0)
  const negatives = rows.filter((r) => r.negative)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Net stock"
        action={{ href: '/inventory', label: '← Receipts' }}
        secondary={
          <>
            <Link
              href="/styles/reconcile"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reconcile
            </Link>
            <a
              href="/api/export/netstock"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Export CSV
            </a>
          </>
        }
      />

      {styles.length === 0 ? (
        <EmptyState message="No styles yet." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Total on hand" value={totalClosing.toLocaleString('en-US') + ' pcs'} />
            <Stat label="Styles tracked" value={String(rows.length)} />
            <Stat label="Negative-stock styles" value={String(negatives.length)} warn={negatives.length > 0} />
          </div>

          {negatives.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <strong>{negatives.length} style{negatives.length > 1 ? 's' : ''} sold more than received.</strong>{' '}
              This means a sale was recorded for stock never received (or a style-name mismatch) — check{' '}
              {negatives.map((n) => n.styleName).join(', ')}.
            </div>
          )}

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
                  {rows.map((r) => (
                    <tr key={r.id} className={r.negative ? 'bg-red-50/60 dark:bg-red-950/30' : ''}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <Link href={`/styles/${r.id}`} className="hover:underline">{r.styleName}</Link>
                        {r.isBulkLot && <span className="ml-2 text-xs text-amber-600">bulk</span>}
                        {!r.active && <span className="ml-2 text-xs text-slate-400">inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{r.received.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{r.sold.toLocaleString('en-US')}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${r.negative ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                        {r.closing.toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={`text-2xl font-bold tabular-nums ${warn ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  )
}
