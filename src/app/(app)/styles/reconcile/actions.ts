'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { writeAudit } from '@/lib/audit'
import type { FormState } from '@/components/ui'

export async function mergeStyles(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCan('styles.write')

  const sourceId = String(formData.get('sourceId') ?? '')
  const targetId = String(formData.get('targetId') ?? '')
  if (!sourceId || !targetId) return { error: 'Pick both a source and a target style.' }
  if (sourceId === targetId) return { error: 'Source and target must be different styles.' }

  const [source, target] = await Promise.all([
    db.productStyle.findUnique({ where: { id: sourceId } }),
    db.productStyle.findUnique({ where: { id: targetId } }),
  ])
  if (!source) return { error: 'Source style not found.' }
  if (!target) return { error: 'Target style not found.' }

  await db.$transaction(async (tx) => {
    // Reassign all movement from source to target.
    await tx.saleLine.updateMany({ where: { styleId: sourceId }, data: { styleId: targetId } })
    await tx.receiptLine.updateMany({ where: { styleId: sourceId }, data: { styleId: targetId } })

    // Move the source's aliases to the target. aliasText is unique, so drop any
    // source alias whose text already exists on the target before reassigning.
    const targetAliases = await tx.styleAlias.findMany({
      where: { styleId: targetId },
      select: { aliasText: true },
    })
    const targetTexts = new Set(targetAliases.map((a) => a.aliasText))
    const sourceAliases = await tx.styleAlias.findMany({
      where: { styleId: sourceId },
      select: { id: true, aliasText: true },
    })
    const collidingIds = sourceAliases.filter((a) => targetTexts.has(a.aliasText)).map((a) => a.id)
    if (collidingIds.length > 0) {
      await tx.styleAlias.deleteMany({ where: { id: { in: collidingIds } } })
    }
    await tx.styleAlias.updateMany({ where: { styleId: sourceId }, data: { styleId: targetId } })

    // Preserve the source style's name as an alias on the target, if not already present.
    if (!targetTexts.has(source.styleName)) {
      const existing = await tx.styleAlias.findUnique({ where: { aliasText: source.styleName } })
      if (!existing) {
        await tx.styleAlias.create({ data: { styleId: targetId, aliasText: source.styleName } })
      }
    }

    // Delete the now-empty source style.
    await tx.productStyle.delete({ where: { id: sourceId } })
  })

  await writeAudit({
    userId: user.id,
    entity: 'ProductStyle',
    entityId: targetId,
    action: 'UPDATE',
    changes: [{ field: 'merge', oldValue: source.styleName, newValue: target.styleName }],
  })

  revalidatePath('/styles')
  revalidatePath('/inventory/net-stock')
  revalidatePath('/styles/reconcile')
  return { error: undefined }
}
