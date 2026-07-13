# syntax=docker/dockerfile:1

# StockLot ERP — production image (Next.js + Prisma, pnpm).
# Debian slim base keeps the Prisma query engine on glibc/openssl-3 (no musl
# surprises). We ship the full node_modules rather than a traced standalone
# bundle because pnpm generates the Prisma client + engine into its virtual
# store (.pnpm/…), which file-tracing does not reliably capture.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- deps: install node_modules (postinstall runs `prisma generate`) ---------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- build: compile the app --------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder values so `next build` can construct the Prisma client and Auth
# without a live database. No real secrets are baked into the image.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    AUTH_SECRET="build-time-placeholder-secret"
RUN pnpm build

# --- runner: runtime image ---------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Full dependency tree (includes the generated Prisma client + query engine),
# the build output, static assets, config, and the Prisma schema/migrations so
# `prisma migrate deploy` can run from this image.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
