/** Horizontal bar ranking (Tremor-style) — a labelled row with a proportional
 *  bar and a right-aligned value. Dependency-free. */
export function BarList({
  data,
  valueFormatter = (n) => n.toLocaleString('en-US'),
  color = 'var(--color-primary)',
}: {
  data: { label: string; value: number; href?: string }[]
  valueFormatter?: (n: number) => string
  color?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <div className="p-6 text-center text-sm text-zinc-400">No data.</div>
  return (
    <div className="space-y-2 p-5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <div className="h-8 rounded-lg" style={{ width: `${Math.max(4, (d.value / max) * 100)}%`, backgroundColor: color, opacity: 0.14 }} />
            <span className="absolute inset-y-0 left-2 flex items-center truncate text-sm font-medium text-zinc-800">
              {d.label}
            </span>
          </div>
          <span className="shrink-0 text-sm tabular-nums text-zinc-600">{valueFormatter(d.value)}</span>
        </div>
      ))}
    </div>
  )
}
