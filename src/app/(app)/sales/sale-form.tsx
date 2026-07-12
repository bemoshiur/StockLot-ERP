'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Field, TextInput, Select, FormError, Card, type FormState } from '@/components/ui'
import { createSale } from './actions'

type StyleOpt = { id: string; styleCode: string; styleName: string; standardCost: number }
type Row = { styleId: string; quantity: string; unitPrice: string }

const money = (n: number) => '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function SaleForm({
  customers,
  locations,
  styles,
  today,
}: {
  customers: { id: string; name: string }[]
  locations: { id: string; areaName: string; marketOrShop: string | null }[]
  styles: StyleOpt[]
  today: string
}) {
  const [state, formAction, pending] = useActionState(createSale, undefined)
  const [rows, setRows] = useState<Row[]>([{ styleId: '', quantity: '', unitPrice: '' }])

  const costOf = (id: string) => styles.find((s) => s.id === id)?.standardCost ?? 0
  const num = (s: string) => (s === '' ? 0 : Number(s))

  const invoiceTotal = rows.reduce((a, r) => a + num(r.quantity) * num(r.unitPrice), 0)
  const profitTotal = rows.reduce((a, r) => a + num(r.quantity) * (num(r.unitPrice) - costOf(r.styleId)), 0)

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, { styleId: '', quantity: '', unitPrice: '' }])
  const removeRow = (i: number) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)))

  const linesJson = JSON.stringify(
    rows
      .filter((r) => r.styleId && r.quantity)
      .map((r) => ({ styleId: r.styleId, quantity: num(r.quantity), unitPrice: num(r.unitPrice) })),
  )

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="linesJson" value={linesJson} />
      <Card>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Customer" name="customerId">
            <Select id="customerId" name="customerId" required defaultValue="">
              <option value="" disabled>Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Sale date" name="saleDate">
            <TextInput id="saleDate" name="saleDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="Location" name="locationId">
            <Select id="locationId" name="locationId" defaultValue="">
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.areaName}{l.marketOrShop ? ` — ${l.marketOrShop}` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label="Challan no (optional)" name="challanNo">
            <TextInput id="challanNo" name="challanNo" placeholder="e.g. 417" />
          </Field>
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
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Items</h2>
            <button type="button" onClick={addRow} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => {
              const amount = num(r.quantity) * num(r.unitPrice)
              const cost = costOf(r.styleId)
              const profit = num(r.quantity) * (num(r.unitPrice) - cost)
              return (
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
                  <div className="col-span-4 sm:col-span-2">
                    <TextInput aria-label="Unit price" type="number" min="0" step="0.01" placeholder="Price" value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} />
                  </div>
                  <div className="col-span-3 sm:col-span-2 pb-2 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">
                    {money(amount)}
                    <div className="text-xs text-slate-400">P {money(profit)}</div>
                  </div>
                  <div className="col-span-1 pb-1 text-right">
                    <button type="button" aria-label="Remove line" onClick={() => removeRow(i)} className="text-red-600 hover:text-red-700">×</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end gap-8 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
            <div className="text-right">
              <div className="text-slate-500">Invoice total</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(invoiceTotal)}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">Gross profit</div>
              <div className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">{money(profitTotal)}</div>
            </div>
          </div>
        </div>
      </Card>

      <FormError error={state?.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
          {pending ? 'Saving…' : 'Create sale'}
        </button>
        <Link href="/sales" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
