import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, EmptyState } from '@/components/ui'

export default async function LocationsPage() {
  const user = await requireCan('masters.read')
  const writable = can(user.role, 'locations.write')
  const locations = await db.location.findMany({
    orderBy: { areaName: 'asc' },
    include: { _count: { select: { customers: true } } },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Locations" action={writable ? { href: '/locations/new', label: 'New location' } : undefined} />
      {locations.length === 0 ? (
        <EmptyState message="No locations yet. Add your first area or market to organize customers." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Market / shop</th>
                  <th className="px-4 py-3 font-medium">Customers</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {locations.map((l) => (
                  <tr key={l.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 font-medium">{l.areaName}</td>
                    <td className="px-4 py-3 text-slate-500">{l.marketOrShop ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{l._count.customers}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/locations/${l.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
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
