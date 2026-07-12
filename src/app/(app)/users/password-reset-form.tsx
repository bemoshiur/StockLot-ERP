'use client'

import { useActionState } from 'react'
import { Field, TextInput, FormError, Card, type FormState } from '@/components/ui'
import { resetPassword } from './actions'

export function PasswordResetForm({ userId }: { userId: string }) {
  const action = resetPassword.bind(null, userId) as (
    prev: FormState,
    formData: FormData,
  ) => Promise<FormState>
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <Card>
      <form action={formAction} className="flex items-end gap-2 p-5">
        <div className="flex-1">
          <Field label="New password" name="password" hint="At least 8 characters.">
            <TextInput id="password" name="password" type="text" required minLength={8} />
          </Field>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {pending ? 'Saving…' : 'Reset password'}
        </button>
      </form>
      {state?.error && (
        <div className="px-5 pb-4">
          <FormError error={state.error} />
        </div>
      )}
    </Card>
  )
}
