import Link from 'next/link'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { shortDate, taka } from '@/lib/format'

const TAKE = 8

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser()
  const q = (await searchParams).q?.trim() ?? ''

  // Gate each result group by the SAME permission that gates its destination
  // page — otherwise search would both preview data and link to a page that
  // 403s. Note: `masters.read` is held by every role, so it must NOT be used here.
  const canCustomers = can(user.role, 'customers.write')
  const canStyles = can(user.role, 'styles.write')
  const canSuppliers = can(user.role, 'suppliers.write')
  const canSales = can(user.role, 'sales.read')

  type Hit = { href: string; title: string; subtitle?: string }
  const groups: { label: string; hits: Hit[] }[] = []

  if (q.length >= 2) {
    const contains = { contains: q, mode: 'insensitive' as const }

    const [customers, styles, suppliers, challans] = await Promise.all([
      canCustomers
        ? db.customer.findMany({ where: { OR: [{ name: contains }, { phone: { contains: q } }] }, take: TAKE, orderBy: { name: 'asc' } })
        : Promise.resolve([]),
      canStyles
        ? db.productStyle.findMany({ where: { OR: [{ styleName: contains }, { styleCode: { contains: q } }] }, take: TAKE, orderBy: { styleName: 'asc' } })
        : Promise.resolve([]),
      canSuppliers
        ? db.supplier.findMany({ where: { name: contains }, take: TAKE, orderBy: { name: 'asc' } })
        : Promise.resolve([]),
      canSales
        ? db.salesChallan.findMany({
            where: { OR: [{ challanNo: { contains: q } }, { customer: { name: contains } }] },
            include: { customer: true },
            take: TAKE,
            orderBy: [{ saleDate: 'desc' }],
          })
        : Promise.resolve([]),
    ])

    if (customers.length)
      groups.push({ label: 'Customers', hits: customers.map((c) => ({ href: `/customers/${c.id}`, title: c.name, subtitle: c.phone ?? undefined })) })
    if (styles.length)
      groups.push({ label: 'Styles', hits: styles.map((s) => ({ href: `/styles/${s.id}`, title: s.styleName, subtitle: `${s.styleCode} · ${taka(Number(s.standardCost))}` })) })
    if (suppliers.length)
      groups.push({ label: 'Suppliers', hits: suppliers.map((s) => ({ href: `/suppliers/${s.id}`, title: s.name, subtitle: s.contactPhone ?? undefined })) })
    if (challans.length)
      groups.push({ label: 'Sales', hits: challans.map((c) => ({ href: `/sales/${c.id}`, title: `${c.customer.name}${c.challanNo ? ` · #${c.challanNo}` : ''}`, subtitle: shortDate(c.saleDate) })) })
  }

  const totalHits = groups.reduce((a, g) => a + g.hits.length, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={q ? `Search: “${q}”` : 'Search'} />

      {q.length < 2 ? (
        <EmptyState message="Type at least 2 characters to search customers, styles, suppliers, and sales." />
      ) : totalHits === 0 ? (
        <EmptyState message={`Nothing found for “${q}”.`} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{g.label}</h2>
              <Card>
                <ul className="divide-y divide-zinc-100">
                  {g.hits.map((h) => (
                    <li key={h.href}>
                      <Link href={h.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-zinc-50">
                        <span className="min-w-0 truncate font-medium text-zinc-900">{h.title}</span>
                        {h.subtitle && <span className="shrink-0 text-xs text-zinc-400">{h.subtitle}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
