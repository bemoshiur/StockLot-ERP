import type { Action } from '@/lib/rbac'
import {
  LayoutDashboard,
  LineChart,
  BarChart3,
  Scale,
  ShoppingCart,
  HandCoins,
  Package,
  ReceiptText,
  Wallet,
  Landmark,
  CalendarClock,
  Shirt,
  Users,
  Truck,
  MapPin,
  UserCog,
  Upload,
  Settings,
  ScrollText,
  CircleUser,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  group: string
  /** Section is shown in nav when the user's role passes this action (undefined = always). */
  action?: Action
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Main' },
  { href: '/reports', label: 'Reports', icon: LineChart, group: 'Main', action: 'reports.read' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, group: 'Main', action: 'reports.read' },
  { href: '/inventory/valuation', label: 'Stock value', icon: Scale, group: 'Operations', action: 'inventory.read' },

  { href: '/sales', label: 'Sales', icon: ShoppingCart, group: 'Operations', action: 'sales.read' },
  { href: '/dues', label: 'Dues', icon: HandCoins, group: 'Operations', action: 'sales.read' },
  { href: '/inventory', label: 'Inventory', icon: Package, group: 'Operations', action: 'inventory.read' },
  { href: '/expenses', label: 'Expenses', icon: ReceiptText, group: 'Operations', action: 'expenses.read' },
  { href: '/payables', label: 'Payables', icon: Wallet, group: 'Operations', action: 'payables.read' },
  { href: '/treasury', label: 'Treasury', icon: Landmark, group: 'Operations', action: 'treasury.read' },

  { href: '/styles', label: 'Styles', icon: Shirt, group: 'Master data', action: 'styles.write' },
  { href: '/customers', label: 'Customers', icon: Users, group: 'Master data', action: 'customers.write' },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, group: 'Master data', action: 'suppliers.write' },
  { href: '/locations', label: 'Locations', icon: MapPin, group: 'Master data', action: 'locations.write' },

  { href: '/periods', label: 'Periods', icon: CalendarClock, group: 'Admin', action: 'periods.manage' },
  { href: '/users', label: 'Users', icon: UserCog, group: 'Admin', action: 'users.manage' },
  { href: '/import', label: 'Import', icon: Upload, group: 'Admin', action: 'masters.read' },
  { href: '/settings', label: 'Settings', icon: Settings, group: 'Admin', action: 'settings.manage' },
  { href: '/audit', label: 'Audit log', icon: ScrollText, group: 'Admin', action: 'audit.read' },
  { href: '/profile', label: 'My profile', icon: CircleUser, group: 'Admin' },
]
