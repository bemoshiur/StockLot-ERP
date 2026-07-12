import { expect, test } from 'vitest'
import { agingBuckets } from './aging'

test('buckets dues by age of the sale', () => {
  const asOf = new Date('2026-07-12')
  const b = agingBuckets(
    [
      { saleDate: new Date('2026-07-12'), due: 200 }, // 0 days → current
      { saleDate: new Date('2026-06-30'), due: 500 }, // 12 days → 1-30
      { saleDate: new Date('2026-06-10'), due: 660 }, // 32 days → 31-60
      { saleDate: new Date('2026-05-01'), due: 1000 }, // 72 days → 60+
      { saleDate: new Date('2026-06-01'), due: 0 }, // no due → ignored
    ],
    asOf,
  )
  expect(b).toEqual({ current: 200, d1_30: 500, d31_60: 660, d60plus: 1000, total: 2360 })
})
