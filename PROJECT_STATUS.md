# Al-Bunyan ERP — Project Status

> **Last updated:** July 21, 2026  
> **Project:** Al-Bunyan ERP  
> **Company domain:** Hardware & building materials trading company, Kuwait  
> **Deployment model:** Multi-client deployment, not SaaS  
> **Current phase:** Core ERP foundation complete; next phase is purchasing workflow

---

## IMPORTANT FOR FUTURE AI DEVELOPERS

This document is the current source of truth for future implementation work.

Completed modules are considered production-ready. Do not redesign, rewrite, or refactor completed modules unless the user explicitly requests it.

Always inspect the current codebase before implementing anything. The current project state takes priority over old prompts, old reports, generated zips, or prior assumptions.

Future modules must preserve the existing architecture:

- Backend: Controller → Service → Repository → Prisma
- Frontend: React page → TanStack Query → `artifacts/erp/src/lib/api.ts`
- Routing: all API routes registered in `artifacts/api-server/src/routes/index.ts`
- Translations: all user-facing strings in `artifacts/erp/src/i18n.ts`
- Types: shared frontend module types in `artifacts/erp/src/lib/types.ts`

Never regenerate completed code. Never modify unrelated modules while implementing a new one.

---

## 1. Project Overview

Al-Bunyan ERP is a bilingual English/Arabic ERP for trading companies dealing in hardware, building materials, and industrial supplies. The system currently includes authentication, authorization, product catalogue, contacts, suppliers, and users management.

### Technology stack

- Frontend: React 19, TypeScript, Vite 7, Tailwind CSS, shadcn/ui, TanStack Query, Wouter, Zustand, i18next
- Backend: Node.js, Express 5, TypeScript, Prisma v5, PostgreSQL, JWT authentication
- Workspace: pnpm monorepo
- Currency/precision: Kuwaiti Dinar, `Decimal(15,3)` for money and quantities

### Current development phase

Core foundation is implemented:

- Authentication and session hydration
- Role-based authorization
- Product catalogue foundation
- Customers and suppliers
- Users management with security improvements

Next implementation priority is Purchases.

---

## 2. Current Module Status

| Module | Status | Backend | Frontend | Current description |
|---|---:|---:|---:|---|
| Authentication | ✅ Complete | ✅ | ✅ | Login, logout, refresh tokens, `/me`, JWT hydration, inactive-user protection |
| Dashboard | 🟡 In Progress | ⬜ | 🟡 | Placeholder summary page only; real KPIs not implemented |
| Categories | ✅ Complete | ✅ | ✅ | CRUD, search, pagination, role guards, delete protection |
| Brands | ✅ Complete | ✅ | ✅ | CRUD, search, pagination, role guards, delete protection |
| Units | ✅ Complete | ✅ | ✅ | CRUD, search, pagination, role guards, delete protection |
| Products | ✅ Complete | ✅ | ✅ | CRUD, search/filtering, category/brand/unit relations, KWD price fields, stock fields |
| Customers | ✅ Complete | ✅ | ✅ | CRUD, search, pagination, duplicate prevention, auto code generation, phone/email validation |
| Suppliers | ✅ Complete | ✅ | ✅ | CRUD, statistics, search, filters, pagination, balance display, delete protection |
| Users | ✅ Complete | ✅ | ✅ | Full user management, statistics, role hierarchy, password reset, audit logging, security patch |
| Purchases | ⬜ Not Started | ⬜ | ⬜ | Schema exists; API and UI not implemented |
| Sales | ⬜ Not Started | ⬜ | ⬜ | Schema exists; API and UI not implemented |
| Delivery Orders | ⬜ Not Started | ⬜ | ⬜ | Schema exists; API and UI not implemented |
| Payments | ⬜ Not Started | ⬜ | ⬜ | Schema exists; API and UI not implemented |
| Reports | ⬜ Not Started | ⬜ | ⬜ | Not implemented |
| Settings | 🟡 In Progress | ⬜ | 🟡 | Route/page exists as a placeholder; no settings backend |

---

## 3. Users Module

The Users module is complete and integrated into the ERP.

### Backend

Files:

- `artifacts/api-server/src/modules/users/users.routes.ts`
- `artifacts/api-server/src/modules/users/users.controller.ts`
- `artifacts/api-server/src/modules/users/users.service.ts`
- `artifacts/api-server/src/modules/users/users.repository.ts`
- `artifacts/api-server/src/lib/audit.ts`

Route registration:

- Mounted at `/api/users` from `artifacts/api-server/src/routes/index.ts`

Implemented backend features:

- List users
- Get user by ID
- Create user
- Update user profile/role/status
- Activate/deactivate user
- Reset another user’s password
- Delete user
- User statistics
- Search
- Pagination
- Sorting
- Role filter
- Active/inactive filter
- Password strength validation
- bcrypt password hashing
- Role hierarchy enforcement
- OWNER protection
- Self-protection
- Audit logging for sensitive user-management events

### Frontend

File:

- `artifacts/erp/src/pages/users.tsx`

Route:

- `/users`

Implemented frontend features:

- Statistics cards
- Search
- Role filter
- Status filter
- Sorting
- Pagination
- Create user dialog
- Edit user dialog
- Reset password dialog
- Activate/deactivate confirmations
- Delete confirmation
- Role badges
- Active/inactive status badges
- Permission-aware actions
- English and Arabic translations
- RTL-compatible layout utilities

### Statistics

The module exposes:

- Total users
- Active users
- Inactive users
- Count by role

Endpoint:

- `GET /api/users/statistics`

### Role hierarchy

Current hierarchy:

```text
OWNER > ADMIN > MANAGER > SALES > WAREHOUSE
```

Rules:

- Users may generally act only on lower-ranked users.
- OWNER can create another OWNER.
- ADMIN can manage MANAGER and below.
- MANAGER can manage SALES and WAREHOUSE.
- SALES and WAREHOUSE have read access only for user-management routes.

### Owner protection

- OWNER accounts cannot be deleted.
- The last active OWNER cannot be deactivated.
- Only OWNER can create another OWNER.
- OWNER accounts require OWNER-level authority for sensitive changes.

### Self protection

- A user cannot delete their own account.
- A user cannot deactivate their own account.
- A user cannot change their own role.
- The admin password reset endpoint blocks self-reset.
- A future self-service password-change flow should require the old password.

### Password reset

- Managers and above may reset passwords for lower-ranked users.
- Passwords must pass strength validation before hashing.
- Passwords are hashed with bcrypt.
- Passwords are never returned in API responses.
- Password reset is audit-logged without logging password values.

### Audit logging

Audit logging uses structured application logs through `artifacts/api-server/src/lib/audit.ts`.

Covered events:

- `USER_CREATED`
- `USER_DELETED`
- `USER_ACTIVATED`
- `USER_DEACTIVATED`
- `USER_ROLE_CHANGED`
- `USER_PASSWORD_RESET`

Audit logs include actor ID, target ID, old/new non-sensitive values where applicable, timestamp, and client IP where available.

Current limitation: audit logs are not persisted to a dedicated database table.

### Security patch integration

The Users module includes the security patch work:

- Authentication middleware performs live database verification on every authenticated request.
- Deactivated users are blocked immediately on their next request.
- Role is read from the database in middleware instead of trusting the JWT role claim.
- Inactive user login returns `403`.
- Inactive user refresh returns `403`.
- Invalid credentials and invalid refresh tokens continue to return `401`.
- Self-reset through the admin password reset endpoint is blocked.

---

## 4. Authentication and Authorization

Authentication is complete.

Implemented files:

- `artifacts/api-server/src/modules/auth/auth.routes.ts`
- `artifacts/api-server/src/modules/auth/auth.controller.ts`
- `artifacts/api-server/src/modules/auth/auth.service.ts`
- `artifacts/api-server/src/modules/auth/auth.repository.ts`
- `artifacts/api-server/src/lib/jwt.ts`
- `artifacts/api-server/src/middlewares/authenticate.ts`
- `artifacts/api-server/src/middlewares/authorize.ts`

### JWT

- Access tokens are issued on login and refresh.
- Refresh tokens are issued on login and refresh.
- Frontend stores tokens in localStorage:
  - `erp_access_token`
  - `erp_refresh_token`

### Refresh tokens

- `/api/auth/refresh` accepts a refresh token and returns a fresh token pair.
- Frontend `auth-refresh.ts` deduplicates in-flight refresh attempts.
- `api.ts` retries once after a `401` by attempting token refresh.

### Password hashing

- Passwords are stored as `passwordHash`.
- bcrypt is used for password comparison and hashing.
- Plain text passwords are never returned from the API.

### Session hydration

Frontend `AuthHydrator` in `artifacts/erp/src/App.tsx` validates stored tokens on page refresh:

1. Try `/api/auth/me` with the stored access token.
2. If access token is expired, attempt refresh.
3. If refresh succeeds, retry `/me`.
4. If validation fails, clear auth state and redirect to login.

### Authorization

Role guards are centralized in:

- `artifacts/api-server/src/middlewares/authorize.ts`

Patterns used:

- Reads: usually `hasMinRole('WAREHOUSE')`
- Writes: usually `OWNER`, `ADMIN`, or `MANAGER`
- Deletes: usually `OWNER` or `ADMIN`
- Users and Suppliers use `hasMinRole(...)` route guards plus service-level business rules.

### Inactive user protection

The authentication middleware now performs a live user lookup by `id` on every authenticated request:

- If the user no longer exists, request is rejected.
- If the user is inactive, request is rejected with `403`.
- The active role is loaded from the database, so role changes take effect immediately.

---

## 5. Database

Current Prisma schema:

- File: `artifacts/api-server/prisma/schema.prisma`
- Migration: `artifacts/api-server/prisma/migrations/20260717191426_init/`
- Provider: PostgreSQL
- Prisma: v5

### Enumerations

```text
UserRole: OWNER | ADMIN | MANAGER | SALES | WAREHOUSE
PurchaseStatus: DRAFT | CONFIRMED | RECEIVED | CANCELLED
SaleStatus: DRAFT | CONFIRMED | INVOICED | CANCELLED
DeliveryStatus: PENDING | IN_TRANSIT | DELIVERED | CANCELLED
PaymentType: RECEIPT | PAYMENT
PaymentMethod: CASH | BANK_TRANSFER | CHEQUE | CREDIT_CARD
```

### Current tables/models

- `roles`
- `users`
- `categories`
- `brands`
- `units`
- `products`
- `customers`
- `suppliers`
- `purchases`
- `purchase_items`
- `sales`
- `sale_items`
- `delivery_orders`
- `delivery_order_items`
- `payments`

### User schema facts

Do not invent direct user fields that do not exist.

Current user model uses:

- `email`
- `passwordHash` mapped to `password_hash`
- `name`
- `nameAr` mapped to `name_ar`
- `roleId` mapped to `role_id`
- `role` relation to `Role`
- `isActive` mapped to `is_active`
- `lastLoginAt` mapped to `last_login_at`
- `createdAt`
- `updatedAt`

Important: users do not have a direct scalar `role` column and do not have a `password` column. Code must use the `Role` relation and `passwordHash`.

### Decimal precision

All monetary and quantity values use:

```text
Decimal(15,3)
```

The API serializes decimal values as strings using 3 decimal places where implemented.

---

## 6. Project Architecture

### Backend architecture

The backend follows this pattern:

```text
Controller → Service → Repository → Prisma → PostgreSQL
```

Rules:

- Controllers handle HTTP input/output only.
- Controllers call services.
- Services contain validation and business logic.
- Services call repositories.
- Repositories contain Prisma database calls.
- Controllers must not call Prisma directly.
- Services must not depend on Express request/response objects.

### Backend module structure

Each implemented module follows this shape:

```text
artifacts/api-server/src/modules/<module>/
  <module>.routes.ts
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
```

### Frontend architecture

Frontend uses:

- Wouter for routing
- Zustand for auth state
- TanStack Query for server state
- `artifacts/erp/src/lib/api.ts` for manual API calls
- `@workspace/api-client-react` generated hooks only for auth endpoints
- shadcn/ui components
- i18next for English/Arabic translations

### Translation system

Translations live in:

- `artifacts/erp/src/i18n.ts`

Rules:

- Add every user-facing string in both English and Arabic.
- Preserve RTL support.
- Do not hardcode labels inside new pages unless there is a technical reason.

### Folder structure

Important paths:

```text
artifacts/api-server/                 Express API
artifacts/api-server/prisma/          Prisma schema, migrations, seed
artifacts/api-server/src/routes/      Central route registry and health route
artifacts/api-server/src/modules/     Backend feature modules
artifacts/api-server/src/middlewares/ Auth, authorization, error handling
artifacts/api-server/src/lib/         JWT, Prisma, logging, audit utilities

artifacts/erp/                        React frontend
artifacts/erp/src/pages/              Frontend pages
artifacts/erp/src/components/         Layout and UI components
artifacts/erp/src/lib/                API helper, auth store, shared types
artifacts/erp/src/hooks/              React hooks

lib/api-client-react/                 Generated auth hooks
lib/api-spec/                         OpenAPI spec
lib/api-zod/                          Generated Zod schemas
```

---

## 7. Implemented API Modules

All application routes are mounted under `/api`.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/healthz` | Public | Health check |

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/logout` | Bearer | Logout endpoint |
| POST | `/api/auth/refresh` | Public | Refresh token pair |
| GET | `/api/auth/me` | Bearer | Current user profile |

### Categories — `/api/categories`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/categories` | WAREHOUSE | List with search/pagination/status filter |
| GET | `/api/categories/:id` | WAREHOUSE | Get one |
| POST | `/api/categories` | MANAGER | Create |
| PUT | `/api/categories/:id` | MANAGER | Update |
| DELETE | `/api/categories/:id` | ADMIN | Delete; blocked when products exist |

### Brands — `/api/brands`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/brands` | WAREHOUSE | List with search/pagination/status filter |
| GET | `/api/brands/:id` | WAREHOUSE | Get one |
| POST | `/api/brands` | MANAGER | Create |
| PUT | `/api/brands/:id` | MANAGER | Update |
| DELETE | `/api/brands/:id` | ADMIN | Delete; blocked when products exist |

### Units — `/api/units`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/units` | WAREHOUSE | List with search/pagination/status filter |
| GET | `/api/units/:id` | WAREHOUSE | Get one |
| POST | `/api/units` | MANAGER | Create |
| PUT | `/api/units/:id` | MANAGER | Update |
| DELETE | `/api/units/:id` | ADMIN | Delete; blocked when products exist |

### Products — `/api/products`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/products` | WAREHOUSE | List with search, pagination, category/brand/status filters |
| GET | `/api/products/:id` | WAREHOUSE | Get one with category, brand, unit |
| POST | `/api/products` | MANAGER | Create |
| PUT | `/api/products/:id` | MANAGER | Update |
| DELETE | `/api/products/:id` | ADMIN | Delete; blocked when referenced by purchase/sale items |

### Customers — `/api/customers`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/customers` | WAREHOUSE | List with search/pagination |
| GET | `/api/customers/:id` | WAREHOUSE | Get one |
| POST | `/api/customers` | MANAGER | Create with validation and duplicate prevention |
| PUT | `/api/customers/:id` | MANAGER | Update with duplicate-safe validation |
| DELETE | `/api/customers/:id` | ADMIN | Delete; blocked when linked to sales |

### Suppliers — `/api/suppliers`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/suppliers/statistics` | WAREHOUSE | Supplier statistics |
| GET | `/api/suppliers` | WAREHOUSE | List with search, status filter, pagination |
| GET | `/api/suppliers/:id` | WAREHOUSE | Get one |
| POST | `/api/suppliers` | MANAGER | Create |
| PUT | `/api/suppliers/:id` | MANAGER | Update |
| DELETE | `/api/suppliers/:id` | ADMIN | Delete; blocked when linked records exist |

### Users — `/api/users`

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/api/users/statistics` | MANAGER | User statistics |
| GET | `/api/users` | WAREHOUSE | List with search, role/status filters, sorting, pagination |
| GET | `/api/users/:id` | WAREHOUSE | Get one |
| POST | `/api/users` | MANAGER | Create user; service enforces hierarchy |
| PUT | `/api/users/:id` | MANAGER | Update profile, role, status |
| PATCH | `/api/users/:id/status` | MANAGER | Activate/deactivate user |
| PATCH | `/api/users/:id/password` | MANAGER | Reset another user’s password |
| DELETE | `/api/users/:id` | ADMIN | Delete user; service enforces owner/self protection |

### Standard response envelope

List responses:

```json
{ "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "pages": 0 } }
```

Single/create/update responses:

```json
{ "data": {} }
```

Errors:

```json
{ "message": "Human readable error", "code": "ERROR_CODE", "details": {} }
```

Validation errors may include field-level errors under `details.errors`.

---

## 8. Frontend Pages

### Completed pages

- `/login` — login form
- `/` — dashboard placeholder
- `/categories` — complete category management
- `/brands` — complete brand management
- `/units` — complete unit management
- `/products` — complete product management
- `/customers` — complete customer management
- `/suppliers` — complete supplier management
- `/users` — complete user management

### Placeholder / incomplete pages

- `/settings` — placeholder only

### Not implemented pages

These modules do not currently have active routes/pages:

- Purchases
- Sales
- Delivery Orders
- Payments
- Reports

Sidebar links for not-started transaction/finance/report modules remain disabled.

---

## 9. Business Rules Implemented

### Global rules

- Completed modules use role-based access control.
- Read endpoints generally require at least WAREHOUSE.
- Create/update endpoints generally require MANAGER or above.
- Delete endpoints generally require ADMIN or above.
- Delete operations are blocked when dependent records exist.
- User-facing named entities support English and Arabic fields where applicable.
- Monetary and quantity values use KWD 3-decimal precision.

### Product catalogue

- Categories, brands, and units cannot be deleted when linked to products.
- Products cannot be deleted when referenced by purchase or sale items.
- Product prices and stock quantities use 3-decimal decimal precision.

### Customers

- Customer code is unique.
- Customer code can be generated automatically.
- Duplicate phone/email records are prevented.
- Customer delete is blocked when linked sales exist.

### Suppliers

- Supplier code is unique.
- Supplier code can be generated automatically.
- Duplicate phone/email records are prevented.
- Supplier delete is blocked when linked purchase/payment records exist.
- Supplier balance is serialized as a 3-decimal string.

### Users

- Role hierarchy is enforced in the service layer.
- OWNER accounts cannot be deleted.
- The last active OWNER cannot be deactivated.
- Users cannot delete themselves.
- Users cannot deactivate themselves.
- Users cannot change their own role.
- Admin password reset cannot be used for self-reset.
- Passwords must be strong before hashing:
  - at least 8 characters
  - uppercase letter
  - lowercase letter
  - number
  - special character
- Passwords are hashed with bcrypt.
- Passwords are not returned in API responses.
- Sensitive user-management actions are audit-logged.

### Authentication

- Incorrect credentials return `401`.
- Correct credentials for inactive users return `403`.
- Refresh token for inactive users returns `403`.
- Authenticated requests verify live database user status.
- Role changes take effect immediately because middleware reads role from the database.

---

## 10. Known Limitations

Only current, confirmed limitations are listed here.

- Dashboard is still a placeholder; real KPIs are not implemented.
- Purchases API and UI are not implemented.
- Sales API and UI are not implemented.
- Delivery Orders API and UI are not implemented.
- Payments API and UI are not implemented.
- Reports are not implemented.
- Settings page is a placeholder; no settings backend exists.
- Audit logs are emitted to structured logs but are not persisted in an audit table.
- Self-service “change my password” flow is not implemented.
- Token-version invalidation is not implemented.
- Login/refresh rate limiting is not implemented.
- Refresh token rotation/storage is not implemented.
- Generated OpenAPI client is currently used for auth only; implemented business modules use manual API calls.

---

## 11. Next Implementation Priority

Recommended roadmap from the current project state:

1. Purchases
   - Purchase orders
   - Draft → confirmed → received workflow
   - Supplier linkage
   - Product line items
   - On RECEIVED: increment product stock in a Prisma transaction

2. Sales
   - Sales invoices/orders
   - Draft → confirmed → invoiced workflow
   - Customer linkage
   - Product line items
   - Stock validation
   - On CONFIRMED: decrement product stock in a Prisma transaction
   - Credit limit enforcement

3. Delivery Orders
   - Link to sales where applicable
   - PENDING → IN_TRANSIT → DELIVERED workflow

4. Payments
   - Receipts from customers
   - Payments to suppliers
   - Customer/supplier balance updates

5. Reports
   - Sales by period
   - Inventory valuation
   - Supplier payables
   - Customer receivables
   - Product profitability

6. Settings
   - Company profile
   - Logo
   - VAT/tax registration
   - Numbering sequence configuration

7. Dashboard
   - Replace placeholder cards with real operational KPIs

---

## 12. AI Implementation Guidelines

Future AI agents must follow these rules:

1. Read the current project before coding.
2. Treat this `PROJECT_STATUS.md` as the project state guide, but verify against code before making changes.
3. Never rewrite completed modules unless explicitly instructed.
4. Never modify unrelated modules.
5. Preserve the Controller → Service → Repository → Prisma architecture.
6. Always adapt to the current Prisma schema.
7. Do not invent fields such as `User.role` or `User.password`; use `Role` relation and `passwordHash`.
8. Register new API routes only through `artifacts/api-server/src/routes/index.ts`.
9. Add frontend routes in `artifacts/erp/src/App.tsx`.
10. Add sidebar links only when the module is actually usable.
11. Add every user-facing frontend string to `artifacts/erp/src/i18n.ts` in English and Arabic.
12. Use `artifacts/erp/src/lib/api.ts` for manual business-module API calls.
13. Use TanStack Query for list/detail/mutation server state.
14. Preserve auth token key names:
    - `erp_access_token`
    - `erp_refresh_token`
15. Keep decimal values as strings on the frontend where the API returns serialized decimals.
16. Use Prisma transactions for workflows that update stock or financial balances.
17. Run typecheck/build verification after implementation when possible.

---

## 13. Changelog

### July 21, 2026

- Users module completed and integrated.
- `/api/users` route registered.
- Users frontend page completed.
- Users statistics added.
- Role hierarchy and user-management permissions documented.
- Security patch integrated:
  - live DB check in authentication middleware
  - inactive users blocked after deactivation
  - inactive login/refresh returns `403`
  - role sourced from database during authenticated requests
  - self-reset through admin password endpoint blocked
- Audit logging added for sensitive user-management actions.
- Frontend API helper supports PATCH and validation error forwarding.
- Project status updated to reflect current modules, architecture, database schema, APIs, frontend pages, limitations, and next roadmap.

### July 20, 2026 and earlier

- Authentication implemented.
- Product catalogue foundation implemented:
  - Categories
  - Brands
  - Units
  - Products
- Customers implemented.
- Suppliers implemented.
- Bilingual frontend foundation implemented.
- Session hydration and token refresh implemented.

---

## 14. Verification Commands

Most recent verification after Users integration:

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/erp typecheck
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/erp build
```

Results:

- API typecheck passed.
- Frontend typecheck passed.
- API build passed.
- Frontend build passed.

Observed frontend build warnings:

- Vite sourcemap warnings in some UI components.
- Bundle chunk-size warning above 500 kB.

These warnings were not build-blocking.

---

## 15. Current Local Login Credentials

Seed defaults:

| Field | Value |
|---|---|
| URL | `http://localhost:3000` |
| Email | `admin@albunyan.com` |
| Password | `Admin@1234` |
| Role | `OWNER` |

Change the default password before any non-local deployment.

ERP Numbering Rules section

Customer
CUS-000001

Supplier
SUP-000001

Purchase
PUR-000001

Sale
SAL-000001

Delivery Order
DO-000001

Payment
PAY-000001


Inventory Rules

Draft Purchase
↓

No stock movement

Confirmed Purchase
↓

No stock movement (if that's your design)

Received Purchase
↓

Increase inventory

Cancelled Purchase
↓

No stock movement

Editing Received Purchase
↓

Adjust inventory difference

Deleting Received Purchase
↓

Blocked or requires reversal


Financial Rules


Currency:
KWD

Precision:
3 decimals

Tax calculation:
Per line

Discount:
Per line

Grand Total:

Subtotal

↓

Discount

↓

Tax

↓

Grand Total



