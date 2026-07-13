'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field, TextInput, Select, Textarea, Checkbox, FormError, Card, type FormState } from '@/components/ui'

type ExpenseValues = {
  id?: string
  categoryId?: string
  expenseDate?: string
  payeeOrVendor?: string | null
  detail?: string | null
  amount?: string | number
  paidAmount?: string | number
  isAdvance?: boolean
  remarks?: string | null
}

export function ExpenseForm({
  action,
  categories,
  values = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  categories: { id: string; name: string }[]
  values?: ExpenseValues
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <Card>
      <form action={formAction} className="space-y-4 p-5">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" name="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={values.categoryId ?? ''} required>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date" name="expenseDate">
            <TextInput id="expenseDate" name="expenseDate" type="date" defaultValue={values.expenseDate ?? ''} required />
          </Field>
          <Field label="Payee / vendor" name="payeeOrVendor">
            <TextInput id="payeeOrVendor" name="payeeOrVendor" defaultValue={values.payeeOrVendor ?? ''} placeholder="Who was paid" />
          </Field>
          <Field label="Detail" name="detail">
            <TextInput id="detail" name="detail" defaultValue={values.detail ?? ''} placeholder="What it was for" />
          </Field>
          <Field label="Amount billed (BDT)" name="amount">
            <TextInput
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.amount != null ? String(values.amount) : '0'}
              required
            />
          </Field>
          <Field label="Amount paid (BDT)" name="paidAmount">
            <TextInput
              id="paidAmount"
              name="paidAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.paidAmount != null ? String(values.paidAmount) : '0'}
              required
            />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <Checkbox
              name="isAdvance"
              label="Advance (prepayment — excluded from operating expense)"
              defaultChecked={values.isAdvance}
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Remarks" name="remarks">
              <Textarea id="remarks" name="remarks" rows={2} defaultValue={values.remarks ?? ''} />
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
            href="/expenses"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  )
}
