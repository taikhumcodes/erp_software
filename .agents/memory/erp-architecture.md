---
name: ERP Architecture
description: Key architectural decisions for the Al-Bunyan ERP project
---

# ERP Architecture Decisions

## Prisma vs Drizzle
The workspace scaffolds `lib/db` with Drizzle ORM, but the client spec requires Prisma v5. The Drizzle lib remains in the repo but is NOT imported by any ERP module. All DB access goes through `artifacts/api-server/src/lib/prisma.ts`.

## Clean Architecture layers
Every API module follows: Controller (HTTP parsing) → Service (business logic) → Repository (DB queries). Never import Repository directly from Controller, never put DB calls in Controller.

## JWT auth
- Access token TTL: 15 minutes (JWT_ACCESS_SECRET env var)
- Refresh token TTL: 7 days (JWT_REFRESH_SECRET env var)
- Tokens stored in frontend localStorage: keys `erp_access_token` and `erp_refresh_token`
- setAuthTokenGetter() wires the Bearer token into all generated hooks via customFetch
- Logout is stateless (client deletes tokens). Redis blocklist can be added to auth.controller.logout later.

## KWD currency precision
All monetary Decimal fields: `@db.Decimal(15, 3)` — Kuwaiti Dinar requires 3 decimal places.

## Dual-language support
All entity models include `nameAr String?` fields alongside English `name` fields for Arabic localization.

## Role hierarchy
WAREHOUSE < SALES < MANAGER < ADMIN < OWNER
Use `hasRole('ADMIN', 'OWNER')` for exact-match or `hasMinRole('MANAGER')` for hierarchy-aware guards.
Both are in `artifacts/api-server/src/middlewares/authorize.ts`.

## Error handling
AppError hierarchy in `artifacts/api-server/src/errors/AppError.ts`.
errorHandler middleware MUST be the last app.use() in app.ts — it catches everything.

## Frontend state
Zustand store (`artifacts/erp/src/lib/store.ts`) manages auth state.
i18next handles EN/AR localization with RTL direction toggle.
