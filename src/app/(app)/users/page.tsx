import Link from 'next/link'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { ROLE_LABELS, type Role } from '@/lib/enums'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'
import { SearchBar, Pagination, parseListParams, PAGE_SIZE } from '@/components/list-controls'
import type { Prisma } from '@prisma/client'

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireCan('users.manage')
  const sp = await searchParams
  const { q, page } = parseListParams(sp)

  const where: Prisma.AppUserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
    : {}

  const [users, total] = await Promise.all([
    db.appUser.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.appUser.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Users" action={{ href: '/users/new', label: 'New user' }} />
      <div className="mb-4">
        <SearchBar q={q} placeholder="Search users…" />
      </div>
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
      <Pagination page={page} totalPages={totalPages} params={{ q }} />
    </div>
  )
}
