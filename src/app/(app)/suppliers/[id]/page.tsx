import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { SupplierForm } from '../supplier-form'
import { updateSupplier } from '../actions'

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCan('suppliers.write')
  const { id } = await params
  const supplier = await db.supplier.findUnique({ where: { id } })
  if (!supplier) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Edit: ${supplier.name}`} />
      <SupplierForm
        action={updateSupplier}
        submitLabel="Save changes"
        values={{
          id: supplier.id,
          name: supplier.name,
          contactPhone: supplier.contactPhone,
          address: supplier.address,
          notes: supplier.notes,
        }}
      />
    </div>
  )
}
