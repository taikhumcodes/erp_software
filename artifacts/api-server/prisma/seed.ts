/**
 * Prisma seed script — creates the initial roles and owner/admin user.
 *
 * Run:
 *   cd artifacts/api-server
 *   npx tsx prisma/seed.ts
 *
 * Idempotent: safe to run multiple times; skips records that already exist.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── 1. Seed roles ──────────────────────────────────────────────────────────
  const roles = [
    { name: "OWNER",     description: "Full system access, cannot be restricted" },
    { name: "ADMIN",     description: "Manage users, settings, all modules" },
    { name: "MANAGER",   description: "Approve transactions, view all reports" },
    { name: "SALES",     description: "Create and manage sales orders" },
    { name: "WAREHOUSE", description: "Manage inventory and delivery orders" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`✓ Seeded ${roles.length} roles`);

  // ── 2. Seed owner user ─────────────────────────────────────────────────────
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: "OWNER" } });

  const ownerEmail    = process.env.SEED_OWNER_EMAIL    ?? "admin@albunyan.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "Admin@1234";
  const ownerName     = process.env.SEED_OWNER_NAME     ?? "System Owner";

  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });

  if (existing) {
    console.log(`⚠  User "${ownerEmail}" already exists — skipping`);
  } else {
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    await prisma.user.create({
      data: {
        email:        ownerEmail,
        passwordHash,
        name:         ownerName,
        nameAr:       "مالك النظام",
        roleId:       ownerRole.id,
        isActive:     true,
      },
    });
    console.log(`✓ Created owner user: ${ownerEmail} / ${ownerPassword}`);
    console.log("  ⚠  Change this password immediately after first login!");
  }

  // ── 3. Seed hardware business units ──────────────────────────────────────────
  const units = [
    { abbreviation: "PCS",  name: "Pieces",     nameAr: "قطع" },
    { abbreviation: "NOS",  name: "Numbers",    nameAr: "عدد" },
    { abbreviation: "BOX",  name: "Box",        nameAr: "صندوق" },
    { abbreviation: "PKT",  name: "Packet",     nameAr: "حزمة" },
    { abbreviation: "SET",  name: "Set",        nameAr: "طقم" },
    { abbreviation: "BND",  name: "Bundle",     nameAr: "ربطة" },
    { abbreviation: "ROLL", name: "Roll",       nameAr: "لفة" },
    { abbreviation: "DOZ",  name: "Dozen",      nameAr: "درزن" },
    { abbreviation: "BAG",  name: "Bag",        nameAr: "كيس" },
    { abbreviation: "KG",   name: "Kilogram",   nameAr: "كيلوغرام" },
    { abbreviation: "MTR",  name: "Meter",      nameAr: "متر" },
    { abbreviation: "LTR",  name: "Liter",      nameAr: "لتر" },
    { abbreviation: "GAL",  name: "Gallon",     nameAr: "جالون" },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: unit,
    });
  }
  console.log(`✓ Seeded ${units.length} units`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
