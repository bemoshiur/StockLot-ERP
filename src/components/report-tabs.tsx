'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/reports', label: 'P&L' },
  { href: '/reports/daybook', label: 'Day book' },
  { href: '/reports/purchases', label: 'Purchases' },
  { href: '/reports/cashflow', label: 'Cash flow' },
  { href: '/reports/cashbook', label: 'Cash book' },
  { href: '/reports/balance-sheet', label: 'Balance sheet' },
]

export function ReportTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      {TABS.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              active ? 'bg-primary text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
