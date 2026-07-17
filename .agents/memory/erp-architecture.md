---
name: ERP Architecture
description: Key architectural decisions for the Al-Bunyan ERP project
---

# ERP Architecture Decisions

## Prisma vs Drizzle
The workspace scaffolds `lib/db` with Drizzle ORM, but the client spec requires Prisma v5. The Drizzle lib remains in the repo but is NOT imported by any ERP module. All DB access goes through `artifacts/api-server/src/lib/prisma.ts`.

## Clean Architecture layers
Every API module follows: Controller (HTTP parsing) → Service (business logic) → Repository (DB queries). Never import Repository directly from Controller, never put DB calls in Controller.

## API calls from the frontend (non-OpenAPI modules)
New modules NOT in the OpenAPI spec use `artifacts/erp/src/lib/api.ts` — a thin `fetch` wrapper that reads the Bearer token from localStorage and calls relative paths like `/api/categories`. This is separate from the Orval-generated `@workspace/api-client-react` hooks (which use the custom-fetch from that package). Do NOT generate Orval hooks for internal CRUD modules.

## JWT auth
- Access token TTL: 15 minutes (JWT_ACCESS_SECRET env var)
- Refresh token TTL: 7 days (JWT_REFRESH_SECRET env var)
- Tokens stored in frontend localStorage: keys `erp_access_token` and `erp_refresh_token`
- setAuthTokenGetter() wires the Bearer token into all generated hooks via customFetch
- Logout is stateless (client deletes tokens). Redis blocklist can be added to auth.controller.logout later.

## KWD currency precision
All monetary Decimal fields: `@db.Decimal(15, 3)` — Kuwaiti Dinar requires 3 decimal places. Serialized as strings (`.toFixed(3)`) in service layer to avoid floating-point issues.

## Dual-language support
All entity models include `nameAr String?` fields alongside English `name` fields for Arabic localization.

## Role hierarchy
WAREHOUSE < SALES < MANAGER < ADMIN < OWNER
- Read (list/detail): `hasMinRole('WAREHOUSE')` — all roles
- Write (create/update): `hasRole('OWNER', 'ADMIN', 'MANAGER')` — manager and above
- Delete: `hasRole('OWNER', 'ADMIN')` — admin and above
Both are in `artifacts/api-server/src/middlewares/authorize.ts`.

## Error handling
AppError hierarchy in `artifacts/api-server/src/errors/AppError.ts`.
errorHandler middleware MUST be the last app.use() in app.ts — it catches everything.

## Frontend state
Zustand store (`artifacts/erp/src/lib/store.ts`) manages auth state.
i18next handles EN/AR localization with RTL direction toggle.

## Frontend CSS utility classes
`artifacts/erp/src/index.css` defines `@layer components` with `.form-input`, `.form-select`, `.btn-primary`, `.btn-secondary`. All CRUD pages use these classes — add new ones here, not inline.

## Modules built (as of Product Management)
- Auth (login/logout/refresh/me)
- Categories (full CRUD, paginated, search)
- Brands (full CRUD, paginated, search)
- Units (full CRUD, paginated, search)
- Products (full CRUD, paginated, search + filters by category/brand/status)

## Modules NOT yet built
Customers, Suppliers, Purchases, Sales, Delivery Orders, Payments, Reports

## Cascade delete protection
Services check for child records before delete:
- Category: count products before deleting
- Brand: count products before deleting
- Unit: count products before deleting
- Product: count purchaseItems + saleItems before deleting
