'use client'

import { useActionState } from 'react'
import { Field, TextInput, Select, FormError, type FormState } from '@/components/ui'
import { PAYMENT_METHODS } from '@/lib/validators/payment'
import { recordPayment } from './actions'

export function PaymentForm({ challanId, today }: { challanId: string; today: string }) {
  const action = recordPayment.bind(null, challanId) as (
    prev: FormState,
    formData: FormData,
  ) => Promise<FormState>
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount collected (BDT)" name="amountCollected">
          <TextInput id="amountCollected" name="amountCollected" type="number" min="0" step="0.01" defaultValue="0" required />
        </Field>
        <Field label="Discount / waiver (BDT)" name="discountOrWaiver" hint="Rounded-off amount — kept separate from the real due.">
          <TextInput id="discountOrWaiver" name="discountOrWaiver" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field label="Method" name="method">
          <Select id="method" name="method" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date" name="receiptDate">
          <TextInput id="receiptDate" name="receiptDate" type="date" defaultValue={today} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" name="notes">
            <TextInput id="notes" name="notes" />
          </Field>
        </div>
      </div>
      <FormError error={state?.error} />
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
        {pending ? 'Saving…' : 'Record payment'}
      </button>
    </form>
  )
}
