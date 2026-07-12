export type ChallanStatus = 'DRAFT' | 'DISPATCHED' | 'PARTIALLY_PAID' | 'PAID'

export const roundMoney = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)

export const lineAmount = (qty: number, unitPrice: number): number => roundMoney(qty * unitPrice)

export const lineGrossProfit = (qty: number, unitPrice: number, unitCost: number): number =>
  roundMoney(qty * unitPrice - qty * unitCost)

export type LineInput = { quantity: number; unitPrice: number; unitCost: number }
export type PaymentInput = { amountCollected: number; discountOrWaiver: number }

export type ChallanTotals = {
  invoiceTotal: number
  grossProfit: number
  collectedTotal: number
  discountTotal: number
  dueTotal: number
}

export function challanTotals(lines: LineInput[], payments: PaymentInput[]): ChallanTotals {
  const invoiceTotal = roundMoney(sum(lines.map((l) => l.quantity * l.unitPrice)))
  const grossProfit = roundMoney(sum(lines.map((l) => l.quantity * (l.unitPrice - l.unitCost))))
  const collectedTotal = roundMoney(sum(payments.map((p) => p.amountCollected)))
  const discountTotal = roundMoney(sum(payments.map((p) => p.discountOrWaiver)))
  const dueTotal = roundMoney(invoiceTotal - collectedTotal - discountTotal)
  return { invoiceTotal, grossProfit, collectedTotal, discountTotal, dueTotal }
}

export function challanStatus(t: {
  invoiceTotal: number
  collectedTotal: number
  discountTotal: number
}): ChallanStatus {
  if (t.invoiceTotal <= 0) return 'DRAFT'
  const settled = t.collectedTotal + t.discountTotal
  if (settled >= t.invoiceTotal - 0.005) return 'PAID'
  if (settled > 0) return 'PARTIALLY_PAID'
  return 'DISPATCHED'
}

/** Customer outstanding due = opening balance + sum of signed receivable entries. */
export const customerDue = (openingDueBalance: number, entries: { amount: number }[]): number =>
  roundMoney(openingDueBalance + sum(entries.map((e) => e.amount)))
