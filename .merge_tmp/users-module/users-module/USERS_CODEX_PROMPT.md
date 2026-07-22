# CODEX TASK — Al-Bunyan ERP: Users Management Module Implementation

---

## YOUR ROLE

You are implementing the **Users Management module** for the Al-Bunyan ERP system.

You have been given a ZIP file (`users-module.zip`) containing ready-made files.

Your job is **not** to write code from scratch. Your job is to:
1. Place new files into the correct locations.
2. Replace modified files with the updated versions from the ZIP.
3. Verify everything connects correctly.

Do **not** redesign, refactor, or change any logic. The files are production-ready.

---

## WHAT IS IN THE ZIP

```
users-module/
├── USERS_IMPLEMENTATION_REPORT.md    ← full technical reference
├── USERS_CODEX_PROMPT.md             ← this file
├── artifacts/
│   ├── api-server/src/
│   │   ├── modules/users/              ← 4 NEW files (create these)
│   │   │   ├── users.repository.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.routes.ts
│   │   └── routes/index.ts             ← REPLACE existing file
│   └── erp/src/
│       ├── pages/users.tsx             ← REPLACE existing file (or create if absent)
│       ├── lib/types.ts                ← REPLACE existing file
│       └── i18n.ts                     ← REPLACE existing file
```

---

## STEP-BY-STEP INSTRUCTIONS

### Step 1 — Create the backend module folder

Create the directory:
```
artifacts/api-server/src/modules/users/
```

Copy these 4 files from the ZIP exactly as-is:
- `users.repository.ts`
- `users.service.ts`
- `users.controller.ts`
- `users.routes.ts`

**Do not modify these files.**

---

### Step 2 — Replace the backend routes index

Replace the **entire contents** of:
```
artifacts/api-server/src/routes/index.ts
```

with the version from the ZIP.

The only new line is:
```typescript
import usersRouter from "../modules/users/users.routes.js";
// and:
router.use("/users", usersRouter);
```

**Do not modify anything else in this file.**

---

### Step 3 — Replace the frontend users page

Replace (or create) the file:
```
artifacts/erp/src/pages/users.tsx
```

with the version from the ZIP exactly as-is.

---

### Step 4 — Replace the types file

Replace the **entire contents** of:
```
artifacts/erp/src/lib/types.ts
```

with the version from the ZIP.

The additions are three new exports at the bottom:
```typescript
export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE';
export interface User { ... }
export interface UserStatistics { ... }
```

All existing interfaces are preserved unchanged.

---

### Step 5 — Replace the i18n file

Replace the **entire contents** of:
```
artifacts/erp/src/i18n.ts
```

with the version from the ZIP.

The additions are user management translation keys added to both the `en` and `ar` translation objects. All existing keys are preserved unchanged.

---

## VERIFICATION CHECKLIST

After placing all files, verify the following.

### Backend
- [ ] `artifacts/api-server/src/modules/users/` exists with all 4 files
- [ ] `artifacts/api-server/src/routes/index.ts` imports `usersRouter` and calls `router.use("/users", usersRouter)`
- [ ] All imports in the 4 user files use `.js` extensions (ESM convention of this project)
- [ ] The Prisma `User` model has these camelCase fields: `id`, `email`, `password`, `name`, `nameAr`, `role`, `isActive`, `lastLogin`, `createdAt`, `updatedAt`
- [ ] `bcryptjs` is already in the project dependencies (used by the auth module). If not, run: `pnpm --filter @workspace/api-server add bcryptjs`

### Frontend
- [ ] `artifacts/erp/src/pages/users.tsx` exists and is not the old placeholder
- [ ] `artifacts/erp/src/lib/types.ts` exports `User`, `UserRole`, `UserStatistics`
- [ ] `artifacts/erp/src/i18n.ts` has `add_user`, `user_created`, `user_stat_total` keys in both `en` and `ar`
- [ ] `artifacts/erp/src/App.tsx` already has the `/users` route (no change needed)
- [ ] `artifacts/erp/src/components/layout/app-layout.tsx` has Users as `disabled: false` (no change needed)

### Build check
```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/erp run typecheck
```

Fix TypeScript errors if any — do not change working logic.

---

## IMPORTANT RULES

- **Do not** modify any file not listed above.
- **Do not** touch: Authentication, Customers, Suppliers, Products, Categories, Brands, Units, Dashboard, Settings, Prisma schema, or any build config.
- **Do not** install new packages other than `bcryptjs` if it is truly missing.
- **Do not** create database migrations — the `users` table already exists.
- **Do not** rewrite or "improve" the code — it is production-ready as delivered.

---

## WHAT THE MODULE DOES (for context)

**Backend API** (`/api/users`)

| Method | Path | Min Role | Description |
|---|---|---|---|
| GET | `/api/users` | WAREHOUSE | Paginated list with search/filter/sort |
| GET | `/api/users/statistics` | MANAGER | Total, active, inactive, count by role |
| GET | `/api/users/:id` | WAREHOUSE | Single user |
| POST | `/api/users` | MANAGER | Create user (role hierarchy enforced) |
| PUT | `/api/users/:id` | MANAGER | Update name, nameAr, role, isActive |
| PATCH | `/api/users/:id/status` | MANAGER | Toggle active/inactive |
| PATCH | `/api/users/:id/password` | MANAGER | Reset password |
| DELETE | `/api/users/:id` | ADMIN | Delete (OWNER protected) |

**Key Security Rules**
- Passwords hashed with bcrypt (12 rounds), **never returned** in responses
- Role hierarchy: OWNER > ADMIN > MANAGER > SALES > WAREHOUSE — only higher-ranked users can manage lower-ranked users
- OWNER accounts cannot be deleted; last active OWNER cannot be deactivated
- Users cannot delete or deactivate their own accounts
- Users cannot change their own role

**Frontend page** (`/users`)
- 4 statistics cards: total, active, inactive, role breakdown
- Colour-coded role badges (purple=OWNER, red=ADMIN, blue=MANAGER, green=SALES, amber=WAREHOUSE)
- 6 action dialogs: Create, Edit, Reset Password, Activate, Deactivate, Delete
- Permission-aware action buttons (only shown when the current user has authority)
- Full English + Arabic translation (RTL compatible)

---

## AFTER IMPLEMENTATION

Once all files are placed and the build passes, the Users Management module is complete.

The sidebar link is already active and the `/users` route is already in the router.
No seed data or database changes are required.
