---
name: Prisma v5 pinning
description: Why this project pins Prisma to v5 and what breaks in v7
---

# Prisma version pinning

**Rule:** Always install `prisma@^5` and `@prisma/client@^5` for this project. Never use v6 or v7.

**Why:** Prisma v7 removed support for `url = env("DATABASE_URL")` inside the `datasource` block of `schema.prisma`. It requires a separate `prisma.config.ts` file and a `@prisma/adapter-pg` adapter in the `PrismaClient` constructor. This is a breaking API change that requires significant refactoring.

**How to apply:** On any `pnpm add prisma` or `pnpm add @prisma/client`, always pin the version:
```bash
cd artifacts/api-server
pnpm add @prisma/client@^5
pnpm add -D prisma@^5
```

After installation, run:
```bash
npx prisma generate --schema=./prisma/schema.prisma
```

**Also note:** `pnpm approve-builds` is required after Prisma installation (interactive, no --yes flag support).
