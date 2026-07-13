'use client'

import { useActionState } from 'react'
import { Field, Select, FormError, Card } from '@/components/ui'
import { mergeStyles } from './actions'

export function MergeForm({ styles }: { styles: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(mergeStyles, undefined)
  const merged = state?.error === undefined && state !== undefined

  return (
    <Card>
      <form action={formAction} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Merge this style (source)" name="sourceId" hint="This style is deleted after the merge.">
            <Select id="sourceId" name="sourceId" defaultValue="" required>
              <option value="">Select a style…</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Into this canonical style (target)" name="targetId" hint="Keeps all sales, receipts and aliases.">
            <Select id="targetId" name="targetId" defaultValue="" required>
              <option value="">Select a style…</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          This is irreversible. All sales and receipts from the source style are reassigned to the target,
          its aliases move over, and the source style is deleted.
        </p>

        <FormError error={state?.error} />
        {merged && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Merged. The source style was folded into the target and net stock has been recalculated.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {pending ? 'Merging…' : 'Merge styles'}
        </button>
      </form>
    </Card>
  )
}
