import { expect, test } from 'vitest'
import {
  roundMoney,
  lineAmount,
  lineGrossProfit,
  challanTotals,
  challanStatus,
  customerDue,
} from './sales'

test('line amount and gross profit use real cost', () => {
  expect(lineAmount(10, 52)).toBe(520)
  expect(lineGrossProfit(10, 52, 40)).toBe(120)
  expect(lineGrossProfit(100, 60, 40)).toBe(2000)
})

test('roundMoney rounds to 2dp (no float artifacts)', () => {
  expect(roundMoney(89000.015)).toBe(89000.02)
  expect(roundMoney(0.1 + 0.2)).toBe(0.3)
})

test('challan totals: 2 lines with a partial payment + discount', () => {
  const lines = [
    { quantity: 100, unitPrice: 60, unitCost: 40 },
    { quantity: 60, unitPrice: 145, unitCost: 90 },
  ]
  const payments = [{ amountCollected: 14000, discountOrWaiver: 40 }]
  const t = challanTotals(lines, payments)
  expect(t.invoiceTotal).toBe(14700)
  expect(t.grossProfit).toBe(5300)
  expect(t.collectedTotal).toBe(14000)
  expect(t.discountTotal).toBe(40)
  expect(t.dueTotal).toBe(660)
})

test('challan status transitions', () => {
  expect(challanStatus({ invoiceTotal: 0, collectedTotal: 0, discountTotal: 0 })).toBe('DRAFT')
  expect(challanStatus({ invoiceTotal: 14700, collectedTotal: 0, discountTotal: 0 })).toBe('DISPATCHED')
  expect(challanStatus({ invoiceTotal: 14700, collectedTotal: 14000, discountTotal: 40 })).toBe('PARTIALLY_PAID')
  // discount + cash fully settles → PAID (discount is NOT a due)
  expect(challanStatus({ invoiceTotal: 100, collectedTotal: 60, discountTotal: 40 })).toBe('PAID')
})

test('customer due = opening + signed receivable entries', () => {
  const entries = [{ amount: 14700 }, { amount: -14000 }, { amount: -40 }]
  expect(customerDue(1500, entries)).toBe(2160)
})
