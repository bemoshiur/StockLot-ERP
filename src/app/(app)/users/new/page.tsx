import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { UserForm } from '../user-form'
import { createUser } from '../actions'

export default async function NewUserPage() {
  await requireCan('users.manage')
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New user" />
      <UserForm action={createUser} mode="create" submitLabel="Create user" />
    </div>
  )
}
