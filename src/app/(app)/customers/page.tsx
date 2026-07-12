import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'

export default async function CustomersPage() {
  const user = await requireCan('masters.read')
  const writable = can(user.role, 'customers.write')
  const customers = await db.customer.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: { location: true },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Customers" action={writable ? { href: '/customers/new', label: 'New customer' } : undefined} />
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
    </div>
  )
}
