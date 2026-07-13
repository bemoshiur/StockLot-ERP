'use client'

import { useActionState } from 'react'
import { Field, TextInput, Select, Textarea, FormError, type FormState } from '@/components/ui'
import { PAYMENT_METHODS } from '@/lib/validators/supplierPayment'
import { addSupplierPayment } from './actions'

export function PaymentForm({
  suppliers,
  today,
}: {
  suppliers: { id: string; name: string }[]
  today: string
}) {
  const [state, formAction, pending] = useActionState(addSupplierPayment, undefined)
  const saved = state !== undefined && !state.error

  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier" name="supplierId">
          <Select id="supplierId" name="supplierId" defaultValue="" required>
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (BDT)" name="amount">
          <TextInput id="amount" name="amount" type="number" step="0.01" min="0" defaultValue="0" required />
        </Field>
        <Field label="Method" name="method">
          <Select id="method" name="method" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date" name="paymentDate">
          <TextInput id="paymentDate" name="paymentDate" type="date" defaultValue={today} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" name="notes">
            <Textarea id="notes" name="notes" rows={2} />
          </Field>
        </div>
      </div>

      <FormError error={state?.error} />
      {saved && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Saved
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {pending ? 'Saving…' : 'Record payment'}
      </button>
    </form>
  )
}
