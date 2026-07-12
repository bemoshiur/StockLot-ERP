'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field, TextInput, Textarea, FormError, Card, type FormState } from '@/components/ui'

type SupplierValues = {
  id?: string
  name?: string
  contactPhone?: string | null
  address?: string | null
  notes?: string | null
}

export function SupplierForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  values?: SupplierValues
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <Card>
      <form action={formAction} className="space-y-4 p-5">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier name" name="name">
            <TextInput id="name" name="name" defaultValue={values.name ?? ''} required />
          </Field>
          <Field label="Contact phone" name="contactPhone">
            <TextInput id="contactPhone" name="contactPhone" defaultValue={values.contactPhone ?? ''} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" name="address">
              <Textarea id="address" name="address" rows={2} defaultValue={values.address ?? ''} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes" name="notes">
              <Textarea id="notes" name="notes" rows={3} defaultValue={values.notes ?? ''} />
            </Field>
          </div>
        </div>

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
            href="/suppliers"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  )
}
