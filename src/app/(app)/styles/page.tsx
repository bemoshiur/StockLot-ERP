import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { can } from '@/lib/rbac'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'

export default async function StylesPage() {
  const user = await requireCan('styles.write')
  const writable = can(user.role, 'styles.write')
  const styles = await db.productStyle.findMany({
    orderBy: [{ active: 'desc' }, { styleName: 'asc' }],
    include: { _count: { select: { aliases: true } } },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Styles"
        action={writable ? { href: '/styles/new', label: 'New style' } : undefined}
        secondary={
          <>
            {writable && (
              <Link
                href="/styles/reconcile"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reconcile
              </Link>
            )}
            <a
              href="/api/export/styles"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Export CSV
            </a>
          </>
        }
      />
      {styles.length === 0 ? (
        <EmptyState message="No styles yet. Add your first garment style to start tracking stock and profit." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Std cost</th>
                  <th className="px-4 py-3 font-medium">Aliases</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {styles.map((s) => (
                  <tr key={s.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 font-mono text-xs">{s.styleCode}</td>
                    <td className="px-4 py-3 font-medium">
                      {s.styleName}
                      {s.isBulkLot && <span className="ml-2 text-xs text-amber-600">bulk</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.genderAgeGroup ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ৳{Number(s.standardCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s._count.aliases}</td>
                    <td className="px-4 py-3"><Badge active={s.active} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/styles/${s.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
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
