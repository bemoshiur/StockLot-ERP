import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { challanTotals } from '@/lib/sales'
import { agingBuckets } from '@/lib/aging'
import { taka, shortDate } from '@/lib/format'
import { PrintButton } from '../../../print-button'

const PARTICULARS: Record<string, string> = {
  INVOICE: 'Invoice',
  PAYMENT: 'Payment',
  WAIVER: 'Discount/Waiver',
  OPENING: 'Opening balance',
}

export default async function StatementDocumentPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  await requireCan('sales.read')
  const { customerId } = await params

  const [customer, settings, entries] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId } }),
    db.companySettings.findUnique({ where: { id: 'singleton' } }),
    db.receivableEntry.findMany({ where: { customerId }, orderBy: { entryDate: 'asc' } }),
  ])
  if (!customer) notFound()

  // Map challanId -> challanNo for invoice references.
  const challanIds = [...new Set(entries.map((e) => e.challanId).filter((x): x is string => !!x))]
  const refChallans = challanIds.length
    ? await db.salesChallan.findMany({
        where: { id: { in: challanIds } },
        select: { id: true, challanNo: true },
      })
    : []
  const challanNoById = new Map(refChallans.map((c) => [c.id, c.challanNo]))

  // Aging over unpaid challans (same approach as the dues page).
  const asOf = new Date()
  const openingDue = Number(customer.openingDueBalance)
  const challans = await db.salesChallan.findMany({
    where: { customerId },
    include: { lines: true, payments: true },
  })
  const agingItems = challans.map((c) => ({
    saleDate: c.saleDate,
    due: challanTotals(
      c.lines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice), unitCost: Number(l.unitCostSnapshot) })),
      c.payments.map((p) => ({ amountCollected: Number(p.amountCollected), discountOrWaiver: Number(p.discountOrWaiver) })),
    ).dueTotal,
  }))
  if (openingDue > 0) agingItems.push({ saleDate: new Date(0), due: openingDue })
  const aging = agingBuckets(agingItems, asOf)

  // Running-balance ledger.
  let balance = openingDue
  const rows = entries.map((e) => {
    const amount = Number(e.amount)
    balance += amount
    const label =
      e.entryType === 'INVOICE'
        ? `Invoice #${challanNoById.get(e.challanId ?? '') ?? '—'}`
        : PARTICULARS[e.entryType] ?? e.entryType
    return {
      id: e.id,
      date: e.entryDate,
      label,
      debit: amount > 0 ? amount : 0,
      credit: amount < 0 ? -amount : 0,
      balance,
    }
  })

  const totalInvoiced = entries
    .filter((e) => e.entryType === 'INVOICE')
    .reduce((a, e) => a + Number(e.amount), 0)
  const totalPaid = entries
    .filter((e) => e.entryType === 'PAYMENT')
    .reduce((a, e) => a - Number(e.amount), 0)
  const totalDiscount = entries
    .filter((e) => e.entryType === 'WAIVER')
    .reduce((a, e) => a - Number(e.amount), 0)
  const closingBalance = balance

  return (
    <div className="text-black">
      <div className="mb-4 flex justify-end">
        <PrintButton />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-5">
          <div>
            <div className="text-3xl font-bold tracking-tight">{settings?.name ?? 'StockLot ERP'}</div>
            {settings?.address && <div className="mt-1 text-sm text-slate-600">{settings.address}</div>}
            {(settings?.phone || settings?.email) && (
              <div className="text-sm text-slate-600">
                {[settings.phone, settings.email].filter(Boolean).join(' · ')}
              </div>
            )}
            {settings?.tinBin && <div className="text-sm text-slate-600">TIN / BIN: {settings.tinBin}</div>}
            {!settings?.address && !settings?.phone && !settings?.email && (
              <div className="mt-1 text-sm text-slate-600">Wholesale operations</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">Account Statement</div>
            <div className="mt-1 text-sm text-slate-600">as of {shortDate(asOf)}</div>
          </div>
        </div>

        {/* Customer */}
        <div className="py-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statement for</div>
          <div className="mt-1 text-base font-semibold">{customer.name}</div>
          {customer.phone && <div className="text-sm text-slate-600">{customer.phone}</div>}
        </div>

        {/* Ledger */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-left text-slate-600">
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 px-3 font-medium">Particulars</th>
              <th className="py-2 px-3 text-right font-medium">Debit</th>
              <th className="py-2 px-3 text-right font-medium">Credit</th>
              <th className="py-2 pl-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-2 pr-3 text-slate-500">—</td>
              <td className="py-2 px-3 font-medium">Opening balance</td>
              <td className="py-2 px-3 text-right tabular-nums">—</td>
              <td className="py-2 px-3 text-right tabular-nums">—</td>
              <td className="py-2 pl-3 text-right tabular-nums">{taka(openingDue)}</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-200">
                <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{shortDate(r.date)}</td>
                <td className="py-2 px-3 font-medium">{r.label}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.debit ? taka(r.debit) : '—'}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.credit ? taka(r.credit) : '—'}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{taka(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total invoiced</span>
              <span className="tabular-nums font-medium">{taka(totalInvoiced)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total paid</span>
              <span className="tabular-nums">{taka(totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total discount</span>
              <span className="tabular-nums">{taka(totalDiscount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold">
              <span>Closing balance</span>
              <span className="tabular-nums">{taka(closingBalance)}</span>
            </div>
          </div>
        </div>

        {/* Aging */}
        <div className="mt-6 border-t border-slate-300 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aging of outstanding due</div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div className="flex justify-between sm:flex-col sm:justify-start">
              <span className="text-slate-600">Current</span>
              <span className="tabular-nums">{taka(aging.current)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:justify-start">
              <span className="text-slate-600">1–30d</span>
              <span className="tabular-nums">{taka(aging.d1_30)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:justify-start">
              <span className="text-slate-600">31–60d</span>
              <span className="tabular-nums">{taka(aging.d31_60)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:justify-start">
              <span className="text-slate-600">60d+</span>
              <span className="tabular-nums">{taka(aging.d60plus)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-300 pt-4 text-center text-sm text-slate-600">
          {settings?.footerNote ?? 'Thank you for your business.'}
        </div>
      </div>
    </div>
  )
}
