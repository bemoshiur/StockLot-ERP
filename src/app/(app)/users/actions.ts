'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit, diff } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { userCreateSchema, userUpdateSchema, passwordResetSchema } from '@/lib/validators/user'
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
  if (before.role === 'OWNER' && actor.role !== 'OWNER')
    return { error: 'Only an Owner can edit an Owner account' }
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
