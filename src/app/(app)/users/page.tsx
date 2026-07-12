import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { ROLE_LABELS, type Role } from '@/lib/enums'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'

export default async function UsersPage() {
  await requireCan('users.manage')
  const users = await db.appUser.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Users" action={{ href: '/users/new', label: 'New user' }} />
      {users.length === 0 ? (
        <EmptyState message="No users yet." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="text-slate-900 dark:text-slate-100">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500">{ROLE_LABELS[u.role as Role] ?? u.role}</td>
                    <td className="px-4 py-3"><Badge active={u.active} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/users/${u.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                        Edit
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
