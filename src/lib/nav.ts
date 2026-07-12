import type { Action } from '@/lib/rbac'

export type NavItem = {
  href: string
  label: string
  /** Section is shown in nav when the user's role passes this action (undefined = always). */
  action?: Action
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/sales', label: 'Sales', action: 'sales.read' },
  { href: '/dues', label: 'Dues', action: 'sales.read' },
  { href: '/styles', label: 'Styles', action: 'styles.write' },
  { href: '/customers', label: 'Customers', action: 'customers.write' },
  { href: '/suppliers', label: 'Suppliers', action: 'suppliers.write' },
  { href: '/locations', label: 'Locations', action: 'locations.write' },
  { href: '/users', label: 'Users', action: 'users.manage' },
]
