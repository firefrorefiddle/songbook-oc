import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: npx tsx set-password.ts <email-or-username> <new-password>",
    );
    console.error(
      "Example: npx tsx set-password.ts admin@example.com mynewpassword",
    );
    process.exit(1);
  }

  const identifier = args[0];
  const newPassword = args[1];

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user) {
    console.error(`User not found: ${identifier}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(
    `Password updated for user: ${user.email} (${user.username || "no username"})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
