'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit, diff } from '@/lib/audit'
import { supplierSchema } from '@/lib/validators/supplier'
import type { FormState } from '@/components/ui'

function parse(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get('name'),
    contactPhone: formData.get('contactPhone'),
    address: formData.get('address'),
    notes: formData.get('notes'),
  })
}

export async function createSupplier(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('suppliers.write')
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  try {
    const created = await db.supplier.create({
      data: { ...parsed.data, createdById: user.id, updatedById: user.id },
    })
    await writeAudit({ userId: user.id, entity: 'Supplier', entityId: created.id, action: 'CREATE' })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `Supplier "${parsed.data.name}" already exists` }
    throw e
  }
  revalidatePath('/suppliers')
  redirect('/suppliers')
}

export async function updateSupplier(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('suppliers.write')
  const id = String(formData.get('id'))
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const before = await db.supplier.findUnique({ where: { id } })
  if (!before) return { error: 'Supplier not found' }
  try {
    await db.supplier.update({
      where: { id },
      data: { ...parsed.data, updatedById: user.id },
    })
    await writeAudit({
      userId: user.id,
      entity: 'Supplier',
      entityId: id,
      action: 'UPDATE',
      changes: diff(before, parsed.data),
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `Supplier "${parsed.data.name}" already exists` }
    throw e
  }
  revalidatePath('/suppliers')
  redirect('/suppliers')
}
