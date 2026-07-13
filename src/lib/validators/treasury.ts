import { z } from 'zod'
import { optionalString } from './_shared'

export const MOVEMENT_TYPES = ['INVESTMENT', 'WITHDRAWAL', 'SETTLEMENT'] as const
export const DEPOSIT_METHODS = ['cash', 'bank', 'account'] as const

export const capitalMovementSchema = z.object({
  partnerId: z.string().min(1, 'Partner is required'),
  movementType: z.enum(MOVEMENT_TYPES),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  date: z.string().min(1, 'Date is required'),
  notes: optionalString,
})

export const treasuryDepositSchema = z.object({
  payerPartnerId: optionalString,
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  method: z.enum(DEPOSIT_METHODS),
  depositDate: z.string().min(1, 'Date is required'),
  otherIncome: z.coerce.number().min(0, 'Other income cannot be negative').default(0),
  remarks: optionalString,
})

export type CapitalMovementInput = z.infer<typeof capitalMovementSchema>
export type TreasuryDepositInput = z.infer<typeof treasuryDepositSchema>
