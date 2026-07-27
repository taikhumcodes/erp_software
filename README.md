# Al-Bunyan ERP

A production-grade ERP foundation for a Hardware & Building Materials Trading Company in Kuwait.

Built as a **pnpm monorepo** with a React + Vite frontend and an Express + Prisma API backend. Supports English and Arabic with full RTL layout switching.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4, shadcn/ui |
| State / Data | Zustand, TanStack Query v5 |
| Routing | Wouter |
| Internationalisation | i18next — English & Arabic (RTL) |
| Backend | Node.js 20+, Express 5, TypeScript (Clean Architecture) |
| ORM | Prisma v5 — PostgreSQL |
| Auth | JWT — access token 15 min, refresh token 7 days |
| Currency | Kuwaiti Dinar (KWD) — 3 decimal places throughout |

---

## Monorepo Layout

```text
/
├── artifacts/
│   ├── api-server/          # Express REST API (port 8080 by default)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── modules/     # auth | categories | brands | units | products | customers | suppliers | users | dashboard | settings
│   │       ├── middlewares/ # authenticate | authorize | errorHandler
│   │       └── lib/         # prisma | jwt | logger | audit
│   └── erp/                 # React + Vite frontend (port 3000 by default)
│       └── src/
│           ├── pages/       # login | dashboard | categories | brands | units | products | customers | suppliers | users
│           ├── modules/     # documents | settings | dashboard
│           ├── lib/         # api | store | auth-refresh | types
│           └── components/
├── lib/
│   ├── api-client-react/    # Orval-generated React hooks (auth endpoints)
│   ├── api-spec/            # OpenAPI spec
│   └── api-zod/             # Shared Zod schemas
└── pnpm-workspace.yaml
```

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20 (for `--env-file` support) |
| pnpm | 9 |
| PostgreSQL | 14 |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd <project-dir>

# 2. Install all workspace dependencies
pnpm install
```

---

## Environment Variables

### API Server

Copy the example file and fill in your values:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Edit `artifacts/api-server/.env`:

| Variable | Required | Default / Notes |
|---|---|---|
| `PORT` | ✅ | `8080` |
| `NODE_ENV` | ✅ | `development` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Long random string — 64+ chars |
| `JWT_REFRESH_SECRET` | ✅ | Different long random string |
| `CORS_ORIGIN` | optional | Frontend URL; omit to allow all origins |
| `SEED_OWNER_EMAIL` | optional | Defaults to `admin@albunyan.com` |
| `SEED_OWNER_PASSWORD` | optional | Defaults to `Admin@1234` |
| `SEED_OWNER_NAME` | optional | Defaults to `System Owner` |

Generate secure JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this twice — once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

### Frontend

The frontend (`artifacts/erp`) requires `PORT` and `BASE_PATH` in the shell environment. The `dev:local` / `build:local` / `serve:local` convenience scripts set these automatically (see [Run Commands](#run-commands)).

| Variable | Local value | Notes |
|---|---|---|
| `PORT` | `3000` | Port for the Vite dev server |
| `BASE_PATH` | `/` | URL base path; use `/` for local dev |

---

## Database Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE albunyan_erp;"
```

Or create it via your preferred PostgreSQL client.

### 2. Apply migrations

```bash
cd artifacts/api-server
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

> **`migrate deploy`** applies the existing migration history and is recommended for first-time setup and production.  
> **`migrate dev`** is for active schema development (generates new migration files).

### 3. Generate the Prisma Client

`pnpm install` runs Prisma's postinstall hook automatically. If the client is ever out of sync, regenerate it manually:

```bash
cd artifacts/api-server
npx prisma generate --schema=./prisma/schema.prisma
```

---

## Seed Command

Creates the 5 system roles and a default owner account. The script is **idempotent** — safe to run multiple times.

```bash
cd artifacts/api-server
pnpm run seed
```

**Default login credentials**

| Field | Value |
|---|---|
| Email | `admin@albunyan.com` |
| Password | `Admin@1234` |

> ⚠️ Change the password immediately after first login in any non-local environment.

Override the defaults via env vars before seeding:

```bash
SEED_OWNER_EMAIL=you@company.com \
SEED_OWNER_PASSWORD=StrongPassword1! \
SEED_OWNER_NAME="Your Name" \
pnpm run seed
```

---

## Run Commands

Open **two terminal windows** — one for each server.

### Terminal 1 — API Server

```bash
cd artifacts/api-server

# Build + start, loading .env automatically (Node 20+)
pnpm run dev:local
```

The API server will be available at `http://localhost:8080`.

> The `dev:local` script uses Node's built-in `--env-file=.env` flag to load your `.env` file.  
> The plain `pnpm run dev` script is for Replit, where env vars are injected by the platform.

### Terminal 2 — Frontend

```bash
# From the project root — env vars are set by the dev:local script via cross-env
pnpm --filter @workspace/erp run dev:local
```

The frontend will be available at `http://localhost:3000`.

---

## Build Commands

### API Server

```bash
cd artifacts/api-server
pnpm run build      # compiles TypeScript → dist/ via esbuild
```

Start the compiled server:

```bash
pnpm run start:local   # loads .env then starts dist/index.mjs
```

### Frontend

```bash
# From the project root
pnpm --filter @workspace/erp run build:local   # outputs to artifacts/erp/dist/public/
```

Preview the production build locally:

```bash
pnpm --filter @workspace/erp run serve:local
```

### Build everything (type-check + all packages)

```bash
# From the project root
pnpm run build
```

---

## Prisma Reference

All Prisma commands must be run from `artifacts/api-server/`.

```bash
cd artifacts/api-server

# Apply existing migrations (first-time setup / production)
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Create a new migration during schema development
npx prisma migrate dev --name <migration-name> --schema=./prisma/schema.prisma

# Regenerate the Prisma Client after schema changes
npx prisma generate --schema=./prisma/schema.prisma

# Open Prisma Studio (GUI database browser)
npx prisma studio --schema=./prisma/schema.prisma

# Seed the database
pnpm run seed

# Reset the database (drops all data — development only)
npx prisma migrate reset --schema=./prisma/schema.prisma
```

---

## Role Hierarchy

| Role | Permissions |
|---|---|
| `OWNER` | Full access, cannot be restricted |
| `ADMIN` | Manage users, settings, all modules |
| `MANAGER` | Approve transactions, view all reports |
| `SALES` | Create and manage sales orders |
| `WAREHOUSE` | Manage inventory and delivery orders |

Read access (list / detail): all roles.  
Write access (create / edit): MANAGER and above.  
Delete: ADMIN and above.

---

## Implemented Modules

| Module | Status | Features |
|---|---|---|
| Authentication | ✅ Complete | Login, logout, JWT refresh, session restore, inactive-user protection |
| Dashboard | 🟡 In Progress | Dashboard interface integration |
| Categories | ✅ Complete | Full CRUD, search, pagination, role guards, delete protection |
| Brands | ✅ Complete | Full CRUD, search, pagination, role guards, delete protection |
| Units | ✅ Complete | Full CRUD, search, pagination, role guards, delete protection |
| Products | ✅ Complete | Full CRUD, search, filter by category / brand / status, stock and price precision |
| Customers | ✅ Complete | Full CRUD, search, duplicate prevention, auto code generation |
| Suppliers | ✅ Complete | Full CRUD, search, statistics, balance display, delete protection |
| Users | ✅ Complete | Full user management, role hierarchy, password reset, audit logging |
| Settings | 🟡 In Progress | Basic routes and controller setup |
| Documents | 🟡 In Progress | Document templates integration (Purchase/Sales Orders, etc.) |
| Purchases | ⬜ Not Started | Schema exists; API and UI not implemented |
| Sales | ⬜ Not Started | Schema exists; API and UI not implemented |
| Delivery Orders | ⬜ Not Started | Schema exists; API and UI not implemented |
| Payments | ⬜ Not Started | Schema exists; API and UI not implemented |
| Reports | ⬜ Not Started | Schema exists; API and UI not implemented |

---

## Notes for Local Development

- The Replit-specific Vite plugins (`@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`) are **only loaded when `REPL_ID` is set** in the environment and are completely inert locally.
- The `@replit/vite-plugin-runtime-error-modal` plugin is loaded in all environments but has no side effects in production builds.
- All monetary values use `Decimal(15, 3)` in PostgreSQL and are serialised as strings with `.toFixed(3)` to avoid floating-point errors.
- The frontend proxies API requests via relative `/api/...` paths. In local development the two servers run on separate ports, so configure `CORS_ORIGIN=http://localhost:3000` in the API `.env` to allow the frontend origin.
