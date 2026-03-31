import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const isAdmin = process.argv.includes("--admin");

  if (!email || !password) {
    console.error("Usage: pnpm user:create <email> <password> [--admin]");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: isAdmin ? "ADMIN" : "USER",
    },
  });

  console.log(`Created ${isAdmin ? "admin" : "user"}: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
