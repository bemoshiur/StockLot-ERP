import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import type { Role } from '@/lib/enums'
import { can, type Action } from '@/lib/rbac'

export type SessionUser = { id: string; name: string; email: string; role: Role }

export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.role) redirect('/login')
  const u = session.user
  return { id: u.id ?? '', name: u.name ?? '', email: u.email ?? '', role: u.role as Role }
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/')
  return user
}

export async function requireCan(action: Action): Promise<SessionUser> {
  const user = await requireUser()
  if (!can(user.role, action)) redirect('/')
  return user
}
