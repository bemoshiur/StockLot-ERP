import { z } from 'zod'
import { optionalString } from './_shared'

export const saleLineSchema = z.object({
  styleId: z.string().min(1, 'Pick a style'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Price cannot be negative'),
})

export const saleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  saleDate: z.string().min(1, 'Sale date is required'),
  locationId: optionalString,
  challanNo: optionalString,
  remarks: optionalString,
  lines: z.array(saleLineSchema).min(1, 'Add at least one line'),
})

export type SaleLineInput = z.infer<typeof saleLineSchema>
export type SaleInput = z.infer<typeof saleSchema>
