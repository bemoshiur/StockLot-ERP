'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Field, TextInput, Select, Checkbox, FormError, Card, type FormState } from '@/components/ui'
import { createReceipt } from './actions'

type StyleOpt = { id: string; styleCode: string; styleName: string }
type Row = { styleId: string; quantity: string; subCategoryNote: string }

export function ReceiptForm({
  suppliers,
  styles,
  today,
}: {
  suppliers: { id: string; name: string }[]
  styles: StyleOpt[]
  today: string
}) {
  const [state, formAction, pending] = useActionState(createReceipt, undefined)
  const [rows, setRows] = useState<Row[]>([{ styleId: '', quantity: '', subCategoryNote: '' }])

  const num = (s: string) => (s === '' ? 0 : Number(s))
  const totalQty = rows.reduce((a, r) => a + num(r.quantity), 0)

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, { styleId: '', quantity: '', subCategoryNote: '' }])
  const removeRow = (i: number) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)))

  const linesJson = JSON.stringify(
    rows
      .filter((r) => r.styleId && r.quantity)
      .map((r) => ({ styleId: r.styleId, quantity: num(r.quantity), subCategoryNote: r.subCategoryNote || undefined })),
  )

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="linesJson" value={linesJson} />
      <Card>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Supplier" name="supplierId">
            <Select id="supplierId" name="supplierId" defaultValue="">
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Receipt date" name="receiptDate">
            <TextInput id="receiptDate" name="receiptDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="Bill amount (BDT)" name="billAmount">
            <TextInput id="billAmount" name="billAmount" type="number" step="0.01" min="0" defaultValue="0" />
          </Field>
          <Field label="Challan no (optional)" name="challanNo">
            <TextInput id="challanNo" name="challanNo" placeholder="e.g. 25597" />
          </Field>
          <div className="flex items-end">
            <Checkbox name="isOpeningStock" label="Opening / carried-forward stock" />
          </div>
          <div className="sm:col-span-2">
            <Field label="Remarks" name="remarks">
              <TextInput id="remarks" name="remarks" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Items received</h2>
            <button type="button" onClick={addRow} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 sm:col-span-5">
                  <Select aria-label="Style" value={r.styleId} onChange={(e) => setRow(i, { styleId: e.target.value })}>
                    <option value="">Select style…</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.id}>{s.styleName} ({s.styleCode})</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <TextInput aria-label="Quantity" type="number" min="1" placeholder="Qty" value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <TextInput aria-label="Note" placeholder="Note (optional)" value={r.subCategoryNote} onChange={(e) => setRow(i, { subCategoryNote: e.target.value })} />
                </div>
                <div className="col-span-2 sm:col-span-1 pb-1 text-right">
                  <button type="button" aria-label="Remove line" onClick={() => removeRow(i)} className="text-red-600 hover:text-red-700">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
            <div className="text-right">
              <div className="text-slate-500">Total quantity</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{totalQty.toLocaleString('en-US')}</div>
            </div>
          </div>
        </div>
      </Card>

      <FormError error={state?.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
          {pending ? 'Saving…' : 'Save receipt'}
        </button>
        <Link href="/inventory" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
