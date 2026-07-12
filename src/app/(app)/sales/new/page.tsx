import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader, EmptyState } from '@/components/ui'
import { SaleForm } from '../sale-form'

export default async function NewSalePage() {
  await requireCan('sales.write')
  const [customers, locations, styles] = await Promise.all([
    db.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.location.findMany({ orderBy: { areaName: 'asc' }, select: { id: true, areaName: true, marketOrShop: true } }),
    db.productStyle.findMany({
      where: { active: true },
      orderBy: { styleName: 'asc' },
      select: { id: true, styleCode: true, styleName: true, standardCost: true },
    }),
  ])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New sale" />
      {customers.length === 0 || styles.length === 0 ? (
        <EmptyState message="Add at least one customer and one style before creating a sale." />
      ) : (
        <SaleForm
          customers={customers}
          locations={locations}
          styles={styles.map((s) => ({ ...s, standardCost: Number(s.standardCost) }))}
          today={today}
        />
      )}
    </div>
  )
}
