import type { Action } from '@/lib/rbac'

export type NavItem = {
  href: string
  label: string
  /** Section is shown in nav when the user's role passes this action (undefined = always). */
  action?: Action
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/reports', label: 'Reports', action: 'reports.read' },
  { href: '/sales', label: 'Sales', action: 'sales.read' },
  { href: '/dues', label: 'Dues', action: 'sales.read' },
  { href: '/inventory', label: 'Inventory', action: 'inventory.read' },
  { href: '/expenses', label: 'Expenses', action: 'expenses.read' },
  { href: '/payables', label: 'Payables', action: 'payables.read' },
  { href: '/treasury', label: 'Treasury', action: 'treasury.read' },
  { href: '/periods', label: 'Periods', action: 'periods.manage' },
  { href: '/styles', label: 'Styles', action: 'styles.write' },
  { href: '/customers', label: 'Customers', action: 'customers.write' },
  { href: '/suppliers', label: 'Suppliers', action: 'suppliers.write' },
  { href: '/locations', label: 'Locations', action: 'locations.write' },
  { href: '/users', label: 'Users', action: 'users.manage' },
  { href: '/import', label: 'Import', action: 'masters.read' },
  { href: '/settings', label: 'Settings', action: 'settings.manage' },
  { href: '/audit', label: 'Audit log', action: 'audit.read' },
  { href: '/profile', label: 'My profile' },
]
