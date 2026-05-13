/**
 * Lokal / serverda bir foydalanuvchi parolini bcrypt bilan yangilash.
 * Ishlatish: npx tsx scripts/set-user-password.ts <email> <yangiParol>
 */
import "./db-env-for-cli";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const newPassword = process.argv[3] ?? "";
  if (!email?.includes("@")) {
    console.error("Usage: npx tsx scripts/set-user-password.ts <email> <newPassword>");
    process.exitCode = 1;
    return;
  }
  if (newPassword.length < 6) {
    console.error("Parol kamida 6 belgi bo‘lsin.");
    process.exitCode = 1;
    return;
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL topilmadi.");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const r = await prisma.user.updateMany({
      where: { email },
      data: { passwordHash, mustChangePassword: false },
    });
    if (r.count === 0) {
      console.error(`Foydalanuvchi topilmadi: ${email}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Parol yangilandi: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
