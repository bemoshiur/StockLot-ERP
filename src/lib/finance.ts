import { roundMoney } from './sales'

/** Net profit chain, mirroring the workbook's Monthly Summery. */
export function monthlyPnL(i: { grossProfit: number; totalExpense: number; otherIncome: number }): {
  netProfitBeforeOther: number
  netProfit: number
} {
  const netProfitBeforeOther = roundMoney(i.grossProfit - i.totalExpense)
  const netProfit = roundMoney(netProfitBeforeOther + i.otherIncome)
  return { netProfitBeforeOther, netProfit }
}

/** Operating expense total — advances are excluded (they are prepayments, not period cost). */
export function expensesTotal(rows: { amount: number; isAdvance: boolean }[]): number {
  return roundMoney(rows.filter((r) => !r.isAdvance).reduce((a, r) => a + r.amount, 0))
}

/** Sum non-advance expense amounts by category name. */
export function expensesByCategory(
  rows: { categoryName: string; amount: number; isAdvance: boolean }[],
): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    if (r.isAdvance) continue
    m.set(r.categoryName, roundMoney((m.get(r.categoryName) ?? 0) + r.amount))
  }
  return m
}

/** A partner's capital position = opening balance + signed capital movements. */
export function partnerBalance(openingCapitalBalance: number, movements: { amount: number }[]): number {
  return roundMoney(openingCapitalBalance + movements.reduce((a, m) => a + m.amount, 0))
}

export type MovementType = 'INVESTMENT' | 'WITHDRAWAL' | 'SETTLEMENT'

/** Sign a capital movement by type: investment increases capital, withdrawal/settlement decreases it. */
export function signedMovementAmount(type: MovementType, amount: number): number {
  const magnitude = Math.abs(amount)
  return type === 'INVESTMENT' ? magnitude : -magnitude
}
