import Link from 'next/link'

/** GET search form — reloads the page with ?q=... (server-driven, no client JS). */
export function SearchBar({ q, placeholder }: { q?: string; placeholder?: string }) {
  return (
    <form method="get" className="flex items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q ?? ''}
        placeholder={placeholder ?? 'Search…'}
        className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      <button
        type="submit"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Search
      </button>
    </form>
  )
}

/** Prev/Next pagination preserving existing query params (e.g. q). */
export function Pagination({
  page,
  totalPages,
  params = {},
}: {
  page: number
  totalPages: number
  params?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null
  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    sp.set('page', String(p))
    return `?${sp.toString()}`
  }
  const btn =
    'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
      {page > 1 ? <Link href={href(page - 1)} className={btn}>← Prev</Link> : <span />}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)} className={btn}>Next →</Link> : <span />}
    </div>
  )
}

/** Parse q + page from a searchParams object. */
export function parseListParams(sp: { q?: string; page?: string }): { q: string; page: number } {
  const q = (sp.q ?? '').trim()
  const page = Math.max(1, Number(sp.page) || 1)
  return { q, page }
}

export const PAGE_SIZE = 25
