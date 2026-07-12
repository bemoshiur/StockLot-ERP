import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { LocationForm } from '../location-form'
import { createLocation } from '../actions'

export default async function NewLocationPage() {
  await requireCan('locations.write')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New location" />
      <LocationForm action={createLocation} submitLabel="Create location" />
    </div>
  )
}
