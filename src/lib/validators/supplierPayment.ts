import { z } from 'zod'
import { optionalString } from './_shared'

export const PAYMENT_METHODS = ['cash', 'bank', 'bKash', 'Nagad', 'account'] as const

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  amount: z.coerce.number().gt(0, 'Amount must be greater than zero'),
  method: z.enum(PAYMENT_METHODS),
  paymentDate: z.string().min(1, 'Date is required'),
  notes: optionalString,
})

export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>
