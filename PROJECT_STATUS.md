# Al-Bunyan ERP — Project Status

> **Date:** July 18, 2026  
> **Stack:** React 19 + Vite 7 + Express 5 + Prisma v5 + PostgreSQL  
> **Company:** Hardware & Building Materials Trading Company, Kuwait  
> **Deployment model:** Multi-client — separate deployment per client, not a SaaS product.

---

## 1. Overall Completion

```
Product Catalogue (Foundation)  ████████████████████  100%
Authentication                  ████████████████████  100%
Users Module (UI shell only)    ████░░░░░░░░░░░░░░░░   20%
Dashboard                       ██░░░░░░░░░░░░░░░░░░   10%  (placeholder only)
Customers                       ░░░░░░░░░░░░░░░░░░░░    0%
Suppliers                       ░░░░░░░░░░░░░░░░░░░░    0%
Purchases                       ░░░░░░░░░░░░░░░░░░░░    0%
Sales                           ░░░░░░░░░░░░░░░░░░░░    0%
Delivery Orders                 ░░░░░░░░░░░░░░░░░░░░    0%
Payments                        ░░░░░░░░░░░░░░░░░░░░    0%
Reports                         ░░░░░░░░░░░░░░░░░░░░    0%

Overall project estimate:  ~20% complete
```

---

## 2. Completed Modules

| Module | Backend API | Frontend UI | Notes |
|---|---|---|---|
| **Authentication** | ✅ | ✅ | Login, logout, JWT refresh, session restore on page refresh |
| **Categories** | ✅ | ✅ | Full CRUD, search, pagination, soft-delete guard |
| **Brands** | ✅ | ✅ | Full CRUD, search, pagination, soft-delete guard |
| **Units** | ✅ | ✅ | Full CRUD, search, pagination, soft-delete guard |
| **Products** | ✅ | ✅ | Full CRUD, search, filter by category / brand / status, KWD pricing |

---

## 3. Pending Modules

| Module | Priority | Depends On | Notes |
|---|---|---|---|
| **Users Management** | High | Auth | UI page is a placeholder; API not built |
| **Customers** | High | — | Schema exists; no API or UI |
| **Suppliers** | High | — | Schema exists; no API or UI |
| **Purchases** | High | Suppliers, Products | Schema exists; no API or UI |
| **Sales / Invoices** | High | Customers, Products | Schema exists; no API or UI |
| **Delivery Orders** | Medium | Sales | Schema exists; no API or UI |
| **Payments** | Medium | Sales, Customers, Suppliers | Schema exists; no API or UI |
| **Dashboard** | Medium | All modules | Currently shows placeholder cards |
| **Settings** | Low | — | UI page is a placeholder; no backend |
| **Reports** | Low | All transaction modules | Not started |

> **Important:** The database schema for ALL pending modules is already designed and fully
> migrated. Only the API routes and frontend pages need to be built.

---

## 4. Database Schema

Migration file: `artifacts/api-server/prisma/migrations/20260717191426_init/`

### Enumerations

```sql
UserRole:       OWNER | ADMIN | MANAGER | SALES | WAREHOUSE
PurchaseStatus: DRAFT | CONFIRMED | RECEIVED | CANCELLED
SaleStatus:     DRAFT | CONFIRMED | INVOICED | CANCELLED
DeliveryStatus: PENDING | IN_TRANSIT | DELIVERED | CANCELLED
PaymentType:    RECEIPT | PAYMENT
PaymentMethod:  CASH | BANK_TRANSFER | CHEQUE | CREDIT_CARD
```

### Tables

```
roles              — id, name (UserRole), description
users              — id, email, password_hash, name, name_ar, role_id → roles,
                     is_active, last_login_at
categories         — id, name, name_ar, description, is_active
brands             — id, name, name_ar, logo_url, is_active
units              — id, name, name_ar, abbreviation, is_active
products           — id, sku, name, name_ar, description,
                     category_id → categories, brand_id → brands, unit_id → units,
                     cost_price DECIMAL(15,3),    ← KWD
                     selling_price DECIMAL(15,3), ← KWD
                     stock_quantity DECIMAL(15,3),
                     reorder_level DECIMAL(15,3), is_active
customers          — id, code, name, name_ar, phone, email, address,
                     credit_limit DECIMAL(15,3), balance DECIMAL(15,3), is_active
suppliers          — id, code, name, name_ar, phone, email, address,
                     balance DECIMAL(15,3), is_active
purchases          — id, number (PO-YYYY-NNNN), supplier_id, user_id,
                     status PurchaseStatus, purchase_date,
                     total_amount, discount, tax, net_amount (all KWD), notes
purchase_items     — id, purchase_id → purchases (CASCADE), product_id,
                     quantity, unit_price, total (all KWD)
sales              — id, number (INV-YYYY-NNNN), customer_id, user_id,
                     status SaleStatus, sale_date,
                     total_amount, discount, tax, net_amount (all KWD), notes
sale_items         — id, sale_id → sales (CASCADE), product_id,
                     quantity, unit_price, total (all KWD)
delivery_orders    — id, number (DO-YYYY-NNNN), sale_id → sales (nullable),
                     status DeliveryStatus, delivery_date, address, notes
delivery_order_items — id, delivery_order_id → delivery_orders (CASCADE),
                       product_id, quantity
payments           — id, number (PAY-YYYY-NNNN), type PaymentType,
                     method PaymentMethod, customer_id (nullable), supplier_id (nullable),
                     sale_id (nullable), user_id, amount KWD,
                     payment_date, reference, notes
```

**Decimal precision rule:** All monetary and quantity values are `Decimal(15,3)` throughout.
The API serialises them via `.toFixed(3)` — the frontend receives them as strings (never floats).

---

## 5. Implemented API Endpoints

All routes are mounted under `/api`. The server listens on port **8080**.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/healthz` | Public | Returns `{ status: "ok" }` |

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Returns `{ user, tokens: { accessToken, refreshToken } }` |
| `POST` | `/api/auth/refresh` | Public | Body: `{ refreshToken }` → returns new token pair |
| `GET` | `/api/auth/me` | Bearer | Returns current user profile |
| `POST` | `/api/auth/logout` | Bearer | Invalidates server-side session |

### Categories — `/api/categories`

| Method | Path | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/categories` | WAREHOUSE | List all; supports `?search=`, `?page=`, `?limit=`, `?isActive=` |
| `GET` | `/api/categories/:id` | WAREHOUSE | Single category |
| `POST` | `/api/categories` | MANAGER | Create |
| `PUT` | `/api/categories/:id` | MANAGER | Update |
| `DELETE` | `/api/categories/:id` | ADMIN | Delete — blocked if products exist |

### Brands — `/api/brands`

| Method | Path | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/brands` | WAREHOUSE | List all; supports `?search=`, `?page=`, `?limit=`, `?isActive=` |
| `GET` | `/api/brands/:id` | WAREHOUSE | Single brand |
| `POST` | `/api/brands` | MANAGER | Create |
| `PUT` | `/api/brands/:id` | MANAGER | Update |
| `DELETE` | `/api/brands/:id` | ADMIN | Delete — blocked if products exist |

### Units — `/api/units`

| Method | Path | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/units` | WAREHOUSE | List all; supports `?search=`, `?page=`, `?limit=`, `?isActive=` |
| `GET` | `/api/units/:id` | WAREHOUSE | Single unit |
| `POST` | `/api/units` | MANAGER | Create |
| `PUT` | `/api/units/:id` | MANAGER | Update |
| `DELETE` | `/api/units/:id` | ADMIN | Delete — blocked if products exist |

### Products — `/api/products`

| Method | Path | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/products` | WAREHOUSE | List all; supports `?search=`, `?page=`, `?limit=`, `?categoryId=`, `?brandId=`, `?isActive=` |
| `GET` | `/api/products/:id` | WAREHOUSE | Single product with nested category, brand, unit |
| `POST` | `/api/products` | MANAGER | Create |
| `PUT` | `/api/products/:id` | MANAGER | Update |
| `DELETE` | `/api/products/:id` | ADMIN | Delete — blocked if referenced in purchase/sale items |

### Standard response envelope

```jsonc
// List
{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 20, "pages": 3 } }

// Single
{ "data": { ... } }

// Error
{ "message": "Human readable error", "errors": [...] }  // 400 includes field errors
```

---

## 6. Folder Structure

```
/                                       ← Monorepo root (pnpm workspace)
├── artifact.toml                       ← Replit artifact registry
├── pnpm-workspace.yaml
├── package.json
├── README.md                           ← Local development guide
├── PROJECT_STATUS.md                   ← This file
│
├── artifacts/
│   ├── api-server/                     ← Express REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma           ← Full 15-table schema
│   │   │   ├── seed.ts                 ← Idempotent seed (roles + owner user)
│   │   │   └── migrations/
│   │   │       └── 20260717191426_init/
│   │   ├── src/
│   │   │   ├── app.ts                  ← Express app setup (CORS, logging, routes)
│   │   │   ├── index.ts                ← Server entry point
│   │   │   ├── errors/
│   │   │   │   └── AppError.ts         ← AppError, UnauthorizedError, ForbiddenError,
│   │   │   │                               NotFoundError, ValidationError, ConflictError
│   │   │   ├── types/
│   │   │   │   └── index.ts            ← UserRole, JwtPayload, AuthUser; augments req.user
│   │   │   ├── lib/
│   │   │   │   ├── jwt.ts              ← signAccessToken, signRefreshToken, verifyToken
│   │   │   │   ├── logger.ts           ← Pino logger instance
│   │   │   │   └── prisma.ts           ← Singleton PrismaClient
│   │   │   ├── middlewares/
│   │   │   │   ├── authenticate.ts     ← Bearer JWT → req.user (throws 401 on failure)
│   │   │   │   ├── authorize.ts        ← hasRole(...roles) | hasMinRole(minRole)
│   │   │   │   └── errorHandler.ts     ← Centralized error handler (must be last app.use)
│   │   │   ├── modules/
│   │   │   │   ├── auth/               ← login | logout | refresh | me
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.repository.ts
│   │   │   │   │   └── auth.routes.ts
│   │   │   │   ├── categories/         ← Full CRUD — same 4-file pattern
│   │   │   │   ├── brands/             ← Full CRUD — same 4-file pattern
│   │   │   │   ├── units/              ← Full CRUD — same 4-file pattern
│   │   │   │   └── products/           ← Full CRUD — same 4-file pattern
│   │   │   └── routes/
│   │   │       ├── index.ts            ← Mounts all routers under /api
│   │   │       └── health.ts           ← GET /api/healthz
│   │   ├── .env.example
│   │   ├── build.mjs                   ← esbuild script
│   │   └── package.json
│   │
│   └── erp/                            ← React + Vite frontend
│       ├── src/
│       │   ├── main.tsx                ← React root
│       │   ├── App.tsx                 ← Router, AuthHydrator, ProtectedRoute, QueryClient
│       │   ├── i18n.ts                 ← i18next setup — EN + AR translation keys
│       │   ├── index.css               ← Tailwind v4 theme + .form-input / .btn-primary etc.
│       │   ├── lib/
│       │   │   ├── api.ts              ← fetch wrapper (auto-refresh on 401, retry once)
│       │   │   ├── auth-refresh.ts     ← Singleton refresh with in-flight deduplication
│       │   │   ├── store.ts            ← Zustand auth store (isAuthenticated, isHydrating)
│       │   │   ├── types.ts            ← TS interfaces: Category, Brand, Unit, Product,
│       │   │   │                           PaginatedResponse
│       │   │   └── utils.ts            ← shadcn/ui cn() helper
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   └── app-layout.tsx  ← Sidebar, breadcrumbs, RTL toggle
│       │   │   └── ui/                 ← Full shadcn/ui component library + custom:
│       │   │       ├── confirm-dialog.tsx  ← Reusable destructive-action confirm dialog
│       │   │       └── ...             ← All other shadcn/ui components
│       │   ├── hooks/
│       │   │   ├── use-mobile.tsx
│       │   │   └── use-toast.ts
│       │   └── pages/
│       │       ├── login.tsx           ← Login form
│       │       ├── dashboard.tsx       ← Placeholder summary cards
│       │       ├── categories.tsx      ← Full CRUD page
│       │       ├── brands.tsx          ← Full CRUD page
│       │       ├── units.tsx           ← Full CRUD page
│       │       ├── products.tsx        ← Full CRUD page
│       │       ├── users.tsx           ← Placeholder (not implemented)
│       │       ├── settings.tsx        ← Placeholder (not implemented)
│       │       └── not-found.tsx       ← 404 page
│       ├── .env.example
│       └── package.json
│
└── lib/                                ← Shared workspace packages
    ├── api-client-react/               ← Orval-generated React Query hooks (auth only)
    ├── api-spec/                       ← OpenAPI spec
    └── api-zod/                        ← Shared Zod schemas
```

---

## 7. Authentication Flow

### Login

```
User submits credentials
  → POST /api/auth/login
  → Server validates email/password, checks isActive flag
  → Returns { user, tokens: { accessToken (15 min), refreshToken (7 days) } }
  → Frontend stores both tokens in localStorage under keys:
      erp_access_token
      erp_refresh_token
  → Zustand store: isAuthenticated = true, isHydrating = false
  → Navigate to /
```

### Page refresh / startup hydration

```
App mounts → AuthHydrator runs
  → Tokens in localStorage? → isHydrating = true → show loading spinner
  → GET /api/auth/me with stored access token
  → 200 OK → tokens valid → login() → isAuthenticated = true → render app
  → 401 → call attemptTokenRefresh()
      → POST /api/auth/refresh with stored refresh token
      → Success → new token pair stored → retry GET /api/auth/me → login()
      → Failure → triggerLogout() → clear localStorage → navigate to /login
```

### Automatic token refresh during use

```
api.ts fetch wrapper:
  → Attach Bearer token to every request
  → 401 response received
      → attemptTokenRefresh() (singleton — deduplicates concurrent calls)
      → Retry original request once with fresh token
      → Second 401 → triggerLogout() → /login
```

### Logout

```
User clicks logout
  → POST /api/auth/logout (invalidates server session)
  → localStorage cleared
  → Zustand store reset: isAuthenticated = false
  → Navigate to /login
```

### Key implementation files

| File | Purpose |
|---|---|
| `artifacts/erp/src/lib/store.ts` | Zustand auth state — `isAuthenticated`, `isHydrating` |
| `artifacts/erp/src/lib/auth-refresh.ts` | Singleton refresh with in-flight deduplication |
| `artifacts/erp/src/lib/api.ts` | fetch wrapper with automatic retry on 401 |
| `artifacts/erp/src/App.tsx` | `AuthHydrator` + `ProtectedRoute` components |
| `artifacts/api-server/src/lib/jwt.ts` | Token signing and verification |
| `artifacts/api-server/src/middlewares/authenticate.ts` | Bearer → `req.user` |

---

## 8. User Roles and Permissions

### Hierarchy (lowest → highest)

```
WAREHOUSE < SALES < MANAGER < ADMIN < OWNER
```

### Permission matrix

| Action | WAREHOUSE | SALES | MANAGER | ADMIN | OWNER |
|---|:---:|:---:|:---:|:---:|:---:|
| Read catalogue (categories, brands, units, products) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit catalogue | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete catalogue records | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create / edit sales orders | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage inventory / delivery | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve transactions / reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage users & settings | ❌ | ❌ | ❌ | ✅ | ✅ |

### Middleware helpers (backend)

```typescript
// Exact role match (whitelist)
hasRole('OWNER', 'ADMIN', 'MANAGER')   // any of these specific roles

// Hierarchical — the role or anything above it
hasMinRole('WAREHOUSE')                // everyone
hasMinRole('MANAGER')                  // MANAGER, ADMIN, OWNER
```

Both helpers are Express middleware factory functions in
`artifacts/api-server/src/middlewares/authorize.ts`.

### Delete guards

Catalogue records cannot be deleted while they are referenced by products or transactions.
The service layer checks for related records and throws a `ConflictError` (409) if any exist.

---

## 9. Frontend Routes

Managed by **Wouter**. All routes except `/login` are wrapped in `ProtectedRoute`.

| Path | Component | Status |
|---|---|---|
| `/login` | `Login` | ✅ Fully implemented |
| `/` | `Dashboard` | ⚠️ Placeholder cards |
| `/categories` | `Categories` | ✅ Fully implemented |
| `/brands` | `Brands` | ✅ Fully implemented |
| `/units` | `Units` | ✅ Fully implemented |
| `/products` | `Products` | ✅ Fully implemented |
| `/users` | `Users` | ⚠️ Placeholder — no real content |
| `/settings` | `Settings` | ⚠️ Placeholder — no real content |
| `*` | `NotFound` | ✅ 404 page |

The router base is `import.meta.env.BASE_URL` (set at build time via `BASE_PATH` env var).
On Replit the base is `/`; for reverse-proxy sub-path deployments set `BASE_PATH=/erp/` etc.

---

## 10. Known Bugs

### Minor

1. **`products.tsx` form submission sends raw string values.**  
   The form's `onSubmit` handler passes the raw `FormData`-style object (where number fields
   are still strings) to the `POST /api/products` body. The backend service coerces these
   strings to `Decimal` before writing to the database, so the behaviour is correct — but it
   is a code smell. The fix is to parse `costPrice`, `sellingPrice`, `stockQuantity`, and
   `reorderLevel` to `Number` in the submit handler before calling `api.post()`.

2. **Dashboard stat cards are hardcoded.**  
   The four summary cards on the dashboard show static dummy numbers. They have no real API
   calls behind them.

3. **Users page is a placeholder.**  
   Navigating to `/users` renders a "Coming Soon" shell. No user listing, creation, or role
   management is implemented.

4. **Settings page is a placeholder.**  
   Navigating to `/settings` renders a "Coming Soon" shell.

### Environment-specific (Replit only)

5. **JWT secrets not set.**  
   `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are not configured as Replit secrets.
   The server currently falls back to weak hardcoded default strings defined in
   `artifacts/api-server/src/lib/jwt.ts`. These **must** be set before any real use.

6. **Database not migrated in the Replit environment.**  
   The migration file exists but `prisma migrate deploy` and `pnpm run seed` have not been
   run in the hosted Replit instance. The API server will crash on any database request until
   this is done.

---

## 11. Technical Debt

| Item | Severity | Notes |
|---|---|---|
| No input validation on API bodies | High | The backend reads request bodies directly without Zod or class-validator. Add validation middleware to each module's `POST` / `PUT` routes. |
| No rate limiting | High | The `/api/auth/login` and `/api/auth/refresh` endpoints have no brute-force protection. Add `express-rate-limit`. |
| No refresh token rotation blacklist | Medium | After a token is used for refresh, the old refresh token remains valid until it expires (7 days). A Redis or DB-backed denylist should be added for production. |
| Orval codegen only covers auth | Medium | `lib/api-client-react/` has generated hooks for auth endpoints only. New modules use the manual `api.ts` wrapper. Either extend the OpenAPI spec to cover all modules and regenerate, or remove Orval and standardise on the manual wrapper. |
| Stock quantity not updated on purchase/sale | Medium | The `products.stockQuantity` field exists but nothing increments or decrements it when a Purchase is received or a Sale is confirmed. This logic must be added to the purchase and sale services. |
| `products.tsx` sends string prices | Low | See Known Bugs §1. A one-line fix in the submit handler. |
| No pagination on sidebar nav | Low | The sidebar has all future modules listed as disabled items. When a new module is activated it must be enabled in `app-layout.tsx`. |
| No error boundary | Low | A React `ErrorBoundary` around the router would prevent the entire app from crashing on an unhandled render error. |
| Pino logger writes to stdout only | Low | In production, consider adding a pino transport for a log aggregation service. |

---

## 12. Environment Variables

### API Server (`artifacts/api-server/.env`)

| Variable | Required | Default / Example | Notes |
|---|---|---|---|
| `PORT` | ✅ | `8080` | |
| `NODE_ENV` | ✅ | `development` | Set to `production` in deployment |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/albunyan_erp` | Prisma connection string |
| `JWT_ACCESS_SECRET` | ✅ | *(none — must be set)* | 64+ random chars; generate with `crypto.randomBytes(64).toString('hex')` |
| `JWT_REFRESH_SECRET` | ✅ | *(none — must be set)* | Different value from ACCESS_SECRET |
| `CORS_ORIGIN` | Optional | `http://localhost:3000` | Frontend origin; omit to allow all (dev only) |
| `SEED_OWNER_EMAIL` | Optional | `admin@albunyan.com` | Override before first seed |
| `SEED_OWNER_PASSWORD` | Optional | `Admin@1234` | Override before first seed |
| `SEED_OWNER_NAME` | Optional | `System Owner` | Override before first seed |

### Frontend (`artifacts/erp`) — shell environment only, not a `.env` file

| Variable | Local value | Replit value | Notes |
|---|---|---|---|
| `PORT` | `3000` | Set by Replit | Vite dev server port |
| `BASE_PATH` | `/` | `/` | URL base path; set in `vite.config.ts` |

> The frontend `dev:local` / `build:local` / `serve:local` scripts inject `PORT` and
> `BASE_PATH` automatically via `cross-env`. No manual export is needed when using those scripts.

---

## 13. Commands to Run Locally

### Prerequisites

```bash
node --version   # 20+
pnpm --version   # 9+
psql --version   # 14+
```

### First-time setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure the API server
cp artifacts/api-server/.env.example artifacts/api-server/.env
# → Edit DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 3. Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE albunyan_erp;"

# 4. Apply the migration
cd artifacts/api-server
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 5. Seed roles and the owner user
pnpm run seed

# 6. Return to project root
cd ../..
```

### Daily development

```bash
# Terminal 1 — API server (http://localhost:8080)
cd artifacts/api-server
pnpm run dev:local

# Terminal 2 — Frontend (http://localhost:3000)
pnpm --filter @workspace/erp run dev:local
```

### Other useful commands

```bash
# Type-check everything
pnpm run typecheck

# Build API server
cd artifacts/api-server && pnpm run build

# Build frontend
pnpm --filter @workspace/erp run build:local

# Preview production frontend build
pnpm --filter @workspace/erp run serve:local

# Open Prisma Studio (database GUI)
cd artifacts/api-server
npx prisma studio --schema=./prisma/schema.prisma

# Create a new migration after schema changes
cd artifacts/api-server
npx prisma migrate dev --name <descriptive-name> --schema=./prisma/schema.prisma

# Regenerate Prisma client after schema changes (usually automatic)
cd artifacts/api-server
npx prisma generate --schema=./prisma/schema.prisma

# Reset the database (drops all data — development only)
cd artifacts/api-server
npx prisma migrate reset --schema=./prisma/schema.prisma
```

---

## 14. Future Roadmap — Recommended Implementation Order

Each module follows the same 4-file Clean Architecture pattern already established:
`module.controller.ts` → `module.service.ts` → `module.repository.ts` → `module.routes.ts`
plus a frontend page in `artifacts/erp/src/pages/`.

```
Phase 1 — Core Contacts (no dependencies on transactions)
  1. Customers module   — API + UI (list, detail, create, edit, balance display)
  2. Suppliers module   — API + UI (list, detail, create, edit, balance display)
  3. Users module       — API + UI (list, create, edit, assign role, activate/deactivate)

Phase 2 — Purchasing
  4. Purchases module   — API + UI (draft → confirmed → received workflow)
                          On RECEIVED: increment product.stockQuantity

Phase 3 — Sales
  5. Sales module       — API + UI (draft → confirmed → invoiced workflow)
                          On CONFIRMED: decrement product.stockQuantity
                          Enforce customer.creditLimit
  6. Delivery Orders    — API + UI (linked to sales, PENDING → IN_TRANSIT → DELIVERED)

Phase 4 — Finance
  7. Payments module    — API + UI (RECEIPT from customers, PAYMENT to suppliers)
                          Update customer.balance / supplier.balance on save

Phase 5 — Intelligence
  8. Dashboard          — Replace placeholder cards with real KPIs:
                          revenue this month, open POs, outstanding receivables, low stock
  9. Reports            — Sales by period, inventory valuation, supplier payables,
                          customer receivables, profit margin per product

Phase 6 — Operations
  10. Settings module   — Company profile, logo, VAT number, numbering sequences
                          (PO-YYYY-NNNN auto-increment configuration)
```

### Cross-cutting concerns to address before Phase 2

- **Input validation:** Add Zod validation middleware to every `POST`/`PUT` route.
- **Rate limiting:** `express-rate-limit` on auth endpoints.
- **Stock locking:** Use Prisma transactions (`prisma.$transaction`) when updating
  `stockQuantity` to prevent race conditions under concurrent writes.

---

## 15. Current Login Credentials

| Field | Value |
|---|---|
| URL (local) | `http://localhost:3000` |
| Email | `admin@albunyan.com` |
| Password | `Admin@1234` |
| Role | `OWNER` (full access) |

> ⚠️ These are the seed defaults. Change the password immediately after first login in
> any non-local environment. To override before seeding, set the `SEED_OWNER_*` env vars
> (see §12) before running `pnpm run seed`.

---

## 16. Deployment Checklist

### Before going live

- [ ] Generate strong `JWT_ACCESS_SECRET` (64+ random hex chars) and set as secret
- [ ] Generate strong `JWT_REFRESH_SECRET` (different value) and set as secret
- [ ] Set `DATABASE_URL` to production PostgreSQL connection string
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to the exact production frontend URL (no trailing slash)
- [ ] Run `npx prisma migrate deploy` against the production database
- [ ] Run `pnpm run seed` once to create roles and owner account
- [ ] Change the default owner password immediately after first login
- [ ] Set `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_NAME` to real values
      before seeding (do not leave the default `Admin@1234` in production)
- [ ] Confirm `GET /api/healthz` returns `{ "status": "ok" }` on the production server
- [ ] Confirm login works end-to-end in the production environment
- [ ] Confirm page refresh preserves authentication (tests the hydration flow)

### Replit-specific (current hosting)

- [ ] Add `JWT_ACCESS_SECRET` as a Replit Secret
- [ ] Add `JWT_REFRESH_SECRET` as a Replit Secret
- [ ] Run `npx prisma migrate deploy` in the Replit shell from `artifacts/api-server/`
- [ ] Run `pnpm run seed` in the Replit shell from `artifacts/api-server/`
- [ ] Restart the API Server workflow after setting secrets

---

## 17. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  React 19 + Vite 7                                      │
│  ┌───────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │  Wouter   │  │ Zustand  │  │  TanStack Query    │   │
│  │  Router   │  │ AuthStore│  │  (server state)    │   │
│  └───────────┘  └──────────┘  └────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  api.ts — fetch wrapper                          │   │
│  │  • Attaches Bearer token                         │   │
│  │  • 401 → refresh → retry (via auth-refresh.ts)   │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────│───────────────────────────────────┘
                      │  HTTP /api/*  (relative paths)
                      │  (Replit proxy routes to port 8080)
┌─────────────────────▼───────────────────────────────────┐
│  Express 5 API Server  (port 8080)                      │
│  ┌────────────────────────────────────────────────┐     │
│  │  Middlewares (applied in order)                │     │
│  │  pino-http → cors → json → authenticate →      │     │
│  │  authorize → controller → errorHandler         │     │
│  └────────────────────────────────────────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │  Controller  │→ │   Service    │→ │ Repository  │   │
│  │  (HTTP I/O)  │  │ (business    │  │ (Prisma     │   │
│  │              │  │  logic)      │  │  queries)   │   │
│  └──────────────┘  └──────────────┘  └──────┬──────┘   │
└─────────────────────────────────────────────│───────────┘
                                              │  Prisma v5
┌─────────────────────────────────────────────▼───────────┐
│  PostgreSQL 14+                                         │
│  15 tables — all monetary values Decimal(15,3) KWD      │
└─────────────────────────────────────────────────────────┘
```

### Clean Architecture layer contract

| Layer | Responsibility | May import |
|---|---|---|
| **Controller** | Parse HTTP request, call service, return HTTP response | Service only |
| **Service** | Business logic, validation, orchestration | Repository only |
| **Repository** | All Prisma database calls | `lib/prisma.ts` only |
| **Middleware** | Cross-cutting concerns (auth, logging, errors) | `lib/`, `errors/`, `types/` |

Controllers **never** call repositories directly. Services **never** touch `req` / `res`.

### Frontend data-fetching pattern

New modules (categories, brands, units, products) use **manual TanStack Query hooks** wrapping
the `api.ts` fetch helper — not Orval-generated hooks. The pattern is:

```typescript
// Read
const { data } = useQuery({
  queryKey: ['categories', params],
  queryFn: () => api.get<PaginatedResponse<Category>>(`/categories?page=${page}`),
});

// Write
const mutation = useMutation({
  mutationFn: (body) => api.post<Category>('/categories', body),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); toast(...) },
  onError: (err) => toast({ variant: 'destructive', ... }),
});
```

---

## 18. Notes for the Next Developer

Read this section before writing a single line of code.

### Before you start

1. **Run the app end-to-end first.** Follow §13 (local setup). Confirm login, navigate to
   Products, create a test product. If anything is broken, fix the environment before adding
   features.

2. **Skim the existing module code** — `categories.controller.ts` through `categories.routes.ts`
   and `artifacts/erp/src/pages/categories.tsx`. Every new module follows this exact pattern.
   Copy it; do not invent a new one.

3. **The database schema is already complete.** Every table for every planned module is in
   `prisma/schema.prisma` and the migration has been run. Do not create new migrations unless
   you are adding a genuinely new field or table.

### Conventions that must be preserved

| Convention | Why |
|---|---|
| All monetary and quantity values use `Decimal(15,3)` | KWD requires 3 decimal places; floats are lossy. Never use `Float` in the schema. |
| Decimal values serialised with `.toFixed(3)` in the API response | The frontend receives them as strings to avoid JS float precision loss. |
| Frontend treats all price/quantity fields as `string` in TypeScript interfaces | Follows from the above. Parse with `parseFloat()` only when doing arithmetic. |
| API returns paginated lists in `{ data: [], meta: { total, page, limit, pages } }` | All list endpoints follow this envelope. |
| All new API routes mounted in `artifacts/api-server/src/routes/index.ts` | There is one central route registry. |
| Delete blocked when child records exist | Check for related records in the service layer; throw `ConflictError` with a human-readable message. |
| Dual-language fields: `name` (English) + `nameAr` (Arabic, nullable) | Every entity that users see by name gets both fields. |
| i18n keys added to `artifacts/erp/src/i18n.ts` for every new string | No hardcoded English strings in UI components. |
| RTL is toggled via `document.dir` in `app-layout.tsx`'s `useEffect` on `i18n.language` | Not at the HTML root; not with a CSS class; only via `document.dir = 'rtl' | 'ltr'`. |
| `hasMinRole('WAREHOUSE')` for reads, `hasRole('OWNER','ADMIN','MANAGER')` for writes, `hasRole('OWNER','ADMIN')` for deletes | Consistent across all implemented modules. Apply the same pattern to new ones. |

### Where things are wired together

- **Frontend API calls** use relative paths (`/api/...`). The Replit proxy routes them to port
  8080. Locally, `CORS_ORIGIN=http://localhost:3000` in the API `.env` is required because the
  two servers run on different ports.

- **The Orval-generated hooks** (`lib/api-client-react/`) are used **only for auth endpoints**.
  All other API calls go through `artifacts/erp/src/lib/api.ts`. Do not mix the two within
  the same module.

- **Tokens** are stored in `localStorage` under keys `erp_access_token` and
  `erp_refresh_token`. Do not change these key names — they are referenced in
  `store.ts`, `auth-refresh.ts`, `api.ts`, and `App.tsx`.

- **`setAuthTokenGetter`** in `App.tsx` keeps the Orval-generated hooks in sync with the
  same access token. If you change the localStorage key, update this call too.

### Adding a new backend module (step-by-step)

```
1. Create artifacts/api-server/src/modules/<name>/
   ├── <name>.repository.ts   — Prisma calls only
   ├── <name>.service.ts      — business logic, calls repository
   ├── <name>.controller.ts   — HTTP I/O, calls service
   └── <name>.routes.ts       — Router with authenticate + hasRole/hasMinRole guards

2. Register the router in artifacts/api-server/src/routes/index.ts:
   router.use('/<name>', <name>Router);

3. Restart the API Server workflow.
```

### Adding a new frontend page (step-by-step)

```
1. Add TypeScript interfaces to artifacts/erp/src/lib/types.ts.

2. Add translation keys to artifacts/erp/src/i18n.ts (both 'en' and 'ar' sections).

3. Create artifacts/erp/src/pages/<name>.tsx.
   Use categories.tsx as the reference — it has the complete pattern:
   useQuery for list, useMutation for create/update/delete, Dialog for form,
   ConfirmDialog for destructive actions, Pagination, Search.

4. Register the route in artifacts/erp/src/App.tsx:
   <Route path="/<name>"><ProtectedRoute component={Name} /></Route>

5. Enable the sidebar link in artifacts/erp/src/components/layout/app-layout.tsx:
   Change disabled: true → disabled: false for the relevant nav item.
   Add the path to the breadcrumb map if needed.
```

### Prisma v5 — do not upgrade

Prisma is pinned to v5 in `artifacts/api-server/package.json`. Prisma v7 broke the
`url = env("DATABASE_URL")` datasource syntax and caused the server to fail at startup.
Do not upgrade without thorough testing.

### Transactions that touch stockQuantity

When implementing Purchases (received) and Sales (confirmed), use `prisma.$transaction([])`
to atomically update `product.stockQuantity` alongside the status change. Never update stock
quantity outside of a transaction — concurrent requests can cause phantom reads.

```typescript
// Pattern
await prisma.$transaction([
  prisma.purchase.update({ where: { id }, data: { status: 'RECEIVED' } }),
  ...items.map(item =>
    prisma.product.update({
      where: { id: item.productId },
      data: { stockQuantity: { increment: item.quantity } },
    })
  ),
]);
```

### Key files at a glance

| What you need | Where it is |
|---|---|
| Add a new API route | `artifacts/api-server/src/routes/index.ts` |
| Add a new DB table | `artifacts/api-server/prisma/schema.prisma` → `prisma migrate dev` |
| Add a new frontend page | `artifacts/erp/src/pages/` → register in `App.tsx` |
| Enable a sidebar link | `artifacts/erp/src/components/layout/app-layout.tsx` |
| Add a translation string | `artifacts/erp/src/i18n.ts` (both `en` and `ar`) |
| Add a TypeScript interface | `artifacts/erp/src/lib/types.ts` |
| Auth store state | `artifacts/erp/src/lib/store.ts` |
| Token refresh logic | `artifacts/erp/src/lib/auth-refresh.ts` |
| Role-based guards | `artifacts/api-server/src/middlewares/authorize.ts` |
| Error classes | `artifacts/api-server/src/errors/AppError.ts` |
