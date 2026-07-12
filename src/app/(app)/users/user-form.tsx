'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field, TextInput, Select, Checkbox, FormError, Card, type FormState } from '@/components/ui'
import { ROLES, ROLE_LABELS } from '@/lib/enums'

type UserValues = {
  id?: string
  name?: string
  email?: string
  role?: string
  active?: boolean
}

export function UserForm({
  action,
  mode,
  values = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  mode: 'create' | 'edit'
  values?: UserValues
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <Card>
      <form action={formAction} className="space-y-4 p-5">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <Field label="Full name" name="name">
          <TextInput id="name" name="name" defaultValue={values.name ?? ''} required />
        </Field>
        <Field label="Email" name="email">
          <TextInput id="email" name="email" type="email" defaultValue={values.email ?? ''} required />
        </Field>
        <Field label="Role" name="role">
          <Select id="role" name="role" defaultValue={values.role ?? 'SALES'} required>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </Field>
        {mode === 'create' && (
          <Field label="Temporary password" name="password" hint="At least 8 characters. The user can change it later.">
            <TextInput id="password" name="password" type="text" required minLength={8} />
          </Field>
        )}
        {mode === 'edit' && (
          <Checkbox name="active" label="Active (can sign in)" defaultChecked={values.active ?? true} />
        )}

        <FormError error={state?.error} />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {pending ? 'Saving…' : submitLabel}
          </button>
          <Link
            href="/users"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  )
}
