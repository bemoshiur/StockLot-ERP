import { expect, test } from 'vitest'
import { canAssignRole, canModifyUser } from './user-policy'

test('only an OWNER can assign the OWNER role', () => {
  expect(canAssignRole('ADMIN', 'OWNER')).toBe(false)
  expect(canAssignRole('OWNER', 'OWNER')).toBe(true)
  expect(canAssignRole('ADMIN', 'SALES')).toBe(true)
  expect(canAssignRole('ADMIN', 'ADMIN')).toBe(true)
})

test('only an OWNER can modify an existing OWNER account', () => {
  expect(canModifyUser('ADMIN', 'OWNER')).toBe(false)
  expect(canModifyUser('OWNER', 'OWNER')).toBe(true)
  expect(canModifyUser('ADMIN', 'SALES')).toBe(true)
})
