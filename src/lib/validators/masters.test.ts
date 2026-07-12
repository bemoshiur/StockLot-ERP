import { expect, test } from 'vitest'
import { customerSchema } from './customer'
import { supplierSchema } from './supplier'
import { locationSchema } from './location'

test('customer requires name and non-negative opening due', () => {
  expect(customerSchema.safeParse({ name: '', openingDueBalance: 0 }).success).toBe(false)
  expect(customerSchema.safeParse({ name: 'Raju Bhai', openingDueBalance: -5 }).success).toBe(false)
  const ok = customerSchema.safeParse({ name: 'Raju Bhai', phone: '', openingDueBalance: '100' })
  expect(ok.success).toBe(true)
  if (ok.success) {
    expect(ok.data.openingDueBalance).toBe(100)
    expect(ok.data.phone).toBeUndefined()
  }
})

test('supplier requires name; other fields optional', () => {
  expect(supplierSchema.safeParse({ name: '' }).success).toBe(false)
  expect(supplierSchema.safeParse({ name: 'Kamal Chowrasta' }).success).toBe(true)
})

test('location requires areaName; marketOrShop optional', () => {
  expect(locationSchema.safeParse({ areaName: '' }).success).toBe(false)
  expect(locationSchema.safeParse({ areaName: 'Uttara', marketOrShop: 'Amatur Fashion' }).success).toBe(true)
})
