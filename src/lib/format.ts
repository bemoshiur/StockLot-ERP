export const taka = (n: number): string =>
  '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const shortDate = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  DISPATCHED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  DISPATCHED: 'Dispatched',
  PARTIALLY_PAID: 'Part-paid',
  PAID: 'Paid',
}
