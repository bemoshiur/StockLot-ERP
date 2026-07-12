import { z } from 'zod'
import { optionalString } from './_shared'

export const PAYMENT_METHODS = ['cash', 'bank', 'bKash', 'Nagad', 'account'] as const

export const paymentSchema = z.object({
  amountCollected: z.coerce.number().min(0, 'Amount cannot be negative'),
  discountOrWaiver: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  method: z.enum(PAYMENT_METHODS),
  receiptDate: z.string().min(1, 'Date is required'),
  notes: optionalString,
})

export type PaymentInput = z.infer<typeof paymentSchema>
