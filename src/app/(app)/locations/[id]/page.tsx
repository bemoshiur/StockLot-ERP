import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { LocationForm } from '../location-form'
import { updateLocation } from '../actions'

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCan('locations.write')
  const { id } = await params
  const location = await db.location.findUnique({ where: { id } })
  if (!location) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Edit: ${location.areaName}`} />
      <LocationForm
        action={updateLocation}
        submitLabel="Save changes"
        values={{
          id: location.id,
          areaName: location.areaName,
          marketOrShop: location.marketOrShop,
        }}
      />
    </div>
  )
}
