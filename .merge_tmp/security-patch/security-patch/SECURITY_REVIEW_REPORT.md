# Security Review Report
## Al-Bunyan ERP — Users & Authentication Module
**Date:** 2026-07-20  
**Reviewer Role:** Senior ERP Security Engineer  
**Scope:** Authentication module, JWT middleware, Users module (security improvements only)

---

## 1. Existing Security Features Found

The following security controls were already in place and **were not modified**:

| Feature | Location | Status |
|---|---|---|
| Bcrypt password hashing (12 rounds) | `users.service.ts` | ✅ Correct |
| Password never returned in API responses | `users.repository.ts` (`select` excludes `password`) | ✅ Correct |
| Email enumeration prevention (timing-safe dummy hash) | `auth.service.ts` | ✅ Correct |
| Role hierarchy enforcement (`canActOn`) | `users.service.ts` | ✅ Correct |
| OWNER cannot be deleted | `users.service.ts` | ✅ Correct |
| Last OWNER cannot be deactivated | `users.service.ts` + repository `countActiveOwners()` | ✅ Correct |
| Self-delete blocked | `users.service.ts` | ✅ Correct |
| Self-deactivate blocked | `users.service.ts` | ✅ Correct |
| Self-role-change blocked | `users.service.ts` | ✅ Correct |
| Password strength validation (8 chars, upper, lower, number, special) | `users.service.ts` | ✅ Correct |
| `hasMinRole` / `hasRole` middleware | `authorize.ts` | ✅ Correct |
| Pino logger with auth header redaction | `lib/logger.ts` | ✅ Correct |
| `lastLoginAt` timestamp on login | `auth.repository.ts` | ✅ Correct |
| OWNER can only be created by OWNER | `users.service.ts` | ✅ Correct |

---

## 2. Security Issues Identified

### CRITICAL

#### C1 — JWT middleware trusts token without DB verification
**File:** `middlewares/authenticate.ts`  
**Line (original):** 27 — `isActive: true` hardcoded  
**Impact:** A user deactivated after login retains full system access until their access token expires. An administrator deactivating a rogue account has no immediate effect.  
**Fix:** Added live DB lookup (`prisma.user.findUnique`) on every authenticated request.

---

### HIGH

#### H1 — Inactive user login returns wrong HTTP status
**File:** `modules/auth/auth.service.ts`  
**Line (original):** 54 — single combined condition for bad credentials and inactive account  
**Impact:** Inactive users receive a 401 "Invalid email or password" response. The requirement is 403 "Account has been deactivated." Additionally, the business cannot distinguish a wrong-password attempt from an account-blocked situation in logs.  
**Fix:** Credential check (401) and inactive-account check (403) are now separate conditions.

#### H2 — Refresh token allows inactive accounts to obtain new access tokens
**File:** `modules/auth/auth.service.ts`  
**Line (original):** 93 — `UnauthorizedError` (401) for inactive user  
**Impact:** When the token is cryptographically valid but the account is inactive, the wrong error type was thrown. More importantly, the error distinction between "token forged/expired" (401) and "account suspended" (403) was lost.  
**Fix:** Split into two checks — token invalid → 401, account inactive → 403.

#### H3 — Admin password reset allows self-reset without permission checks
**File:** `modules/users/users.service.ts`  
**Line (original):** 267 — `if (actor.id !== id)` skips all role checks for self  
**Impact:** Any authenticated user could reset their own password through the admin endpoint without any role hierarchy check. Combined with a weak password policy bypass, this was a privilege escalation vector.  
**Fix:** Self-reset through the admin endpoint is now explicitly blocked with `ForbiddenError`.

---

### MEDIUM

#### M1 — No audit logging for sensitive user management actions
**File:** `modules/users/users.service.ts` (all methods)  
**Impact:** No record of who created, deleted, activated, deactivated, promoted, or reset passwords for any user. Regulatory compliance and incident investigation impossible.  
**Fix:** Implemented audit logging (see Section 6).

---

### LOW / INFORMATIONAL

#### L1 — `auth.repository.ts` `findById` fetches `passwordHash` when not needed
**File:** `modules/auth/auth.repository.ts`  
**Impact:** `refreshTokens` and `getProfile` fetch the password hash from the DB but never use it. Not a leak (never returned to client) but fetches more data than necessary.  
**Recommendation:** Add a separate `findByIdSafe` method that omits `passwordHash`. Left unchanged per minimal-change policy.

#### L2 — `authenticate` middleware was synchronous; Express async error propagation  
**File:** `middlewares/authenticate.ts`  
**Impact:** If the DB lookup threw an unexpected error, Express <5 would not catch it automatically from a synchronous middleware.  
**Fix:** Middleware is now `async` with a `try/catch` that calls `next(err)` for all error paths. (Express 5 handles async middleware natively, but the explicit try/catch is a safe belt-and-suspenders approach.)

---

## 3. Files Modified

| File | Change Type | Tasks |
|---|---|---|
| `middlewares/authenticate.ts` | **Modified** | T3, T4 |
| `modules/auth/auth.service.ts` | **Modified** | T1, T2 |
| `modules/users/users.service.ts` | **Modified** | T5, T7 |
| `modules/users/users.controller.ts` | **Modified** | T5 (IP capture) |
| `lib/audit.ts` | **Created** | T5 |

### Files NOT modified (already correct)
`auth.controller.ts`, `auth.repository.ts`, `auth.routes.ts`, `authorize.ts`, `users.repository.ts`, `users.routes.ts`

---

## 4. Authentication Improvements

### Task 1 — Login: inactive user returns 403 (not 401)

**Before:**
```typescript
if (!user || !isValid || !user.isActive) {
  throw new UnauthorizedError('Invalid email or password');
}
```

**After:**
```typescript
// Step 1: credential check → 401 (generic, prevents email enumeration)
if (!user || !isValid) {
  throw new UnauthorizedError('Invalid email or password');
}
// Step 2: active-status check → 403 (specific, safe to reveal — credentials were correct)
if (!user.isActive) {
  throw new ForbiddenError('Account has been deactivated.');
}
```

### Task 2 — Refresh: inactive user returns 403 (not 401)

**Before:**
```typescript
if (!user || !user.isActive) {
  throw new UnauthorizedError('User account not found or inactive');
}
```

**After:**
```typescript
if (!user) {
  throw new UnauthorizedError('Invalid or expired refresh token');  // 401 — no enumeration
}
if (!user.isActive) {
  throw new ForbiddenError('Account has been deactivated.');        // 403 — account found, blocked
}
```

### Task 3 — JWT middleware: live DB check on every request

**Before:**
```typescript
req.user = {
  id: payload.sub,
  role: payload.role,
  isActive: true,   // ← hardcoded, never checked against DB
};
```

**After:**
```typescript
const dbUser = await prisma.user.findUnique({
  where:  { id: payload.sub },
  select: { id: true, isActive: true, role: true },
});

if (!dbUser)         throw new ForbiddenError('Account no longer exists');
if (!dbUser.isActive) throw new ForbiddenError('Account has been deactivated.');

req.user = {
  id:       dbUser.id,
  role:     dbUser.role as UserRole,  // ← always from DB; role changes take effect immediately
  isActive: dbUser.isActive,
};
```

---

## 5. Audit Logging Implementation

### Approach
Reused the existing `pino` logger infrastructure (`lib/logger.ts`). Created a thin `lib/audit.ts` wrapper that emits structured JSON audit entries tagged with `audit: true` for easy log-stream filtering.

No new tables, no new framework, no external services.

### New file: `lib/audit.ts`

```typescript
export type AuditAction =
  | 'USER_CREATED' | 'USER_DELETED'
  | 'USER_ACTIVATED' | 'USER_DEACTIVATED'
  | 'USER_ROLE_CHANGED' | 'USER_PASSWORD_RESET';

export function auditLog(event: {
  action: AuditAction;
  actorId: string;
  targetId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ip?: string;
}): void { ... }
```

### Audit entry shape (JSON log line)
```json
{
  "audit": true,
  "timestamp": "2026-07-20T10:30:00.000Z",
  "action": "USER_DEACTIVATED",
  "actorId": "cuid_of_admin",
  "targetId": "cuid_of_user",
  "oldValue": { "isActive": true },
  "newValue": { "isActive": false },
  "ip": "192.168.1.10",
  "msg": "AUDIT:USER_DEACTIVATED"
}
```

### Events covered

| Action | Trigger | Old Value | New Value |
|---|---|---|---|
| `USER_CREATED` | `create()` | — | `{ email, role, isActive }` |
| `USER_DELETED` | `delete()` | `{ email, role }` | — |
| `USER_ACTIVATED` | `updateStatus()` / `update()` | `{ isActive: false }` | `{ isActive: true }` |
| `USER_DEACTIVATED` | `updateStatus()` / `update()` | `{ isActive: true }` | `{ isActive: false }` |
| `USER_ROLE_CHANGED` | `update()` | `{ role: oldRole }` | `{ role: newRole }` |
| `USER_PASSWORD_RESET` | `resetPassword()` | — | — *(no values logged)* |

**Passwords are never logged in any form.**

### IP address
`ActorContext` extended with optional `ip?: string`. `UsersController.getActor()` now captures `req.ip` (Express standard, respects `trust proxy`) and passes it through to every service call.

---

## 6. Session Invalidation Strategy

**Strategy chosen:** Database-backed active check on every request (Task 3 fix).

**Why this approach:**
- Zero new infrastructure (no Redis, no blacklist table, no token version column).
- Deactivating a user in the DB immediately invalidates all their sessions — the next authenticated request hits the DB, finds `isActive: false`, and returns 403.
- Role changes are also picked up immediately (role is read from DB, not JWT payload).

**Trade-off:** One extra DB query per authenticated request. For an ERP with a limited number of concurrent internal users this is negligible. The query uses the primary key (`id`) so it is a fast index lookup.

**Future upgrade path (if performance becomes a concern):** Add a `tokenVersion` integer column to the `User` table. Embed the version in the JWT payload. The middleware compares `payload.tokenVersion === dbUser.tokenVersion` and rejects mismatches. Increment on deactivation, password reset, or role change. This allows skipping the DB lookup for the vast majority of requests while still invalidating on security events.

---

## 7. API Response Review

All responses were verified clean:

| Field | `users.repository.ts` | `auth.service.ts (toProfile)` | Auth repository internal |
|---|---|---|---|
| `password` / `passwordHash` | ❌ Excluded from `select` | ❌ Not in `UserProfile` | Used for bcrypt only, never returned |
| `refreshToken` | Never stored/returned | — | — |
| `tokenVersion` | Does not exist | — | — |

No sensitive fields are leaked in any API response. No changes required.

---

## 8. Testing Checklist

| Test | Expected Result | Covered By |
|---|---|---|
| Active user login with correct credentials | 200 + token pair | `auth.service.ts` login flow |
| Active user login with wrong password | 401 "Invalid email or password" | `auth.service.ts` credential check |
| Inactive user login with correct credentials | **403 "Account has been deactivated."** | T1 fix |
| Active refresh token for active user | 200 + new token pair | `auth.service.ts` refreshTokens |
| Refresh token for inactive user | **403 "Account has been deactivated."** | T2 fix |
| Refresh token for deleted user | 401 "Invalid or expired refresh token" | T2 fix |
| Authenticated request with valid token, active user | 200 | T3 fix (DB check passes) |
| Authenticated request with valid token, user deactivated AFTER token issued | **403 "Account has been deactivated."** | T3 + T4 fix |
| Authenticated request with valid token, user deleted AFTER token issued | **403 "Account no longer exists"** | T3 fix |
| OWNER creating OWNER | 201 (allowed) | Existing `canActOn` |
| ADMIN trying to create OWNER | 403 | Existing `canActOn` |
| Actor resetting own password via admin endpoint | **403 (self-reset blocked)** | T7 fix |
| ADMIN resetting MANAGER password | 200 (allowed) | T7 fix (role check passes) |
| MANAGER trying to reset ADMIN password | 403 | Role hierarchy check |
| Deactivating last OWNER | 409 (conflict) | Existing `countActiveOwners` guard |
| Deleting any OWNER | 403 | Existing OWNER delete guard |
| USER_CREATED audit entry generated | Log line with `audit: true` | T5 — `create()` |
| USER_DEACTIVATED audit entry generated | Log line with actor, target, old/new status | T5 — `updateStatus()` |
| USER_ROLE_CHANGED audit entry generated | Log line with old/new role | T5 — `update()` |
| USER_PASSWORD_RESET audit entry — no password in log | Log line with no `oldValue`/`newValue` | T5 — `resetPassword()` |
| USER_DELETED audit entry generated | Log line with deleted user email and role | T5 — `delete()` |

---

## 9. Remaining Recommendations

These are improvements worth considering in future iterations but were **not implemented** per the minimal-change mandate:

1. **`auth.repository.ts` `findById` over-fetches** — `passwordHash` is selected even when not needed (profile fetch, refresh). Add a `findByIdSafe` method that omits the hash.

2. **Access token expiry** — If `ACCESS_TOKEN_EXPIRES_IN` is set to a long value (e.g. 24 hours), the window between deactivation and forced logout on the next request is non-zero only in offline scenarios. Consider a short access token TTL (15 minutes) combined with silent refresh in the frontend.

3. **Audit log persistence** — Log-stream audit entries are lost if the log file is rotated without archiving. For a regulated ERP, consider writing audit events to a dedicated `audit_logs` DB table (append-only, no DELETE permission for app users).

4. **`tokenVersion` column** — The DB-check-per-request approach works perfectly. If API traffic grows, adding a `tokenVersion` integer column and embedding it in JWTs allows skipping the DB lookup on most requests while still invalidating on deactivation/role-change events.

5. **Rate limiting on login / refresh** — No rate limiting exists on `POST /api/auth/login` or `POST /api/auth/refresh`. A brute-force attack is possible. Consider `express-rate-limit` with IP-based limits.

6. **Refresh token rotation** — The current implementation issues a new refresh token on each `/refresh` call but does not invalidate the previous one. Implementing refresh token rotation (store token hash in DB, invalidate on use) would prevent token replay attacks.

7. **Logout endpoint** — Currently `POST /auth/logout` only tells the client to discard tokens. With the DB-check approach in place, true logout can be implemented by adding an `isActive`-style `forcedLogoutAt` timestamp that the middleware checks, or simply by deactivating and re-activating.
