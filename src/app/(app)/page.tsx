import Link from 'next/link'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { ROLE_LABELS } from '@/lib/enums'
import { NAV_ITEMS } from '@/lib/nav'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion'

export default async function DashboardPage() {
  const user = await requireUser()
  const [styles, customers, receivedAgg, soldAgg, salesCount] = await Promise.all([
    db.productStyle.count({ where: { active: true } }),
    db.customer.count({ where: { active: true } }),
    db.receiptLine.aggregate({ _sum: { quantity: true } }),
    db.saleLine.aggregate({ _sum: { quantity: true } }),
    db.salesChallan.count(),
  ])
  const netStock = (receivedAgg._sum.quantity ?? 0) - (soldAgg._sum.quantity ?? 0)

  const stats = [
    { label: 'Sales challans', value: salesCount.toLocaleString('en-US') },
    { label: 'Net stock (pcs)', value: netStock.toLocaleString('en-US') },
    { label: 'Active styles', value: styles.toLocaleString('en-US') },
    { label: 'Customers', value: customers.toLocaleString('en-US') },
  ]

  const quickLinks = NAV_ITEMS.filter((i) => i.href !== '/' && (!i.action || can(user.role, i.action)))

  return (
    <div className="mx-auto max-w-5xl">
      <FadeIn className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Signed in as {ROLE_LABELS[user.role]}</p>
      </FadeIn>

      <Stagger className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <StaggerItem
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
          </StaggerItem>
        ))}
      </Stagger>

      <FadeIn delay={0.15}>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Go to</h2>
      </FadeIn>
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <StaggerItem key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <span className="font-medium text-slate-900 dark:text-white">{link.label}</span>
              <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600">
                →
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
