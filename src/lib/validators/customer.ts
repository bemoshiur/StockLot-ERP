import { z } from 'zod'
import { optionalString } from './_shared'

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required'),
  phone: optionalString,
  defaultLocationId: optionalString,
  creditTerms: optionalString,
  openingDueBalance: z.coerce.number().min(0, 'Opening due cannot be negative'),
})

export type CustomerInput = z.infer<typeof customerSchema>
