import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'
import { SearchBar, Pagination, parseListParams, PAGE_SIZE } from '@/components/list-controls'
import type { Prisma } from '@prisma/client'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireCan('customers.write')
  const writable = can(user.role, 'customers.write')
  const sp = await searchParams
  const { q, page } = parseListParams(sp)

  const where: Prisma.CustomerWhereInput = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }
    : {}

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: { location: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.customer.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Customers"
        action={writable ? { href: '/customers/new', label: 'New customer' } : undefined}
        secondary={
          <a
            href="/api/export/customers"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Export CSV
          </a>
        }
      />
      <div className="mb-4">
        <SearchBar q={q} placeholder="Search customers…" />
      </div>
      {customers.length === 0 ? (
        <EmptyState message="No customers yet. Add your first customer to start tracking sales and dues." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 text-right font-medium">Opening due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => (
                  <tr key={c.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{c.location?.areaName ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ৳{Number(c.openingDueBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3"><Badge active={c.active} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/customers/${c.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                        {writable ? 'Edit' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Pagination page={page} totalPages={totalPages} params={{ q }} />
    </div>
  )
}
