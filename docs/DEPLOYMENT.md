# Deployment

This guide covers deploying **StockLot ERP** two ways:

- **[Path A — Vercel](#path-a--vercel-primary)** (primary; how the live demo runs)
- **[Path B — Docker / self-host](#path-b--docker--self-host)**

Both paths need a PostgreSQL database (Neon is what the project uses) and three
environment variables. Start with [Database (Neon)](#database-neon) and
[Environment variables](#environment-variables), then follow whichever path you
prefer.

- **Live demo:** https://stock-lot-erp.vercel.app
- **Default seeded login:** `owner@stocklot.local` / `changeme123` — change this
  immediately after your first sign-in.

---

## Database (Neon)

StockLot ERP runs on PostgreSQL. The project is hosted on
[Neon](https://neon.tech) in the **`ap-southeast-1` (Singapore)** region so the
database sits next to the application (see the Vercel `sin1` region below).

Neon exposes **two connection strings**, and the app uses both:

| Variable       | Neon connection | Used for | Notes |
| -------------- | --------------- | -------- | ----- |
| `DATABASE_URL` | **Pooled** (host contains `-pooler`) | Application runtime queries | Goes through Neon's PgBouncer connection pooler — the right choice for serverless/edge runtimes that open many short-lived connections. |
| `DIRECT_URL`   | **Direct / non-pooled** | Prisma migrations (`prisma migrate deploy`) and seeding | Prisma runs schema DDL and advisory locks that a transaction pooler cannot handle reliably, so migrations must use a direct connection. |

### Why `DIRECT_URL` is used for migrations

A connection pooler multiplexes many client connections over a few real
Postgres sessions. That is ideal for serving traffic, but Prisma Migrate needs a
stable, single session to acquire advisory locks and run DDL. Routing migrations
through the **direct** URL avoids pooler-related failures, while everyday runtime
queries still benefit from the **pooled** URL. Prisma reads `directUrl` from the
schema for migration and introspection commands and `url` for the client.

Example connection strings (from [`.env.example`](../.env.example)):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DB?sslmode=require&channel_binding=require"
```

---

## Environment variables

Copy [`.env.example`](../.env.example) to `.env` and fill in the values below.
All three are required.

| Name           | Required | Purpose |
| -------------- | :------: | ------- |
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string used by the app at runtime. |
| `DIRECT_URL`   | Yes | Non-pooled PostgreSQL connection string used for Prisma migrations and seeding. |
| `AUTH_SECRET`  | Yes | Secret used by Auth.js / NextAuth to sign and encrypt JWT sessions. |

Generate a strong `AUTH_SECRET` with:

```bash
openssl rand -base64 33
```

---

## Path A — Vercel (primary)

This is how the live demo is deployed.

1. **Create the database.** Provision a Neon Postgres project in
   **Singapore (`ap-southeast-1`)** and note both the pooled and direct
   connection strings (see [Database (Neon)](#database-neon)).

2. **Connect the repository.** In the Vercel dashboard, import
   `github.com/bemoshiur/StockLot-ERP`. Vercel auto-detects Next.js and uses
   **pnpm** (the repo ships a `pnpm-lock.yaml`).

3. **Set the environment variables.** Under **Project → Settings →
   Environment Variables**, add all three from the table above:
   `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`.

4. **Set the function region to `sin1`.** The repo already pins this in
   [`vercel.json`](../vercel.json):

   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "regions": ["sin1"],
     "framework": "nextjs"
   }
   ```

   `sin1` (Singapore) co-locates the serverless functions with the Neon
   Singapore database, minimizing query latency.

5. **`prisma generate` runs automatically.** The `postinstall` script in
   [`package.json`](../package.json) runs `prisma generate`, so the Prisma
   Client is generated during every Vercel install/build — no extra
   configuration needed.

6. **Apply migrations to the production database.** From a machine with the
   production `DIRECT_URL` in its environment (your terminal, or a Vercel build
   step), run:

   ```bash
   pnpm prisma migrate deploy
   ```

   This applies all committed migrations under `prisma/migrations/` to the
   production database.

7. **Seed reference data once.** Run this a single time after the first
   successful migrate to create the owner login and reference master data:

   ```bash
   pnpm db:seed
   ```

8. **Deploy.** Trigger a deployment (push to the connected branch, or use
   the Vercel dashboard). The app builds and goes live — the reference
   deployment is at **https://stock-lot-erp.vercel.app**.

> After the first sign-in, change the seeded owner password
> (`owner@stocklot.local` / `changeme123`).

---

## Path B — Docker / self-host

StockLot ERP builds to a self-contained Next.js **standalone** output
(`output: "standalone"` in [`next.config.ts`](../next.config.ts)), so it can run
from a small Docker image.

### Get the image

**Option 1 — Pull the published image.** A release is published to the GitHub
Container Registry by the release workflow:

```bash
docker pull ghcr.io/bemoshiur/stocklot-erp:latest
```

**Option 2 — Build locally:**

```bash
docker build -t stocklot-erp .
```

### Run the container

Provide the three environment variables and map the app's port `3000`:

```bash
docker run -d \
  -e DATABASE_URL="postgresql://…-pooler…/DB?sslmode=require" \
  -e DIRECT_URL="postgresql://…/DB?sslmode=require" \
  -e AUTH_SECRET="$(openssl rand -base64 33)" \
  -p 3000:3000 \
  ghcr.io/bemoshiur/stocklot-erp:latest
```

Substitute `stocklot-erp` for the image name if you built it locally. The app is
then available on `http://localhost:3000`.

### Run migrations

The container serves the app; it does not apply schema changes on its own. Run
migrations against your database using the **direct** connection
(`DIRECT_URL`), either:

- **As a one-off container run:**

  ```bash
  docker run --rm \
    -e DATABASE_URL="…" \
    -e DIRECT_URL="…" \
    ghcr.io/bemoshiur/stocklot-erp:latest \
    pnpm prisma migrate deploy
  ```

- **Or from any machine that has `DIRECT_URL` in its environment** and the repo
  checked out:

  ```bash
  pnpm prisma migrate deploy
  ```

Then seed reference data **once**:

```bash
pnpm db:seed
```

---

## Verifying a deployment

- Open the site and sign in with the seeded owner account, then change its
  password.
- Confirm the database is reachable and migrated (no Prisma
  "migration not applied" errors in the logs).
- Optionally run the test suite locally before deploying: `pnpm test`
  (Vitest, 51 unit tests).

## Troubleshooting

- **Migrations hang or fail with pooler/advisory-lock errors** — you are pointing
  migrations at the pooled URL. Migrations must use `DIRECT_URL`.
- **`AUTH_SECRET` missing / sessions rejected** — set `AUTH_SECRET` (see
  [Environment variables](#environment-variables)) and redeploy.
- **High query latency on Vercel** — confirm the function region is `sin1` and
  the Neon database is in Singapore (`ap-southeast-1`).
