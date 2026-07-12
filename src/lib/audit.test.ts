import { expect, test } from 'vitest'
import { diff } from './audit'

test('diff returns only changed fields as strings', () => {
  expect(diff({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual([
    { field: 'b', oldValue: '2', newValue: '3' },
  ])
})

test('diff treats null/undefined/empty as equal-ish and reports real changes', () => {
  expect(diff({ a: null }, { a: undefined })).toEqual([])
  expect(diff({ name: '' }, { name: 'Raju' })).toEqual([
    { field: 'name', oldValue: null, newValue: 'Raju' },
  ])
})
