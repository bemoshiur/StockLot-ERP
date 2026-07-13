# StockLot ERP — Architecture

A technical overview for contributors. StockLot ERP is a collaborative, multi-user
web ERP that replaces the monthly Excel workbook used to run a Bangladeshi StockLot
(surplus / overstock / lot apparel) wholesale business. It gives a small team (3–8
people) one source of truth for master data, sales, dues, inventory, purchases,
expenses, treasury, and automatic profit/summary reporting. Currency is BDT (৳), the
UI is English, and the app is built to work on phones (market/warehouse) and desktop
(office).

- **Live demo:** https://stock-lot-erp.vercel.app
- **Repo:** https://github.com/bemoshiur/StockLot-ERP (MIT)
- **Maintainer:** Moshiur Rahman (Public Pulse, moshiur@publicpulse.com.bd)

> **Heads up on Next.js 16.** The middleware convention was renamed to *proxy* — the
> edge gate lives in `src/proxy.ts`, not `middleware.ts`. Before writing code, read the
> relevant guide under `node_modules/next/dist/docs/`; APIs and conventions in this
> version may differ from older references.

---

## 1. High-level shape

StockLot ERP is a **single Next.js App Router codebase** — there is no separate API
server. The same project renders pages, runs mutations, and talks to the database:

- **React Server Components (RSC)** render route pages and read data directly.
- **Server Actions** handle every write, co-located with the feature they serve.
- **Prisma** is the only data-access layer, talking to PostgreSQL.

```
Browser (phone / desktop)
        │  request / <form> submit
        ▼
┌──────────────────────────────────────────────┐
│  Next.js 16 App Router  (one deployment)       │
│                                                │
│   src/proxy.ts  ──► auth.ts (JWT session)      │  edge gate + auth
│        │                                       │
│        ▼                                       │
│   RSC pages  ──►  Server Actions               │  render + mutate
│        │                │                      │
│        ▼                ▼                      │
│   src/lib (pure domain logic, validators)      │  business rules
│        │                                       │
│        ▼                                       │
│   Prisma client  (src/lib/db.ts)               │  data layer
└──────────────────────────────────────────────┘
        │
        ▼
   PostgreSQL (Neon, ap-southeast-1 / Singapore)
```

### Tech stack (exact versions)

| Concern | Choice |
| --- | --- |
| Framework | **Next.js 16.2.10** — App Router, RSC, TypeScript |
| UI runtime | **React 19.2.4** |
| ORM / DB | **Prisma 6.19.3** on **PostgreSQL** (Neon; pooled `DATABASE_URL` at runtime, non-pooled `DIRECT_URL` for migrations) |
| Auth | **Auth.js / NextAuth v5 (5.0.0-beta.31)** — credentials provider + JWT sessions, role in the token |
| Styling | **Tailwind CSS v4** (`@theme` tokens), light-mode NextUI-inspired design |
| Motion / icons / charts | **Framer Motion** (page transitions), **lucide-react**, dependency-free SVG charts |
| Validation / hashing | **Zod 4** on every server action, **bcryptjs** password hashing |
| Excel I/O | **@e965/xlsx** (a patched, CVE-free fork of `xlsx`) |
| Tests | **Vitest** — 51 unit tests over pure domain logic |
| Tooling / hosting | **pnpm**, deployed on **Vercel** (region `sin1`, co-located with Neon) |

The codebase is roughly **26 Prisma models** and **~56 pages/routes**.

---

## 2. Request & auth flow

Authentication is a three-stage gate. The edge proxy decides *whether you are logged
in at all*; `requireCan` inside each page/action decides *whether your role may do this
specific thing*.

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as src/proxy.ts (edge)
    participant A as auth.ts (JWT session)
    participant R as RSC page / Server Action
    participant G as requireCan(action)
    participant DB as Prisma / Postgres

    B->>P: request /sales/new
    P->>P: logged in? (JWT cookie)
    alt not logged in
        P-->>B: redirect /login
    else logged in
        P->>R: forward request
        R->>A: auth() → session { user.role }
        R->>G: requireCan('sales.write')
        alt role lacks capability
            G-->>B: redirect /
        else allowed
            G->>DB: read / write
            DB-->>B: rendered page / FormState
        end
    end
end
```

1. **`src/proxy.ts` — edge gate.** Next 16's proxy (formerly middleware) runs on every
   request except Next internals, the auth API, and static assets (see its `matcher`).
   It redirects unauthenticated users to `/login` and bounces already-logged-in users
   away from `/login`. It uses the **edge-safe** config only.

2. **`src/auth.config.ts` + `src/auth.ts` — the edge/Node split.** NextAuth is
   deliberately split so the middleware can run at the edge without pulling in the
   database or bcrypt:
   - `auth.config.ts` is edge-safe (no DB, no bcrypt). It sets `session.strategy = 'jwt'`,
     the `/login` sign-in page, the `authorized` callback, and the `jwt`/`session`
     callbacks that **carry the user's `role` into the token** and expose `role` + `id`
     on `session.user`.
   - `auth.ts` extends that config with the **Credentials provider**. Its `authorize`
     looks the user up by email, rejects inactive accounts, and verifies the password
     with `verifyPassword` (bcryptjs) before returning `{ id, name, email, role }`.

3. **`requireCan` / `requireUser` guards (`src/lib/guards.ts`).** Every page and every
   server action calls one of these **before any read or write**:
   - `requireUser()` resolves the session (or redirects to `/login`).
   - `requireCan(action)` additionally checks the RBAC matrix and redirects to `/` if
     the role lacks the capability.
   - `requireRole(...roles)` is available for the rare role-list check.

   The guard returns the typed `SessionUser`, which actions then use (e.g. to stamp
   `createdById` and to attribute audit entries).

---

## 3. Layering

The codebase separates *where a request lands*, *how a write is orchestrated*, and
*the business rules themselves* — the last of which is pure and unit-tested.

```
src/app/(app)/<feature>/          Route pages (RSC) + feature Server Actions
        page.tsx                    read + render (calls requireCan, reads via Prisma)
        actions.ts   'use server'   orchestrate writes
        *-form.tsx                  client form components (progressive <form>)
        │
        ├─ validates input with ──► src/lib/validators/<feature>.ts   (Zod schemas)
        ├─ enforces rules with  ──► src/lib/*.ts                       (pure domain logic)
        ├─ gated by             ──► src/lib/guards.ts + src/lib/rbac.ts
        ├─ records changes via  ──► src/lib/audit.ts
        └─ persists through     ──► src/lib/db.ts (Prisma client)
```

- **Route pages — `src/app/(app)/*`.** Grouped under the `(app)` route group (the shell
  with navigation); `(print)` holds letterhead documents (challan, credit note,
  statement, receipt, purchase-return) and `api/` holds NextAuth, export, backup, and
  PWA-icon handlers. Pages are RSC: they call `requireCan`, read via Prisma, and render.

- **Server Actions — per-feature `actions.ts`.** Marked `'use server'`, each write
  follows the same shape: `requireCan(...)` → parse `FormData` with a Zod schema →
  compute derived values with pure `src/lib` functions → check the period lock →
  persist inside a `db.$transaction` → `writeAudit(...)` → `revalidatePath` / `redirect`.
  Server actions use the `(prev: FormState, formData: FormData) => Promise<FormState>`
  signature so forms get typed error feedback.

- **Pure domain logic + validators — `src/lib`.** All business rules live here as pure,
  side-effect-free functions (see §6). Zod schemas live in `src/lib/validators/` and are
  the single definition of valid input for each feature; a small `_shared.ts` provides
  helpers like `optionalString`.

- **Data layer — Prisma (`src/lib/db.ts`).** A single memoized `PrismaClient` (guarded
  against dev hot-reload duplication) is the only thing that touches the database.
  Read-side query helpers are collected in `src/lib/queries.ts`.

---

## 4. RBAC model

Authorization is one small, central capability matrix — not permissions scattered
across pages.

- **`can(role, action)` — `src/lib/rbac.ts`.** A `MATRIX: Record<Action, Role[]>` maps
  each capability to the roles that hold it; `can` is just `MATRIX[action].includes(role)`.
  `Action` is a string-literal union (e.g. `'sales.write'`, `'inventory.read'`,
  `'periods.manage'`), so a typo is a compile error.

- **The six roles** (`src/lib/enums.ts`):

  | Role | Label | Representative capabilities |
  | --- | --- | --- |
  | `OWNER` | Owner | everything |
  | `PARTNER` | Partner / Investor | read-heavy: `sales.read`, `reports.read`, `treasury.write` |
  | `SALES` | Sales Operator | `sales.write`, `customers.write`, `locations.write`, `payments.write` |
  | `INVENTORY` | Inventory Clerk | `styles.write`, `inventory.write`, `suppliers.write` |
  | `ACCOUNTANT` | Accountant | `expenses.write`, `payables.write`, `payments.write`, reports |
  | `ADMIN` | System Admin | `users.manage`, `settings.manage`, admin-wide access |

  For example, a **Sales Operator** manages customers and locations but **cannot** touch
  the style master, suppliers, or users — those actions aren't listed for `SALES` in the
  matrix, so both the navigation and the server action refuse.

- **Adding a new capability** is a three-step, type-checked change:
  1. Add the string to the `Action` union in `src/lib/rbac.ts`.
  2. Add its entry to `MATRIX` listing the roles that hold it (TypeScript won't compile
     until every `Action` has a row).
  3. Call `requireCan('your.new.action')` at the top of the page and server action it
     guards. Add a `rbac.test.ts` case if the rule is non-obvious.

---

## 5. Data model

The ~26 Prisma models (`prisma/schema.prisma`) group into five domains. Money fields
are `Decimal`; enum-like columns are validated `String`s (see §6); most business rows
carry a `periodMonth` (`"YYYY-MM"`) key so a month can be summarized and locked.

### Identity & masters
| Model | Purpose |
| --- | --- |
| `AppUser` | login accounts with `role` and `active` flag |
| `CompanySettings` | singleton company profile / letterhead |
| `ProductStyle` | garment style with per-style `standardCost`, `reorderLevel`, grade/season |
| `StyleAlias` | free-text aliases used during reconciliation / merge |
| `Customer` | buyer, `openingDueBalance`, default location |
| `Supplier` | vendor, `openingPayableBalance` |
| `Location` | market / shop / area |

### Sales & receivables
| Model | Purpose |
| --- | --- |
| `SalesChallan` | a sale with lifecycle `status` and `periodMonth` |
| `SaleLine` | line items; snapshots `unitCostSnapshot` + `lineGrossProfit` at sale time |
| `PaymentReceipt` | collections against a challan, incl. `discountOrWaiver` |
| `ReceivableEntry` | signed AR ledger rows (`INVOICE`, `PAYMENT`, `WAIVER`, `OPENING`, `RETURN`, `VOID`) |
| `SalesReturn` / `ReturnLine` | returns and their line items (drive credit notes) |

### Inventory & purchases
| Model | Purpose |
| --- | --- |
| `PurchaseReceipt` / `ReceiptLine` | goods received (GRN), with `billAmount` payable and `isOpeningStock` |
| `StockAdjustment` | signed count / damage / loss / found corrections |
| `PurchaseReturn` / `PurchaseReturnLine` | returns to supplier, `creditAmount` reduces payable |
| `SupplierPayment` | payments against payables |

### Finance & treasury
| Model | Purpose |
| --- | --- |
| `ExpenseCategory` | expense category list |
| `Expense` | expense with `amount` / `paidAmount` and `isAdvance` (advances excluded from period cost) |
| `Partner` | partner/investor with `openingCapitalBalance` |
| `CapitalMovement` | signed `INVESTMENT` / `WITHDRAWAL` / `SETTLEMENT` |
| `TreasuryDeposit` | cash/bank deposits to the treasury, plus `otherIncome` |

### System & audit
| Model | Purpose |
| --- | --- |
| `Period` | one row per month, `status` `OPEN` / `CLOSED` (the period lock) |
| `AuditLog` | field-level `CREATE` / `UPDATE` / `DELETE` history |

Stock closing is derived, not stored as a running column:
`closing = received − sold + salesReturned + adjusted − purchaseReturned`
(`aggregateStock` in `src/lib/inventory.ts`).

---

## 6. Cross-cutting decisions

- **Decimal money + `roundMoney`.** All amounts are Prisma `Decimal` in the database.
  In pure logic, money is rounded through `roundMoney(n)` (round-half-up to 2 dp via
  `Math.round((n + Number.EPSILON) * 100) / 100`) so there is no float drift — challan
  totals, gross profit, dues, aging, and P&L all pass through it.

- **String enums validated by Zod (portability).** Enum-like columns (`role`, challan
  `status`, ledger `entryType`, adjustment `reason`, …) are plain `String`s rather than
  native Postgres enums. The allowed values are defined in TypeScript (`src/lib/enums.ts`)
  and enforced by Zod at the write boundary — portable across databases and cheap to
  extend without a migration.

- **Period lock.** Each month is a `Period` row that is `OPEN` or `CLOSED`. Before any
  transactional write, actions call `periodLockError(month)`; if the month is closed it
  returns a message and the write is refused. Month-end close is an `ADMIN` / `OWNER`
  capability (`periods.manage`).

- **Audit logging.** `writeAudit()` / `diff()` in `src/lib/audit.ts` record every
  `CREATE` / `UPDATE` / `DELETE` into `AuditLog`. For updates, `diff()` compares
  before/after objects and writes one row **per changed field** (with `oldValue` /
  `newValue`); a no-op update writes nothing. Entries are attributed to the acting user.

- **Reconciliation-driven correctness.** The ERP is built to reproduce the source
  **June '26 Excel workbook** to the taka — e.g. **11,929 pcs sold** and **৳852,159
  collected**. `pnpm import:june26` loads that workbook and prints an ERP-vs-XLS
  reconciliation, which is the acceptance test for the domain logic.

- **Standard-cost inventory valuation.** Each `ProductStyle` carries a `standardCost`.
  A sale **snapshots** that cost onto the `SaleLine` (`unitCostSnapshot`) so later cost
  edits don't rewrite history; gross profit is `qty × (price − cost)`. Stock is valued
  at standard cost, and low-stock alerts compare live closing stock to `reorderLevel`.

---

## 7. Testing strategy

The rule of thumb: **anything with a business rule is a pure function in `src/lib`, and
every pure function is unit-tested.** Persistence, auth, and rendering stay thin around
that core.

- **Vitest, 51 unit tests** cover the pure domain logic — `sales.ts`, `inventory.ts`,
  `finance.ts`, `ledger.ts`, `aging.ts`, `period.ts`, `csv.ts`, `audit.ts`, the RBAC
  matrix, and every validator schema. Because these functions take plain inputs and
  return plain outputs, tests need no database.
- **TDD.** New rules are written test-first: add the failing `*.test.ts` beside the
  module, implement until green, then wire the function into the server action. Keeping
  the calculation out of the action is what makes this possible.
- **Reconciliation as an integration check.** `pnpm import:june26` validates the whole
  chain end-to-end against the real workbook figures.

Run them with:

```bash
pnpm test        # vitest — 51 unit tests
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
```

---

## 8. Getting started

```bash
pnpm install                 # postinstall runs 'prisma generate'
cp .env.example .env         # set DATABASE_URL, DIRECT_URL, AUTH_SECRET
pnpm prisma migrate deploy   # apply migrations
pnpm db:seed                 # owner login + reference master data
pnpm dev                     # http://localhost:3000
```

Default seeded login: **`owner@stocklot.local` / `changeme123`** — change it after the
first sign-in.

**Environment variables:** `DATABASE_URL` (pooled Postgres), `DIRECT_URL` (non-pooled,
for migrations), `AUTH_SECRET`.

**Deployment:** Vercel is primary (region `sin1`, co-located with Neon). The app is also
self-hostable from a standalone Next.js build via the Docker image published to
`ghcr.io/bemoshiur/stocklot-erp`.

Welcome aboard — keep business rules pure and tested, guard every action with
`requireCan`, and let the June '26 reconciliation be your ground truth.
