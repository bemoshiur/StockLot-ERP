import { roundMoney } from './sales'

// ---- Cash book -------------------------------------------------------------

export type CashDirection = 'IN' | 'OUT'

export type CashEntry = {
  date: Date
  description: string
  category: string
  direction: CashDirection
  amount: number
}

export type CashBookRow = CashEntry & { balance: number }

/** Build a chronological cash book with a running balance.
 *  Entries are sorted ascending by date (stable for equal dates), then a
 *  running balance is accrued from `opening`: +amount for IN, −amount for OUT. */
export function buildCashBook(entries: CashEntry[], opening: number): {
  rows: CashBookRow[]
  totalIn: number
  totalOut: number
  closing: number
} {
  const sorted = entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.date.getTime() - b.e.date.getTime() || a.i - b.i)
    .map(({ e }) => e)

  let balance = opening
  let totalIn = 0
  let totalOut = 0
  const rows: CashBookRow[] = sorted.map((e) => {
    if (e.direction === 'IN') {
      balance = roundMoney(balance + e.amount)
      totalIn = roundMoney(totalIn + e.amount)
    } else {
      balance = roundMoney(balance - e.amount)
      totalOut = roundMoney(totalOut + e.amount)
    }
    return { ...e, balance }
  })

  return { rows, totalIn, totalOut, closing: roundMoney(opening + totalIn - totalOut) }
}

// ---- Financial position (balance sheet) ------------------------------------

export type FinancialPositionInput = {
  cash: number // operational cash & bank (cash-book closing)
  treasury: number // amounts moved to the treasury/Alib account
  receivables: number // outstanding customer dues
  inventoryAtCost: number // closing stock valued at standard cost
  payables: number // outstanding supplier balances
  capital: number // partner capital (opening + movements)
  retainedEarnings: number // accumulated net profit
}

/** Statement of financial position.
 *  Net worth (equity) = total assets − total liabilities, which is always exact.
 *  The stated equity (capital + retained earnings) is then reconciled against it;
 *  any gap comes from opening balances that predate the system and is surfaced
 *  explicitly rather than hidden. */
export function financialPosition(i: FinancialPositionInput): {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  equityStated: number
  unreconciled: number
} {
  const totalAssets = roundMoney(i.cash + i.treasury + i.receivables + i.inventoryAtCost)
  const totalLiabilities = roundMoney(i.payables)
  const netWorth = roundMoney(totalAssets - totalLiabilities)
  const equityStated = roundMoney(i.capital + i.retainedEarnings)
  const unreconciled = roundMoney(netWorth - equityStated)
  return { totalAssets, totalLiabilities, netWorth, equityStated, unreconciled }
}
