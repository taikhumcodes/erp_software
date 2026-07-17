# Al-Bunyan ERP

Production-grade ERP foundation for a Hardware & Building Materials Trading Company in Kuwait. Built as a reusable, modular base for future clients — each client gets a separate deployment and database.

## Run & Operate

- `pnpm --filter @workspace/erp run dev` — run the ERP frontend (Vite, port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `cd artifacts/api-server && npx prisma generate --schema=./prisma/schema.prisma` — regenerate Prisma client after schema changes
- `cd artifacts/api-server && npx prisma migrate dev --schema=./prisma/schema.prisma` — run DB migrations

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` — Secret for signing access tokens (min 32 chars in production)
- `JWT_REFRESH_SECRET` — Secret for signing refresh tokens (min 32 chars in production)
- `CORS_ORIGIN` — Allowed frontend origin (optional; defaults to `true` in dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 18, Vite, Tailwind CSS, Shadcn/UI, Wouter (routing), TanStack Query, i18next (EN/AR + RTL), Zustand
- **Backend**: Express 5, Clean Architecture (controllers → services → repositories)
- **Database**: PostgreSQL + Prisma ORM (v5)
- **Auth**: JWT (jsonwebtoken), bcryptjs — access token 15 min, refresh token 7 days
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Build**: esbuild (API server CJS bundle), Vite (frontend)

## Where Things Live

```
artifacts/
  erp/                  # React + Vite frontend
    src/
      pages/            # Route pages (login, dashboard, users, settings)
      components/       # Reusable UI components (sidebar, navbar, etc.)
      lib/              # store.ts (Zustand auth), i18n.ts
  api-server/
    prisma/
      schema.prisma     # Single source of truth for all 15 DB tables
    src/
      types/            # Shared TypeScript types (JwtPayload, AuthUser, UserRole)
      errors/           # AppError hierarchy (UnauthorizedError, ForbiddenError, etc.)
      lib/
        jwt.ts          # signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken
        prisma.ts       # Singleton PrismaClient
      middlewares/
        authenticate.ts # JWT Bearer token verification → req.user
        authorize.ts    # hasRole(), hasMinRole() role guards
        errorHandler.ts # Centralized error handler (must be last middleware)
      modules/
        auth/           # auth.controller, auth.service, auth.repository, auth.routes
      routes/
        index.ts        # Root router (mounts /healthz, /auth)
lib/
  api-spec/openapi.yaml # OpenAPI contract (source of truth for all API types)
  api-client-react/     # Generated React Query hooks
  api-zod/              # Generated Zod validation schemas
  db/                   # Drizzle ORM lib (unused by ERP — Prisma is used instead)
```

## Architecture Decisions

- **Prisma v5** (not v7) — Prisma v7 broke the datasource URL in schema.prisma; v5 has stable, expected API.
- **Drizzle lib unused** — The workspace scaffolds `lib/db` (Drizzle), but the client spec requires Prisma. The Drizzle lib remains but is not imported by the ERP modules.
- **JWT (stateless)** — No session store. Refresh token rotation is the invalidation strategy. A Redis blocklist can be added to `auth.controller.logout` for true revocation.
- **Clean Architecture** — Each module has Controller (HTTP) → Service (business logic) → Repository (data access). Never skip layers.
- **KWD precision** — All monetary Decimal fields use `@db.Decimal(15, 3)` for Kuwaiti Dinar 3-decimal precision.
- **Dual-language** — All entity models include `nameAr` fields for Arabic names alongside English.

## Prisma Models (15 tables)

roles, users, categories, brands, units, products, customers, suppliers, purchases, purchase_items, delivery_orders, delivery_order_items, sales, sale_items, payments

## User Roles (hierarchy: WAREHOUSE < SALES < MANAGER < ADMIN < OWNER)

Use `hasRole('ADMIN', 'OWNER')` or `hasMinRole('MANAGER')` middleware for route protection.

## Product

Business modules NOT yet built (foundation only):
- Products, Categories, Brands, Inventory
- Purchases, Sales, Delivery Orders
- Customers, Suppliers
- Payments, Reports

## User Preferences

- This is commercial software — never regenerate from scratch, always extend
- Each future client gets a separate deployment + database (not SaaS)
- Currency: KWD (Kuwaiti Dinar), 3 decimal places
- Language support: English + Arabic with RTL
- Prisma v5 (not v6/v7) — pin version on any reinstall

## Gotchas

- After any Prisma schema change: run `npx prisma generate --schema=./prisma/schema.prisma` from `artifacts/api-server/`
- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen`
- `pnpm approve-builds` is needed after Prisma installs (run without `--yes` flag; it's interactive)
- The `errorHandler` middleware MUST be the last `app.use()` in app.ts
- Do NOT run `pnpm dev` at workspace root — use individual package filters or workflow restart
