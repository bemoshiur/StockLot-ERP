import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { computeNetStockAgg } from '@/lib/queries'
import { taka } from '@/lib/format'

export default async function StockValuationPage() {
  await requireCan('inventory.read')

  const agg = await computeNetStockAgg()

  // Include every active style PLUS any style that has movement even if inactive,
  // so the total valuation never silently drops stock.
  const movedIds = [...agg.keys()]
  const styles = await db.productStyle.findMany({
    where: { OR: [{ active: true }, { id: { in: movedIds } }] },
    select: { id: true, styleCode: true, styleName: true, standardCost: true },
  })

  const rows = styles
    .map((s) => {
      const a = agg.get(s.id) ?? { received: 0, sold: 0, returned: 0, closing: 0, negative: false }
      const unitCost = Number(s.standardCost)
      return { ...s, closing: a.closing, unitCost, value: a.closing * unitCost }
    })
    .sort((x, y) => y.value - x.value)

  const totalUnits = rows.reduce((a, r) => a + r.closing, 0)
  const totalValue = rows.reduce((a, r) => a + r.value, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Stock valuation"
        secondary={
          <Link
            href="/inventory"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            ← Net stock
          </Link>
        }
      />

      <p className="mb-5 text-sm text-zinc-500">Valued at each style&apos;s standard cost.</p>

      {styles.length === 0 ? (
        <EmptyState message="No styles to value yet." />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold tabular-nums text-zinc-900">{totalUnits.toLocaleString('en-US')}</div>
              <div className="mt-1 text-sm text-zinc-500">Total units on hand</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className={`text-2xl font-bold tabular-nums ${totalValue < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                {taka(totalValue)}
              </div>
              <div className="mt-1 text-sm text-zinc-500">Total inventory value</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold tabular-nums text-zinc-900">{rows.length.toLocaleString('en-US')}</div>
              <div className="mt-1 text-sm text-zinc-500">Styles valued</div>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Style</th>
                    <th className="px-4 py-3 text-right font-medium">On hand</th>
                    <th className="px-4 py-3 text-right font-medium">Unit cost</th>
                    <th className="px-4 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        <Link href={`/styles/${r.id}`} className="hover:underline">
                          {r.styleName}
                        </Link>
                        <span className="ml-2 text-xs text-zinc-400">{r.styleCode}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                        {r.closing.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{taka(r.unitCost)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          r.value < 0 ? 'text-red-600' : 'text-zinc-900'
                        }`}
                      >
                        {taka(r.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200 font-semibold text-zinc-900">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totalUnits.toLocaleString('en-US')}</td>
                    <td className="px-4 py-3" />
                    <td className={`px-4 py-3 text-right tabular-nums ${totalValue < 0 ? 'text-red-600' : ''}`}>
                      {taka(totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
