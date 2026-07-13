import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { taka } from '@/lib/format'
import { PageHeader, Card } from '@/components/ui'
import { ReportTabs } from '@/components/report-tabs'
import { activeChallanFilter, computeNetStockAgg } from '@/lib/queries'
import { financialPosition } from '@/lib/ledger'

export default async function BalanceSheetPage() {
  await requireCan('reports.read')

  const [
    collections, capitalAgg, capitalOpening, otherIncomeAgg, depositAgg, expensesPaidAgg,
    supplierPaidAgg, openingDuesAgg, invoicedActive, collectedActive, discountActive,
    grossProfitActive, opexAgg, openingPayableAgg, billedAgg, returnCreditAgg, netStockAgg, styles,
  ] = await Promise.all([
    db.paymentReceipt.aggregate({ _sum: { amountCollected: true } }),
    db.capitalMovement.aggregate({ _sum: { amount: true } }),
    db.partner.aggregate({ _sum: { openingCapitalBalance: true } }),
    db.treasuryDeposit.aggregate({ _sum: { otherIncome: true } }),
    db.treasuryDeposit.aggregate({ _sum: { amount: true } }),
    db.expense.aggregate({ _sum: { paidAmount: true } }),
    db.supplierPayment.aggregate({ _sum: { amount: true } }),
    db.customer.aggregate({ _sum: { openingDueBalance: true }, where: { active: true } }),
    db.saleLine.aggregate({ _sum: { lineAmount: true }, where: { challan: activeChallanFilter } }),
    db.paymentReceipt.aggregate({ _sum: { amountCollected: true }, where: { challan: activeChallanFilter } }),
    db.paymentReceipt.aggregate({ _sum: { discountOrWaiver: true }, where: { challan: activeChallanFilter } }),
    db.saleLine.aggregate({ _sum: { lineGrossProfit: true }, where: { challan: activeChallanFilter } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { isAdvance: false } }),
    db.supplier.aggregate({ _sum: { openingPayableBalance: true } }),
    db.purchaseReceipt.aggregate({ _sum: { billAmount: true } }),
    db.purchaseReturn.aggregate({ _sum: { creditAmount: true } }),
    computeNetStockAgg(),
    db.productStyle.findMany({
      where: { OR: [{ active: true }, { standardCost: { gt: 0 } }] },
      select: { id: true, standardCost: true },
    }),
  ])

  // Operational cash & bank.
  const capitalNet = Number(capitalAgg._sum.amount ?? 0)
  const deposits = Number(depositAgg._sum.amount ?? 0)
  const otherIncome = Number(otherIncomeAgg._sum.otherIncome ?? 0)
  const cash =
    Number(collections._sum.amountCollected ?? 0) +
    capitalNet +
    otherIncome -
    deposits -
    Number(expensesPaidAgg._sum.paidAmount ?? 0) -
    Number(supplierPaidAgg._sum.amount ?? 0)

  // Accounts receivable (opening + active invoices − collections − discounts).
  const receivables =
    Number(openingDuesAgg._sum.openingDueBalance ?? 0) +
    Number(invoicedActive._sum.lineAmount ?? 0) -
    Number(collectedActive._sum.amountCollected ?? 0) -
    Number(discountActive._sum.discountOrWaiver ?? 0)

  // Accounts payable (opening + billed − paid − return credits).
  const payables =
    Number(openingPayableAgg._sum.openingPayableBalance ?? 0) +
    Number(billedAgg._sum.billAmount ?? 0) -
    Number(supplierPaidAgg._sum.amount ?? 0) -
    Number(returnCreditAgg._sum.creditAmount ?? 0)

  // Inventory at standard cost (matches the valuation report).
  const costById = new Map(styles.map((s) => [s.id, Number(s.standardCost)]))
  let inventoryAtCost = 0
  for (const [id, a] of netStockAgg) inventoryAtCost += a.closing * (costById.get(id) ?? 0)

  // Equity.
  const capital = Number(capitalOpening._sum.openingCapitalBalance ?? 0) + capitalNet
  const retainedEarnings =
    Number(grossProfitActive._sum.lineGrossProfit ?? 0) - Number(opexAgg._sum.amount ?? 0) + otherIncome

  const fp = financialPosition({ cash, treasury: deposits, receivables, inventoryAtCost, payables, capital, retainedEarnings })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Reports" />
      <ReportTabs />

      <h2 className="text-sm font-semibold text-zinc-700">Statement of financial position — as of today</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold text-zinc-700">Assets</div>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-zinc-100">
              <Row label="Cash & bank" value={cash} />
              <Row label="Treasury (Alib)" value={deposits} />
              <Row label="Accounts receivable" value={receivables} />
              <Row label="Inventory (at cost)" value={inventoryAtCost} />
              <Row label="Total assets" value={fp.totalAssets} strong />
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-zinc-700">Liabilities & equity</div>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-zinc-100">
              <Row label="Accounts payable" value={payables} />
              <Row label="Partner capital" value={capital} />
              <Row label="Retained earnings" value={retainedEarnings} />
              {fp.unreconciled !== 0 && <Row label="Unreconciled opening balances" value={fp.unreconciled} muted />}
              <Row label="Total liabilities & equity" value={fp.totalLiabilities + capital + retainedEarnings + fp.unreconciled} strong />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total assets" value={taka(fp.totalAssets)} />
        <Stat label="Total liabilities" value={taka(fp.totalLiabilities)} tone="red" />
        <Stat label="Net worth (equity)" value={taka(fp.netWorth)} tone="green" />
      </div>

      <p className="text-xs text-zinc-400">
        Derived from live transactions on a standard-cost basis. Net worth = total assets − total liabilities and is always exact.
        Because opening receivable, payable and capital balances predate the system, any difference between net worth and
        (capital + retained earnings) is shown as “unreconciled opening balances” rather than forced to zero.
      </p>
    </div>
  )
}

function Row({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <tr className={strong ? 'border-t border-zinc-200 font-semibold text-zinc-900' : muted ? 'text-zinc-400' : 'text-zinc-600'}>
      <td className="py-2.5">{label}</td>
      <td className="py-2.5 text-right tabular-nums text-zinc-900">{taka(value)}</td>
    </tr>
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
