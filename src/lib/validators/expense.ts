import { z } from 'zod'
import { optionalString } from './_shared'

export const expenseSchema = z.object({
  expenseDate: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  payeeOrVendor: optionalString,
  detail: optionalString,
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  paidAmount: z.coerce.number().min(0, 'Paid cannot be negative'),
  isAdvance: z.coerce.boolean().default(false),
  remarks: optionalString,
})

export type ExpenseInput = z.infer<typeof expenseSchema>
