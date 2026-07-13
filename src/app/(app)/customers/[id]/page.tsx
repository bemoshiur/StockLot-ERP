import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { CustomerForm } from '../customer-form'
import { updateCustomer } from '../actions'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCan('customers.write')
  const { id } = await params
  const customer = await db.customer.findUnique({ where: { id } })
  if (!customer) notFound()

  const locations = await db.location.findMany({ orderBy: { areaName: 'asc' } })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Edit: ${customer.name}`}
        secondary={
          <a
            href={`/documents/statement/${customer.id}`}
            target="_blank"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Statement
          </a>
        }
      />
      <CustomerForm
        action={updateCustomer}
        submitLabel="Save changes"
        locations={locations}
        values={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          defaultLocationId: customer.defaultLocationId,
          creditTerms: customer.creditTerms,
          openingDueBalance: customer.openingDueBalance.toString(),
        }}
      />
    </div>
  )
}
