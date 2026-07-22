# Users Management Module — Implementation Report
**Al-Bunyan ERP**
**Date:** July 2026

---

## Overview

A complete Enterprise User Management module has been implemented for the Al-Bunyan ERP system. The module provides full CRUD operations, role-based access control with a strict hierarchy, password hashing, account activation/deactivation, password reset, statistics, search, filtering, sorting, and pagination.

The implementation follows the exact same architecture, patterns, and code style as the Customers and Suppliers modules (Controller → Service → Repository → Prisma → PostgreSQL).

---

## Files Created

### Backend

| File | Description |
|---|---|
| `artifacts/api-server/src/modules/users/users.repository.ts` | All Prisma DB queries. Password is **never** included in select. Serializer converts Date → ISO string. |
| `artifacts/api-server/src/modules/users/users.service.ts` | Business logic: role hierarchy, self-protection, owner protection, password validation & hashing. |
| `artifacts/api-server/src/modules/users/users.controller.ts` | HTTP layer only — parses params, delegates to service, sends response. |
| `artifacts/api-server/src/modules/users/users.routes.ts` | Route definitions with `authenticate` + `hasMinRole` middleware. `/statistics` registered before `/:id`. |

### Frontend

| File | Description |
|---|---|
| `artifacts/erp/src/pages/users.tsx` | Full users page: statistics cards, searchable/sortable/paginated table, Create/Edit/Reset Password/Activate/Deactivate/Delete dialogs, role badges, permission-aware action buttons. |

---

## Files Modified

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/index.ts` | Added `import usersRouter` and `router.use("/users", usersRouter)` |
| `artifacts/erp/src/lib/types.ts` | Added `UserRole`, `User`, and `UserStatistics` TypeScript interfaces |
| `artifacts/erp/src/i18n.ts` | Added all user management keys to both `en` and `ar` translation objects |

**Not modified** (already correct from Suppliers module):
- `artifacts/erp/src/App.tsx` — already has `/users` route
- `artifacts/erp/src/components/layout/app-layout.tsx` — Users nav already `disabled: false`

---

## API Endpoints

| Method | Path | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/users` | WAREHOUSE | List with search, filter, sort, pagination |
| `GET` | `/api/users/statistics` | MANAGER | Total, active, inactive, count by role |
| `GET` | `/api/users/:id` | WAREHOUSE | Single user record |
| `POST` | `/api/users` | MANAGER | Create user (role hierarchy enforced) |
| `PUT` | `/api/users/:id` | MANAGER | Update name, nameAr, role, isActive |
| `PATCH` | `/api/users/:id/status` | MANAGER | Toggle active/inactive |
| `PATCH` | `/api/users/:id/password` | MANAGER | Reset hashed password |
| `DELETE` | `/api/users/:id` | ADMIN | Delete (OWNER accounts are protected) |

### Response format

All endpoints follow the same envelope as Customers/Suppliers:
- **List:** `{ data: User[], meta: { total, page, limit, pages } }`
- **Single/Create/Update:** `{ data: User }`
- **Delete:** `204 No Content`
- **Password reset:** `{ message: "Password updated successfully" }`

---

## Business Rules Implemented

### Role Hierarchy

```
OWNER (5) > ADMIN (4) > MANAGER (3) > SALES (2) > WAREHOUSE (1)
```

- Only a higher-ranked actor can create, edit, or delete a lower-ranked user.
- A `MANAGER` cannot create or edit an `ADMIN`.
- A `SALES` user cannot modify a `MANAGER`.
- `WAREHOUSE` users can read but cannot modify any user.

### Owner Protection

- OWNER accounts **cannot be deleted** (hard block in service).
- The **last active OWNER** cannot be deactivated — checked before every status change.
- Only an OWNER can create another OWNER.
- Only an OWNER can edit an OWNER account.

### Self-Protection

- A user **cannot delete their own account**.
- A user **cannot deactivate their own account**.
- A user **cannot change their own role**.
- A user *can* edit their own name and Arabic name.
- A user *can* reset their own password.

### Password Rules

All passwords are validated **before hashing**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

Passwords are hashed with **bcrypt (12 salt rounds)**.

Passwords are **never**:
- Returned in any API response
- Included in any Prisma `select` object (except the dedicated `findByIdWithPassword` method used only for auth)
- Stored in plain text

### Email Rules

- Case-insensitive uniqueness enforced at both the service layer (explicit check) and the database (unique constraint).
- Normalised to lowercase before storage.
- Email cannot be changed after creation (immutable for audit trail).

### Validation

All inputs validated with field-level errors returned as:
```json
{
  "errors": [
    { "field": "email", "message": "Email format is invalid" },
    { "field": "password", "message": "Password must contain at least one uppercase letter" }
  ]
}
```

---

## Security

| Concern | Implementation |
|---|---|
| Password exposure | `password` field is **never** in the Prisma `select` object for public queries |
| Privilege escalation | `canActOn()` function enforces strict hierarchy at the service layer, not just the route layer |
| Self-harm | Explicit `actor.id === id` checks before destructive operations |
| Owner lockout | `countActiveOwners()` called before every deactivation of an OWNER |
| Input sanitisation | All string inputs trimmed and normalised via `normalise()` helper |
| OWNER deletion | Hard blocked regardless of actor's role — OWNERs can only be deactivated |

---

## Frontend Features

### Statistics Cards (4 cards)
1. Total Users
2. Active Users
3. Inactive Users
4. Role Breakdown — colour-coded pill badges showing count per role

### Table Columns
- Full name (with Arabic sub-line if present, "(you)" label for current user)
- Email address
- Role badge (colour-coded by rank: purple=OWNER, red=ADMIN, blue=MANAGER, green=SALES, amber=WAREHOUSE)
- Status badge (green=Active, red=Inactive)
- Last Login (formatted datetime, "Never" if null)
- Created Date
- Actions (permission-aware, only visible buttons the actor can use)

### Dialogs
| Dialog | Triggered by | Fields |
|---|---|---|
| **Create User** | "Add User" button | Email, Password (with show/hide), Name, Arabic Name, Role, Status |
| **Edit User** | Pencil icon | Name, Arabic Name, Role, Status (email/password not editable here) |
| **Reset Password** | Key icon | New password only (with show/hide + strength hint) |
| **Activate** | UserCheck icon | Confirmation only |
| **Deactivate** | UserX icon | Confirmation only (destructive style) |
| **Delete** | Trash icon | Confirmation only (destructive style) |

### Action Button Visibility
Action buttons are only rendered when the current user has permission:
- **Edit:** actor outranks target (or it's their own profile)
- **Reset Password:** actor outranks target, or it's their own account
- **Activate/Deactivate:** actor outranks target, and target is not themselves
- **Delete:** actor is ADMIN+, outranks target, target is not OWNER, not themselves

### Filters
- **Search:** debounced 400ms, searches name, Arabic name, email, role
- **Role filter:** dropdown — All / OWNER / ADMIN / MANAGER / SALES / WAREHOUSE
- **Status filter:** dropdown — All / Active / Inactive
- **Sort:** Date Added, Name, Email, Role, Last Login, Status

### i18n
- Full English and Arabic translations for all user management keys
- Flat key structure matching the existing i18n pattern (e.g. `t('add_user')`, `t('user_stat_total')`)
- RTL compatible (uses `me-2`, `ms-2`, `ps-9`, `start-3` CSS utilities)

---

## Permissions Summary

| Actor Role | Can Create | Can Edit | Can Status | Can Reset PW | Can Delete |
|---|---|---|---|---|---|
| OWNER | Anyone | Anyone | Anyone | Anyone | ADMIN and below |
| ADMIN | MANAGER and below | MANAGER and below | MANAGER and below | MANAGER and below | MANAGER and below |
| MANAGER | SALES, WAREHOUSE | SALES, WAREHOUSE | SALES, WAREHOUSE | SALES, WAREHOUSE | ❌ |
| SALES | ❌ | Own name only | ❌ | Own only | ❌ |
| WAREHOUSE | ❌ | Own name only | ❌ | Own only | ❌ |

---

## TypeScript

- Strict typing throughout — no `any` used.
- `UserRole` union type shared between backend and frontend.
- `UserFilters` interface for repository layer.
- `ActorContext` interface for service layer (avoids full Request dependency in service).
- `FieldErrors` partial record type for form validation state in the page.
- Backend `select` object typed with `satisfies Prisma.UserSelect` to catch field mismatches at compile time.

---

## Known Limitations

1. **Email is immutable after creation.** The API does not provide an endpoint to change a user's email. This is intentional (audit trail) but could be added later with additional verification steps.
2. **No email notifications.** Password resets are applied immediately without sending a notification email to the user. An email service integration would be needed.
3. **No 2FA.** Two-factor authentication is out of scope for this module.
4. **Last login is updated by the auth module.** This module reads `lastLogin` but does not update it — it is set by `POST /api/auth/login` in the auth module.

---

## Future Improvements

1. **Invite-by-email flow** — generate a time-limited token, email the user, and let them set their own password on first login.
2. **Audit log** — track who changed what (role changes, activations, deactivations) with timestamps and actor IDs.
3. **Session revocation** — when a user is deactivated, invalidate all active refresh tokens immediately.
4. **Bulk actions** — select multiple users to activate/deactivate in one operation.
5. **Avatar / profile picture** — stored in object storage, displayed in the table and sidebar.
