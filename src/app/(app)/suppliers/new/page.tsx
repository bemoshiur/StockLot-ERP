import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { SupplierForm } from '../supplier-form'
import { createSupplier } from '../actions'

export default async function NewSupplierPage() {
  await requireCan('suppliers.write')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New supplier" />
      <SupplierForm action={createSupplier} submitLabel="Create supplier" />
    </div>
  )
}
