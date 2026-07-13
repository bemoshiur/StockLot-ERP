# Changelog

All notable changes to **StockLot ERP** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Double-entry general ledger with a trial balance.
- Scheduled automatic backups.
- Offline write queue for the PWA (queue mutations while offline, sync on reconnect).
- VAT support.
- Email / WhatsApp alert digests.

## [1.0.0] - 2026-07-13

First public release. StockLot ERP is a collaborative, multi-user web ERP that
replaces the monthly Excel workbook used to run a Bangladeshi StockLot (surplus /
overstock / lot apparel) wholesale business, giving a small team one source of
truth for master data, sales, dues, inventory, purchases, expenses, treasury, and
automatic profit / summary reporting. Currency is BDT (৳); the UI is English and
built for phones (market / warehouse) and desktop (office).

Built on Next.js 16 (App Router, React Server Components, TypeScript), React 19,
Prisma 6 on PostgreSQL, and Auth.js / NextAuth v5. Reconciliation-driven: the ERP
reproduces the source June '26 Excel workbook figures to the taka (e.g. 11,929 pcs
sold, ৳852,159 collected).

### Added

#### Master data

- Garment style master with per-style standard cost, free-text aliases, and
  reconciliation / merge of duplicate styles.
- Customers, suppliers, and locations masters.
- User management with role-based access control.
- Company profile / letterhead for printable documents.

#### Sales & receivables

- Sales challans with a full lifecycle: DRAFT → DISPATCHED → PARTIALLY_PAID → PAID,
  plus VOID.
- Payment receipts with discount / waiver handling.
- Dues (accounts receivable) with aging buckets (current / 1–30 / 31–60 / 60+).
- Sales returns with printable credit notes.
- Per-customer statement / khata.

#### Inventory

- Goods-received notes (GRN) and live net stock.
- Stock valuation at standard cost.
- Stock adjustments (count correction / damage / loss / found).
- Purchase returns to supplier.
- Reorder levels with low-stock alerts.

#### Purchases & payables

- Purchase receipts with bill amounts.
- Accounts payable by supplier and supplier payments.
- Month-end period close / lock (writes to a closed period are refused).

#### Finance

- Monthly profit & loss.
- Expenses with categories (advances excluded from period cost).
- Treasury & partner-capital tracking.
- Cash flow and a chronological cash book with running balance.
- Balance sheet / statement of financial position.
- Money handled with Decimal + a `roundMoney()` helper (no float drift).

#### Reporting & analytics

- Dashboard with KPI cards and dependency-free SVG charts.
- Sales analytics: by location, top items, top customers, daily revenue.
- Reports pack: day book, purchases report, cash flow, cash book, balance sheet.
- Printable documents (challan / invoice, GRN, credit note) using the company
  letterhead.
- CSV / Excel export and an Excel / CSV importer.

#### Platform

- Global search.
- Full audit log.
- One-click JSON data backup (owner / admin).
- Installable PWA with an offline fallback.
- Bulk actions (e.g. bulk activate / deactivate styles).
- Roles: OWNER, PARTNER, SALES (Sales Operator), INVENTORY (Inventory Clerk),
  ACCOUNTANT, ADMIN.

### Security

- **Role-based access control (RBAC)** — a central capability matrix
  (`can(role, action)`) gates navigation and every server action before any read
  or write; routes are additionally gated at the edge.
- **Audit trail** — every CREATE / UPDATE / DELETE is recorded with field-level
  before / after values in an `AuditLog` table.
- **CVE-free xlsx fork** — Excel import / export uses `@e965/xlsx`, a patched,
  CVE-free fork of `xlsx`.
- **CSV injection guard** — exported CSV cells are sanitized to prevent formula
  (CSV) injection.
- Passwords are hashed with bcryptjs; sessions use JWT with the user role carried
  in the token. Every server action validates input with Zod before writing.

[Unreleased]: https://github.com/bemoshiur/StockLot-ERP/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bemoshiur/StockLot-ERP/releases/tag/v1.0.0
