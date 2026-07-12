# StockLot ERP

A collaborative, multi-user web application that replaces the monthly Excel workbook used to run a StockLot (surplus apparel) wholesale business. It gives the team one source of truth for master data, and — across upcoming build phases — sales, inventory, dues, expenses, treasury, and automatic profit/summary reporting.

Currency is **BDT**. Interface is **English**. Designed for phones (in the market/warehouse) and desktop (office).

## Status

**Phase 1 — Foundation & Master Data (complete):** login by role, role-based access control (RBAC) with an audit trail, and master data — Styles (with per-style standard cost + aliases), Customers, Suppliers, Locations — plus user management.

Upcoming phases: Inventory → Sales & Receivables → Expenses + Treasury/Partner-Capital → Dashboards → Excel (June'26) import. See `docs/superpowers/plans/`.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — one full-stack codebase
- **Prisma** ORM — **SQLite in development**, **PostgreSQL** in production (portable schema)
- **Auth.js (NextAuth v5)** — credentials + JWT sessions, role in the token
- **Tailwind CSS** UI, mobile-first
- **Vitest** unit tests

## Getting started

```bash
pnpm install                     # install dependencies
pnpm prisma migrate dev          # create the SQLite dev database + apply migrations
pnpm db:seed                     # seed the owner login + reference master data
pnpm dev                         # run at http://localhost:3000
```

**Default login:** `owner@stocklot.local` / `changeme123` — change this after first sign-in (Users → edit → Reset password).

## Roles

`OWNER`, `PARTNER`, `SALES` (Sales Operator), `INVENTORY` (Inventory Clerk), `ACCOUNTANT`, `ADMIN`. Navigation and every server action are gated by role — e.g. a Sales Operator can manage customers and locations but cannot touch the style master, suppliers, or users.

## Useful commands

```bash
pnpm test          # run the unit test suite
pnpm typecheck     # TypeScript check
pnpm build         # production build
pnpm db:seed       # (re)seed reference data — idempotent
pnpm prisma studio # browse the database
```

## Switching to PostgreSQL (production)

1. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `pnpm prisma migrate deploy`.

The schema is written to be portable: enums are modeled as validated string columns (see `src/lib/enums.ts`), and money uses `Decimal`.

## Project layout

```
src/
  app/
    (app)/            authenticated area: dashboard + master modules
      styles/ customers/ suppliers/ locations/ users/
    login/            sign-in page
    api/auth/         Auth.js route handler
  components/         app shell, nav, shared UI primitives (ui.tsx)
  lib/                db, auth guards, rbac, audit, enums, validators/
  proxy.ts            route guard (Next 16 proxy/middleware)
prisma/
  schema.prisma       data model
  seed.ts             owner + reference data
docs/superpowers/     design doc + implementation plans
reference/            the original "Copy of Jun'26.xlsx"
```
