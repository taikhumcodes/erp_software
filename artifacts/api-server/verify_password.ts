import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@albunyan.com';
  const plainPassword = 'Admin@1234';

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log("User not found!");
    return;
  }

  console.log(`User: ${user.email}`);
  console.log(`Hash: ${user.passwordHash}`);
  console.log(`Active: ${user.isActive}`);

  const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
  console.log(`Password Match: ${isMatch}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
