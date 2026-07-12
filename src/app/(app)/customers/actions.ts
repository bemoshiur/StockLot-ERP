'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit, diff } from '@/lib/audit'
import { customerSchema } from '@/lib/validators/customer'
import type { FormState } from '@/components/ui'

function parse(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    defaultLocationId: formData.get('defaultLocationId'),
    creditTerms: formData.get('creditTerms'),
    openingDueBalance: formData.get('openingDueBalance'),
  })
}

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('customers.write')
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  try {
    const created = await db.customer.create({
      data: { ...parsed.data, createdById: user.id, updatedById: user.id },
    })
    await writeAudit({ userId: user.id, entity: 'Customer', entityId: created.id, action: 'CREATE' })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `Customer "${parsed.data.name}" already exists` }
    throw e
  }
  revalidatePath('/customers')
  redirect('/customers')
}

export async function updateCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('customers.write')
  const id = String(formData.get('id'))
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const before = await db.customer.findUnique({ where: { id } })
  if (!before) return { error: 'Customer not found' }
  try {
    const after = await db.customer.update({
      where: { id },
      data: { ...parsed.data, updatedById: user.id },
    })
    await writeAudit({
      userId: user.id,
      entity: 'Customer',
      entityId: id,
      action: 'UPDATE',
      changes: diff(
        { ...before, openingDueBalance: before.openingDueBalance.toString() },
        { ...parsed.data, openingDueBalance: String(after.openingDueBalance) },
      ),
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `Customer "${parsed.data.name}" already exists` }
    throw e
  }
  revalidatePath('/customers')
  redirect('/customers')
}
