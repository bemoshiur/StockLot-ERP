import { roundMoney } from './sales'

export type AgingBuckets = {
  current: number
  d1_30: number
  d31_60: number
  d60plus: number
  total: number
}

const DAY_MS = 86_400_000

/** Sum outstanding dues into age buckets by how many days old each sale is. */
export function agingBuckets(items: { saleDate: Date; due: number }[], asOf: Date): AgingBuckets {
  const b = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 }
  for (const it of items) {
    if (it.due <= 0) continue
    const days = Math.floor((asOf.getTime() - it.saleDate.getTime()) / DAY_MS)
    if (days <= 0) b.current += it.due
    else if (days <= 30) b.d1_30 += it.due
    else if (days <= 60) b.d31_60 += it.due
    else b.d60plus += it.due
  }
  const total = b.current + b.d1_30 + b.d31_60 + b.d60plus
  return {
    current: roundMoney(b.current),
    d1_30: roundMoney(b.d1_30),
    d31_60: roundMoney(b.d31_60),
    d60plus: roundMoney(b.d60plus),
    total: roundMoney(total),
  }
}
