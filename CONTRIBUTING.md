# Contributing to StockLot ERP

Thanks for your interest in improving **StockLot ERP** — a collaborative, multi-user web ERP that replaces the monthly Excel workbook used to run a Bangladeshi StockLot (surplus / overstock / lot apparel) wholesale business. Whether you're fixing a typo, filing a bug, or shipping a whole module, contributions are welcome. 🎉

- **Live demo:** https://stock-lot-erp.vercel.app
- **Repository:** https://github.com/bemoshiur/StockLot-ERP
- **License:** [MIT](./LICENSE)
- **Maintainer:** Moshiur Rahman (Public Pulse, <moshiur@publicpulse.com.bd>)

Please be respectful and constructive — see our [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to propose a change

- **Small fixes** (typos, obvious bugs, small tweaks): open a pull request directly.
- **Anything larger** (a new feature, a schema change, a refactor, a change to conventions or public behavior): **open an issue first** so we can agree on the approach before you write code. This saves everyone time and avoids duplicated or wasted effort.
- Browse the **[roadmap](./docs/ROADMAP.md)** to see what's planned, and look for issues labelled **`good first issue`** if you're getting started.

## Local setup

Follow the [README quick start](./README.md#quick-start) for the full walkthrough. In brief:

**Prerequisites**

- **Node.js 20+**
- **pnpm** (the project's package manager)
- A **PostgreSQL** database — a local Postgres instance or a free [Neon](https://neon.tech) project both work. You'll need a pooled `DATABASE_URL` (used by the app at runtime) and a non-pooled `DIRECT_URL` (used by Prisma for migrations).

**Steps**

```bash
cp .env.example .env             # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
pnpm install                     # installs deps; postinstall runs `prisma generate`
pnpm prisma migrate deploy       # apply migrations to your database
pnpm db:seed                     # seed the owner login + reference master data
pnpm dev                         # run at http://localhost:3000
```

**Default seeded login:** `owner@stocklot.local` / `changeme123` — change it after first sign-in.

Generate an `AUTH_SECRET` with `openssl rand -base64 33`.

## The dev loop

- `pnpm dev` — start the dev server at http://localhost:3000
- `pnpm test` — run the Vitest unit suite (51 tests over pure domain logic)
- `pnpm typecheck` — TypeScript check (`tsc --noEmit`)
- `pnpm lint` — ESLint
- `pnpm build` / `pnpm start` — production build and serve
- `pnpm prisma studio` — browse the database
- `pnpm import:june26` — load the reference June'26 workbook and print an ERP-vs-XLS reconciliation

> **Heads up:** this repo targets **Next.js 16**, which renamed the middleware convention to **proxy** (`src/proxy.ts`). Read the relevant guide under `node_modules/next/dist/docs/` before writing framework-level code — APIs and conventions may differ from older Next.js.

## Project conventions

These patterns are **real and enforced throughout the codebase**. New code is expected to follow them.

### Test-driven development is the norm

Write the **failing test first**, then the implementation that makes it pass. Pure domain logic lives in `src/lib/` (`sales.ts`, `inventory.ts`, `finance.ts`, `ledger.ts`, `aging.ts`, `period.ts`, `queries.ts`) and is **unit-tested with Vitest** — you'll find the co-located `*.test.ts` files alongside each module. Keep business rules in these pure, testable functions rather than inside server actions or components.

### Money uses Decimal + `roundMoney`

Never do money math with raw floats. Amounts are stored as `Decimal`, and calculations go through the `roundMoney()` helper (`src/lib/sales.ts`) so there's no float drift. Reuse the existing helpers (`lineAmount`, etc.) instead of hand-rolling arithmetic.

### Server actions validated by Zod

Server actions use the signature:

```ts
(prev: FormState, formData: FormData) => Promise<FormState>
```

Every action **validates its input with a Zod schema from `src/lib/validators/`** before it reads or writes anything. Add or extend a validator there rather than validating inline.

### RBAC via `requireCan` in every action

Access control is centralized in the capability matrix `can(role, action)` (`src/lib/rbac.ts`). **Every page and server action calls `requireCan(action)` (or `requireUser()`) from `src/lib/guards.ts` before any read or write.** Route-level gating also happens at the edge in `src/proxy.ts`. Never perform a privileged operation without a guard.

Roles: `OWNER`, `PARTNER`, `SALES`, `INVENTORY`, `ACCOUNTANT`, `ADMIN`.

### Audit every mutation via `writeAudit`

CREATE / UPDATE / DELETE operations record field-level before/after changes to the `AuditLog` table using `writeAudit()` and `diff()` from `src/lib/audit.ts`. When you add a mutation, add its audit entry.

### Other conventions

- **Enums** are modeled as validated `String` columns (see `src/lib/enums.ts`), not native database enums, for portability.
- **Period lock:** months are `OPEN` or `CLOSED`; writes to a closed period must be refused (`periodLockError`).
- **Reconciliation-driven correctness:** the ERP reproduces the source June'26 Excel figures to the taka. If your change touches sales, inventory, or finance totals, keep `pnpm import:june26` reconciling.

## Required checks before a PR

All four of these **must pass** before you open (and to keep green) a pull request:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

CI will run them too, but running locally first keeps the loop fast.

## Commit style & branch naming

We use **[Conventional Commits](https://www.conventionalcommits.org/)**. Prefix each commit with its type:

- `feat:` — a new feature
- `fix:` — a bug fix
- `docs:` — documentation only
- `chore:` — tooling, deps, or housekeeping

Example: `feat: sales returns with printable credit notes`

Name your branches to match, e.g. `feat/sales-returns`, `fix/aging-bucket-boundary`, `docs/contributing`.

## Pull request checklist

Before requesting review, confirm:

- [ ] For a large change, an issue was opened first and the approach agreed.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build` all pass locally.
- [ ] New/changed domain logic has unit tests (**failing test written first**).
- [ ] Money math uses `Decimal` + `roundMoney` — no raw floats.
- [ ] Inputs are validated with a Zod schema in `src/lib/validators/`.
- [ ] Server actions and pages are gated with `requireCan` / `requireUser`.
- [ ] Mutations write an audit entry via `writeAudit`.
- [ ] Commits follow Conventional Commits; the branch is named accordingly.
- [ ] The PR description explains the what and why, and links any related issue.

## Reporting security issues

**Please do not open a public issue for security problems.** See [SECURITY.md](./SECURITY.md) for how to report vulnerabilities privately.

---

Questions? Open an issue or reach the maintainer at <moshiur@publicpulse.com.bd>. Thanks for contributing!
