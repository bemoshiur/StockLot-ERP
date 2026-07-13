'use client'

import { useActionState } from 'react'
import { Field, TextInput, Select, FormError, type FormState } from '@/components/ui'
import { DEPOSIT_METHODS } from '@/lib/validators/treasury'
import { addDeposit } from './actions'

export function DepositForm({ partners, today }: { partners: { id: string; name: string }[]; today: string }) {
  const [state, formAction, pending] = useActionState(addDeposit, undefined)
  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paid by (partner)" name="payerPartnerId">
          <Select id="payerPartnerId" name="payerPartnerId" defaultValue="">
            <option value="">—</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Method" name="method">
          <Select id="method" name="method" defaultValue="cash">
            {DEPOSIT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount deposited to Alib (BDT)" name="amount">
          <TextInput id="amount" name="amount" type="number" min="0" step="0.01" defaultValue="0" required />
        </Field>
        <Field label="Other income (BDT)" name="otherIncome" hint="Non-sale income banked with this deposit, if any.">
          <TextInput id="otherIncome" name="otherIncome" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field label="Date" name="depositDate">
          <TextInput id="depositDate" name="depositDate" type="date" defaultValue={today} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Remarks" name="remarks">
            <TextInput id="remarks" name="remarks" />
          </Field>
        </div>
      </div>
      <FormError error={state?.error} />
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
        {pending ? 'Saving…' : 'Record deposit'}
      </button>
    </form>
  )
}
