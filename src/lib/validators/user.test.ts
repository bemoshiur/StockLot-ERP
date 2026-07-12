import { expect, test } from 'vitest'
import { userCreateSchema, userUpdateSchema } from './user'

test('create requires name, valid email, role, and 8+ char password', () => {
  expect(userCreateSchema.safeParse({ name: 'X', email: 'bad', role: 'SALES', password: 'longenough' }).success).toBe(false)
  expect(userCreateSchema.safeParse({ name: 'X', email: 'a@b.com', role: 'SALES', password: 'short' }).success).toBe(false)
  expect(userCreateSchema.safeParse({ name: 'X', email: 'a@b.com', role: 'NOPE', password: 'longenough' }).success).toBe(false)
  const ok = userCreateSchema.safeParse({ name: 'Talib', email: 'Talib@X.com', role: 'SALES', password: 'password1' })
  expect(ok.success).toBe(true)
  if (ok.success) expect(ok.data.email).toBe('talib@x.com')
})

test('update coerces active checkbox and validates role', () => {
  const ok = userUpdateSchema.safeParse({ name: 'Talib', email: 'a@b.com', role: 'ACCOUNTANT', active: 'on' })
  expect(ok.success).toBe(true)
  if (ok.success) expect(ok.data.active).toBe(true)
})
