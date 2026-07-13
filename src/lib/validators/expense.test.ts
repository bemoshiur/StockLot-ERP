import { expect, test } from 'vitest'
import { expenseSchema } from './expense'

const base = {
  expenseDate: '2026-07-13',
  categoryId: 'cat_1',
  amount: '1510',
  paidAmount: '1510',
}

test('requires a category', () => {
  expect(expenseSchema.safeParse({ ...base, categoryId: '' }).success).toBe(false)
})

test('amount cannot be negative', () => {
  expect(expenseSchema.safeParse({ ...base, amount: '-5' }).success).toBe(false)
})

test('paid cannot be negative', () => {
  expect(expenseSchema.safeParse({ ...base, paidAmount: '-1' }).success).toBe(false)
})

test('a valid record coerces amount string to number', () => {
  const ok = expenseSchema.safeParse(base)
  expect(ok.success).toBe(true)
  if (ok.success) expect(ok.data.amount).toBe(1510)
})

test("isAdvance coerces 'on' and true to boolean true, defaults false", () => {
  const on = expenseSchema.safeParse({ ...base, isAdvance: 'on' })
  expect(on.success).toBe(true)
  if (on.success) expect(on.data.isAdvance).toBe(true)

  const bool = expenseSchema.safeParse({ ...base, isAdvance: true })
  expect(bool.success).toBe(true)
  if (bool.success) expect(bool.data.isAdvance).toBe(true)

  const missing = expenseSchema.safeParse(base)
  expect(missing.success).toBe(true)
  if (missing.success) expect(missing.data.isAdvance).toBe(false)
})
