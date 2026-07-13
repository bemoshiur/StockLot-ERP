import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'
import { SearchBar, Pagination, parseListParams, PAGE_SIZE } from '@/components/list-controls'
import type { Prisma } from '@prisma/client'

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireCan('suppliers.write')
  const writable = can(user.role, 'suppliers.write')
  const sp = await searchParams
  const { q, page } = parseListParams(sp)

  const where: Prisma.SupplierWhereInput = q ? { name: { contains: q, mode: 'insensitive' } } : {}

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.supplier.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Suppliers" action={writable ? { href: '/suppliers/new', label: 'New supplier' } : undefined} />
      <div className="mb-4">
        <SearchBar q={q} placeholder="Search suppliers…" />
      </div>
      {suppliers.length === 0 ? (
        <EmptyState message="No suppliers yet. Add your first supplier to start tracking purchases." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suppliers.map((s) => (
                  <tr key={s.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.contactPhone ?? '—'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">{s.address ?? '—'}</td>
                    <td className="px-4 py-3"><Badge active={s.active} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/suppliers/${s.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
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
