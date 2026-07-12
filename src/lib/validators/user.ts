import { z } from 'zod'
import { RoleEnum } from '@/lib/enums'

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: RoleEnum,
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: RoleEnum,
  active: z.coerce.boolean().default(false),
})

export const passwordResetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
