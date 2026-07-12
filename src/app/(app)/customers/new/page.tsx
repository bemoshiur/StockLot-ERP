import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { CustomerForm } from '../customer-form'
import { createCustomer } from '../actions'

export default async function NewCustomerPage() {
  await requireCan('customers.write')
  const locations = await db.location.findMany({ orderBy: { areaName: 'asc' } })
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New customer" />
      <CustomerForm action={createCustomer} submitLabel="Create customer" locations={locations} />
    </div>
  )
}
