import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { challanTotals } from '@/lib/sales'
import { activeChallanFilter } from '@/lib/queries'
import { taka, shortDate } from '@/lib/format'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { AreaChart } from '@/components/area-chart'
import { BarList } from '@/components/bar-list'

const fmtMonth = (m: string) => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireCan('reports.read')
  const sp = await searchParams

  const monthsRaw = await db.salesChallan.findMany({
    where: activeChallanFilter,
    distinct: ['periodMonth'],
    select: { periodMonth: true },
  })
  const months = [...new Set(monthsRaw.map((m) => m.periodMonth))].sort().reverse()
  const month = sp.month && months.includes(sp.month) ? sp.month : months[0]

  if (!month) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="Analytics" />
        <EmptyState message="No sales recorded yet. Analytics appear once you start dispatching challans." />
      </div>
    )
  }

  const challans = await db.salesChallan.findMany({
    where: { periodMonth: month, ...activeChallanFilter },
    include: { customer: true, location: true, lines: { include: { style: true } }, payments: true },
  })

  // Aggregations.
  const styleQty = new Map<string, number>()
  const styleRevenue = new Map<string, number>()
  const customerRevenue = new Map<string, number>()
  const locationRevenue = new Map<string, number>()
  const dayRevenue = new Map<string, number>()

  const totals = { invoiced: 0, collected: 0, due: 0, quantity: 0, grossProfit: 0 }

  for (const c of challans) {
    for (const l of c.lines) {
      styleQty.set(l.style.styleName, (styleQty.get(l.style.styleName) ?? 0) + l.quantity)
      styleRevenue.set(l.style.styleName, (styleRevenue.get(l.style.styleName) ?? 0) + Number(l.lineAmount))
      totals.quantity += l.quantity
    }

    const t = challanTotals(
      c.lines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice), unitCost: Number(l.unitCostSnapshot) })),
      c.payments.map((p) => ({ amountCollected: Number(p.amountCollected), discountOrWaiver: Number(p.discountOrWaiver) })),
    )
    totals.invoiced += t.invoiceTotal
    totals.collected += t.collectedTotal
    totals.due += t.dueTotal
    totals.grossProfit += t.grossProfit

    customerRevenue.set(c.customer.name, (customerRevenue.get(c.customer.name) ?? 0) + t.invoiceTotal)

    const areaName = c.location?.areaName ?? '—'
    locationRevenue.set(areaName, (locationRevenue.get(areaName) ?? 0) + t.invoiceTotal)

    const day = c.saleDate.toISOString().slice(0, 10)
    dayRevenue.set(day, (dayRevenue.get(day) ?? 0) + t.invoiceTotal)
  }

  const toBarList = (m: Map<string, number>, limit = 8) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, value]) => ({ label, value }))

  const topStylesQty = toBarList(styleQty)
  const topStylesRevenue = toBarList(styleRevenue)
  const topCustomers = toBarList(customerRevenue)
  const byLocation = toBarList(locationRevenue, 12)

  const dailyData = [...dayRevenue.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, value]) => ({ label: shortDate(new Date(day)), value }))

  const kpis = [
    { label: 'Total invoiced', value: taka(totals.invoiced), grad: 'from-[#006FEE] to-[#0059c9]' },
    { label: 'Total collected', value: taka(totals.collected), grad: 'from-[#12a150] to-[#0b7a3c]' },
    { label: 'Total due', value: taka(totals.due), grad: 'from-[#f31260] to-[#c30b4a]' },
    { label: 'Quantity', value: totals.quantity.toLocaleString('en-US') + ' pcs', grad: 'from-[#7828c8] to-[#5b1e9b]' },
    { label: 'Gross profit', value: taka(totals.grossProfit), grad: 'from-[#f5a524] to-[#d98a0b]' },
  ]

  const empty = challans.length === 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Analytics" />

      {/* Month selector */}
      <div className="flex flex-wrap gap-2">
        {months.map((m) => (
          <Link
            key={m}
            href={`/analytics?month=${m}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              m === month
                ? 'bg-primary text-white'
                : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {fmtMonth(m)}
          </Link>
        ))}
      </div>

      {empty ? (
        <EmptyState message={`No sales recorded for ${fmtMonth(month)}.`} />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className={`overflow-hidden rounded-2xl bg-gradient-to-br ${k.grad} p-5 text-white shadow-sm`}>
                <div className="text-xl font-bold tabular-nums">{k.value}</div>
                <div className="mt-1 text-sm text-white/80">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Ranking grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold text-zinc-900">Top styles by quantity</h2>
              </div>
              <BarList data={topStylesQty} valueFormatter={(n) => n.toLocaleString('en-US') + ' pcs'} />
            </Card>

            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold text-zinc-900">Top styles by revenue</h2>
              </div>
              <BarList data={topStylesRevenue} valueFormatter={taka} />
            </Card>

            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold text-zinc-900">Top customers</h2>
              </div>
              <BarList data={topCustomers} valueFormatter={taka} />
            </Card>

            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold text-zinc-900">Sales by location</h2>
              </div>
              <BarList data={byLocation} valueFormatter={taka} />
            </Card>
          </div>

          {/* Daily revenue */}
          <Card>
            <div className="p-5 pb-0">
              <h2 className="text-sm font-semibold text-zinc-900">Daily revenue</h2>
              <p className="text-xs text-zinc-400">Invoiced revenue per day · {fmtMonth(month)}</p>
            </div>
            <div className="px-2 pb-3 pt-2">
              <AreaChart data={dailyData} valuePrefix="৳" />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
