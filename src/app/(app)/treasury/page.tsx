import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card } from '@/components/ui'
import { partnerBalance } from '@/lib/finance'
import { taka, shortDate } from '@/lib/format'
import { CapitalForm } from './capital-form'
import { DepositForm } from './deposit-form'

export default async function TreasuryPage() {
  const user = await requireCan('treasury.read')
  const canWrite = can(user.role, 'treasury.write')
  const today = new Date().toISOString().slice(0, 10)

  const [partners, movements, deposits] = await Promise.all([
    db.partner.findMany({ include: { capitalMovements: true }, orderBy: { name: 'asc' } }),
    db.capitalMovement.findMany({ include: { partner: true }, orderBy: { date: 'desc' }, take: 100 }),
    db.treasuryDeposit.findMany({ include: { payer: true }, orderBy: { depositDate: 'desc' }, take: 100 }),
  ])

  const partnerCards = partners.map((p) => ({
    name: p.name,
    balance: partnerBalance(Number(p.openingCapitalBalance), p.capitalMovements.map((m) => ({ amount: Number(m.amount) }))),
  }))

  const totalInvested = movements.filter((m) => Number(m.amount) > 0).reduce((a, m) => a + Number(m.amount), 0)
  const totalDeposited = deposits.reduce((a, d) => a + Number(d.amount), 0)
  const totalOtherIncome = deposits.reduce((a, d) => a + Number(d.otherIncome), 0)
  const partnerOptions = partners.map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Treasury & Partner Capital" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Capital invested" value={taka(totalInvested)} />
        <Stat label="Deposited to Alib" value={taka(totalDeposited)} />
        <Stat label="Other income" value={taka(totalOtherIncome)} />
        <Stat label="Partners" value={String(partners.length)} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Partner capital balances</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {partnerCards.map((p) => (
            <div key={p.name} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm text-slate-500">{p.name}</div>
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{taka(p.balance)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Capital movements</h2>
          <Card>
            {canWrite && <CapitalForm partners={partnerOptions} today={today} />}
            {movements.length > 0 && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-5 py-2 text-sm">
                    <span className="text-slate-500">{shortDate(m.date)} · {m.partner.name} · {m.movementType.toLowerCase()}</span>
                    <span className={`tabular-nums ${Number(m.amount) < 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>{taka(Number(m.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Deposits to Alib</h2>
          <Card>
            {canWrite && <DepositForm partners={partnerOptions} today={today} />}
            {deposits.length > 0 && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {deposits.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-2 text-sm">
                    <span className="text-slate-500">{shortDate(d.depositDate)} · {d.payer?.name ?? 'Cash'} · {d.method}</span>
                    <span className="tabular-nums text-slate-900 dark:text-slate-100">
                      {taka(Number(d.amount))}
                      {Number(d.otherIncome) > 0 && <span className="ml-2 text-xs text-slate-400">(+inc {taka(Number(d.otherIncome))})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
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
