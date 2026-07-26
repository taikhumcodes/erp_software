import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
    }
  });
  
  if (users.length === 0) {
    console.log("No users found.");
  } else {
    for (const u of users) {
      console.log(`Email: ${u.email}`);
      console.log(`Name: ${u.name}`);
      console.log(`Role: ${u.role?.name}`);
      console.log(`Active: ${u.isActive}`);
      console.log(`Created: ${u.createdAt}`);
      console.log("---");
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
