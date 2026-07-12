'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field, TextInput, Select, FormError, Card, type FormState } from '@/components/ui'

type CustomerValues = {
  id?: string
  name?: string
  phone?: string | null
  defaultLocationId?: string | null
  creditTerms?: string | null
  openingDueBalance?: string | number
}

export function CustomerForm({
  action,
  values = {},
  submitLabel,
  locations,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  values?: CustomerValues
  submitLabel: string
  locations: { id: string; areaName: string; marketOrShop: string | null }[]
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <Card>
      <form action={formAction} className="space-y-4 p-5">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" name="name">
            <TextInput id="name" name="name" defaultValue={values.name ?? ''} required />
          </Field>
          <Field label="Phone" name="phone">
            <TextInput id="phone" name="phone" defaultValue={values.phone ?? ''} />
          </Field>
          <Field label="Default location" name="defaultLocationId">
            <Select id="defaultLocationId" name="defaultLocationId" defaultValue={values.defaultLocationId ?? ''}>
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.marketOrShop ? `${l.areaName} — ${l.marketOrShop}` : l.areaName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Credit terms" name="creditTerms">
            <TextInput id="creditTerms" name="creditTerms" defaultValue={values.creditTerms ?? ''} placeholder="e.g. Net 30, Cash" />
          </Field>
          <Field label="Opening due (BDT)" name="openingDueBalance" hint="Outstanding balance carried forward.">
            <TextInput
              id="openingDueBalance"
              name="openingDueBalance"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.openingDueBalance != null ? String(values.openingDueBalance) : '0'}
              required
            />
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
            href="/customers"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  )
}
