import { z } from 'zod'
import { optionalString } from './_shared'

export const locationSchema = z.object({
  areaName: z.string().trim().min(1, 'Area name is required'),
  marketOrShop: optionalString,
})

export type LocationInput = z.infer<typeof locationSchema>
