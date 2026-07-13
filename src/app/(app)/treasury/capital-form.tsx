'use client'

import { useActionState } from 'react'
import { Field, TextInput, Select, FormError, type FormState } from '@/components/ui'
import { MOVEMENT_TYPES } from '@/lib/validators/treasury'
import { addCapitalMovement } from './actions'

export function CapitalForm({ partners, today }: { partners: { id: string; name: string }[]; today: string }) {
  const [state, formAction, pending] = useActionState(addCapitalMovement, undefined)
  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Partner" name="partnerId">
          <Select id="partnerId" name="partnerId" required defaultValue="">
            <option value="" disabled>Select partner…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Type" name="movementType">
          <Select id="movementType" name="movementType" defaultValue="INVESTMENT">
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (BDT)" name="amount">
          <TextInput id="amount" name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
        <Field label="Date" name="date">
          <TextInput id="date" name="date" type="date" defaultValue={today} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" name="notes">
            <TextInput id="notes" name="notes" />
          </Field>
        </div>
      </div>
      <FormError error={state?.error} />
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
        {pending ? 'Saving…' : 'Record movement'}
      </button>
    </form>
  )
}
