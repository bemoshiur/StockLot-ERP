'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit, diff } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { userCreateSchema, userUpdateSchema, passwordResetSchema } from '@/lib/validators/user'
import { canAssignRole, canModifyUser } from '@/lib/user-policy'
import type { Role } from '@/lib/enums'
import type { FormState } from '@/components/ui'

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireCan('users.manage')
  const parsed = userCreateSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  // Only an OWNER may create an OWNER account (prevent privilege escalation by an Admin).
  if (!canAssignRole(actor.role, parsed.data.role))
    return { error: 'Only an Owner can create an Owner account' }
  try {
    const created = await db.appUser.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash: await hashPassword(parsed.data.password),
      },
    })
    await writeAudit({ userId: actor.id, entity: 'AppUser', entityId: created.id, action: 'CREATE' })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `A user with email "${parsed.data.email}" already exists` }
    throw e
  }
  revalidatePath('/users')
  redirect('/users')
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireCan('users.manage')
  const id = String(formData.get('id'))
  const parsed = userUpdateSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    active: formData.get('active') === 'on',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const before = await db.appUser.findUnique({ where: { id } })
  if (!before) return { error: 'User not found' }

  // Only an OWNER may edit another OWNER account.
  if (!canModifyUser(actor.role, before.role as Role))
    return { error: 'Only an Owner can edit an Owner account' }
  // Only an OWNER may grant the OWNER role (prevent privilege escalation).
  if (!canAssignRole(actor.role, parsed.data.role))
    return { error: 'Only an Owner can grant the Owner role' }
  // A user cannot change their own role.
  if (id === actor.id && parsed.data.role !== before.role)
    return { error: 'You cannot change your own role' }
  // A user cannot deactivate their own account.
  if (id === actor.id && !parsed.data.active)
    return { error: 'You cannot deactivate your own account' }

  try {
    await db.appUser.update({
      where: { id },
      data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, active: parsed.data.active },
    })
    await writeAudit({
      userId: actor.id,
      entity: 'AppUser',
      entityId: id,
      action: 'UPDATE',
      changes: diff(
        { name: before.name, email: before.email, role: before.role, active: before.active },
        parsed.data,
      ),
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `A user with email "${parsed.data.email}" already exists` }
    throw e
  }
  revalidatePath('/users')
  redirect('/users')
}

export async function resetPassword(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireCan('users.manage')
  const parsed = passwordResetSchema.safeParse({ password: formData.get('password') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid password' }
  const target = await db.appUser.findUnique({ where: { id } })
  if (!target) return { error: 'User not found' }
  // Only an OWNER may reset an OWNER's password (prevent account takeover).
  if (!canModifyUser(actor.role, target.role as Role))
    return { error: 'Only an Owner can reset an Owner password' }
  await db.appUser.update({ where: { id }, data: { passwordHash: await hashPassword(parsed.data.password) } })
  await writeAudit({
    userId: actor.id,
    entity: 'AppUser',
    entityId: id,
    action: 'UPDATE',
    changes: [{ field: 'password', oldValue: null, newValue: '(reset)' }],
  })
  revalidatePath('/users')
  redirect('/users')
}
