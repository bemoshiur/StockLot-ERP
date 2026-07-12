'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field, TextInput, FormError, Card, type FormState } from '@/components/ui'

type LocationValues = {
  id?: string
  areaName?: string
  marketOrShop?: string | null
}

export function LocationForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  values?: LocationValues
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <Card>
      <form action={formAction} className="space-y-4 p-5">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Area name" name="areaName">
            <TextInput id="areaName" name="areaName" defaultValue={values.areaName ?? ''} required />
          </Field>
          <Field label="Market / shop" name="marketOrShop">
            <TextInput id="marketOrShop" name="marketOrShop" defaultValue={values.marketOrShop ?? ''} />
          </Field>
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
            href="/locations"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  )
}
