import { expect, test } from 'vitest'
import { can } from './rbac'

test('sales cannot manage users; owner can', () => {
  expect(can('SALES', 'users.manage')).toBe(false)
  expect(can('OWNER', 'users.manage')).toBe(true)
})

test('inventory can write styles; sales cannot', () => {
  expect(can('INVENTORY', 'styles.write')).toBe(true)
  expect(can('SALES', 'styles.write')).toBe(false)
})

test('all operational roles can read masters', () => {
  for (const r of ['OWNER', 'ADMIN', 'SALES', 'INVENTORY', 'ACCOUNTANT', 'PARTNER'] as const) {
    expect(can(r, 'masters.read')).toBe(true)
  }
})
