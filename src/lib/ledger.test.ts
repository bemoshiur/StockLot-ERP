import { expect, test } from 'vitest'
import { buildCashBook, financialPosition, type CashEntry } from './ledger'

const d = (s: string) => new Date(s + 'T00:00:00Z')

test('cash book: running balance, totals, closing (opening 0)', () => {
  const entries: CashEntry[] = [
    { date: d('2026-06-03'), description: 'Payment — A', category: 'Collection', direction: 'IN', amount: 1000 },
    { date: d('2026-06-01'), description: 'Supplier X', category: 'Supplier payment', direction: 'OUT', amount: 400 },
    { date: d('2026-06-05'), description: 'Rent', category: 'Expense', direction: 'OUT', amount: 250 },
  ]
  const cb = buildCashBook(entries, 0)
  // Sorted ascending by date: 400 OUT (bal -400), 1000 IN (bal 600), 250 OUT (bal 350)
  expect(cb.rows.map((r) => r.balance)).toEqual([-400, 600, 350])
  expect(cb.rows.map((r) => r.description)).toEqual(['Supplier X', 'Payment — A', 'Rent'])
  expect(cb.totalIn).toBe(1000)
  expect(cb.totalOut).toBe(650)
  expect(cb.closing).toBe(350)
})

test('cash book: opening balance carries into running balance and closing', () => {
  const entries: CashEntry[] = [
    { date: d('2026-06-10'), description: 'Collection', category: 'Collection', direction: 'IN', amount: 500 },
  ]
  const cb = buildCashBook(entries, 200)
  expect(cb.rows[0].balance).toBe(700)
  expect(cb.closing).toBe(700)
})

test('cash book: empty entries returns opening as closing', () => {
  const cb = buildCashBook([], 0)
  expect(cb.rows).toEqual([])
  expect(cb.closing).toBe(0)
  expect(cb.totalIn).toBe(0)
  expect(cb.totalOut).toBe(0)
})

test('financial position: net worth = assets − liabilities; equity reconciles with gap', () => {
  const fp = financialPosition({
    cash: 100_000,
    treasury: 50_000,
    receivables: 300_000,
    inventoryAtCost: 200_000,
    payables: 150_000,
    capital: 400_000,
    retainedEarnings: 80_000,
  })
  expect(fp.totalAssets).toBe(650_000) // 100k + 50k + 300k + 200k
  expect(fp.totalLiabilities).toBe(150_000)
  expect(fp.netWorth).toBe(500_000) // 650k − 150k
  // Equity composition: capital 400k + retained 80k = 480k; gap to net worth = 20k
  expect(fp.equityStated).toBe(480_000)
  expect(fp.unreconciled).toBe(20_000) // netWorth − equityStated
})

test('financial position: balances exactly when capital + retained = net worth', () => {
  const fp = financialPosition({
    cash: 0,
    treasury: 0,
    receivables: 100_000,
    inventoryAtCost: 0,
    payables: 40_000,
    capital: 50_000,
    retainedEarnings: 10_000,
  })
  expect(fp.netWorth).toBe(60_000)
  expect(fp.equityStated).toBe(60_000)
  expect(fp.unreconciled).toBe(0)
})
