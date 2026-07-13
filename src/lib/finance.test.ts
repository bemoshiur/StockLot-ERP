import { expect, test } from 'vitest'
import { monthlyPnL, expensesTotal, expensesByCategory, partnerBalance, signedMovementAmount } from './finance'

test('monthly P&L reproduces the June26 Monthly Summery chain (cleaned to 2dp)', () => {
  // Workbook: Gross Profit 374,999.482, Total Expense 103,765, Others 4,600.
  // The workbook's 3rd decimal (.482) is an artifact of back-solved fractional
  // unit prices; the ERP keeps money to 2dp, so we assert the cleaned values.
  const p = monthlyPnL({ grossProfit: 374999.482, totalExpense: 103765, otherIncome: 4600 })
  expect(p.netProfitBeforeOther).toBe(271234.48) // XLS: 271,234.482
  expect(p.netProfit).toBe(275834.48) // XLS: 275,834.482
})

test('expenses total excludes flagged advances', () => {
  const rows = [
    { amount: 1000, isAdvance: false },
    { amount: 510, isAdvance: false },
    { amount: 5000, isAdvance: true }, // advance -> not an operating expense
  ]
  expect(expensesTotal(rows)).toBe(1510)
})

test('expenses grouped by category (advances excluded)', () => {
  const rows = [
    { categoryName: 'Daily Expenditure', amount: 1510, isAdvance: false },
    { categoryName: 'Suppliers & Others', amount: 23855, isAdvance: false },
    { categoryName: 'Suppliers & Others', amount: 100, isAdvance: true },
  ]
  const m = expensesByCategory(rows)
  expect(m.get('Daily Expenditure')).toBe(1510)
  expect(m.get('Suppliers & Others')).toBe(23855)
})

test('partner balance = opening capital + signed movements', () => {
  expect(partnerBalance(21347, [{ amount: 100000 }, { amount: -5000 }])).toBe(116347)
})

test('capital movement is signed by type: investment +, withdrawal/settlement -', () => {
  expect(signedMovementAmount('INVESTMENT', 100000)).toBe(100000)
  expect(signedMovementAmount('WITHDRAWAL', 5000)).toBe(-5000)
  expect(signedMovementAmount('SETTLEMENT', 3000)).toBe(-3000)
  // magnitude is used regardless of the sign the user typed
  expect(signedMovementAmount('WITHDRAWAL', -5000)).toBe(-5000)
})
