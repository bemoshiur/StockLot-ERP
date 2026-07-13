import { z } from 'zod'
import { optionalString } from './_shared'

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required'),
  contactPhone: optionalString,
  address: optionalString,
  notes: optionalString,
  openingPayableBalance: z.coerce.number().min(0).default(0),
})

export type SupplierInput = z.infer<typeof supplierSchema>
