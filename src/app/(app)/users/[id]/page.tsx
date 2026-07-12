import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireCan } from '@/lib/guards'
import { PageHeader } from '@/components/ui'
import { UserForm } from '../user-form'
import { PasswordResetForm } from '../password-reset-form'
import { updateUser } from '../actions'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCan('users.manage')
  const { id } = await params
  const user = await db.appUser.findUnique({ where: { id } })
  if (!user) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={`Edit: ${user.name}`} />
      <UserForm
        action={updateUser}
        mode="edit"
        submitLabel="Save changes"
        values={{ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active }}
      />
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Reset password</h2>
        <PasswordResetForm userId={user.id} />
      </div>
    </div>
  )
}
