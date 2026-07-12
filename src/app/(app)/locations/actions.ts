'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit, diff } from '@/lib/audit'
import { locationSchema } from '@/lib/validators/location'
import type { FormState } from '@/components/ui'

function parse(formData: FormData) {
  return locationSchema.safeParse({
    areaName: formData.get('areaName'),
    marketOrShop: formData.get('marketOrShop'),
  })
}

export async function createLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('locations.write')
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  try {
    const created = await db.location.create({
      data: { ...parsed.data, createdById: user.id, updatedById: user.id },
    })
    await writeAudit({ userId: user.id, entity: 'Location', entityId: created.id, action: 'CREATE' })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `Location "${parsed.data.areaName}" already exists` }
    throw e
  }
  revalidatePath('/locations')
  redirect('/locations')
}

export async function updateLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('locations.write')
  const id = String(formData.get('id'))
  const parsed = parse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const before = await db.location.findUnique({ where: { id } })
  if (!before) return { error: 'Location not found' }
  try {
    const after = await db.location.update({
      where: { id },
      data: { ...parsed.data, updatedById: user.id },
    })
    await writeAudit({
      userId: user.id,
      entity: 'Location',
      entityId: id,
      action: 'UPDATE',
      changes: diff(before, after),
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { error: `Location "${parsed.data.areaName}" already exists` }
    throw e
  }
  revalidatePath('/locations')
  redirect('/locations')
}
