import { expect, test } from 'vitest'
import { styleSchema } from './style'
import { customerSchema } from './customer'
import { supplierSchema } from './supplier'
import { locationSchema } from './location'
import { userCreateSchema } from './user'

// Guards against regressions: each exported schema must accept a known-good object.
test('all master validators accept a known-good record', () => {
  expect(styleSchema.safeParse({ styleCode: 'X', styleName: 'X', standardCost: 10 }).success).toBe(true)
  expect(customerSchema.safeParse({ name: 'X', openingDueBalance: 0 }).success).toBe(true)
  expect(supplierSchema.safeParse({ name: 'X' }).success).toBe(true)
  expect(locationSchema.safeParse({ areaName: 'X' }).success).toBe(true)
  expect(
    userCreateSchema.safeParse({ name: 'X', email: 'a@b.com', role: 'OWNER', password: 'password1' }).success,
  ).toBe(true)
})
