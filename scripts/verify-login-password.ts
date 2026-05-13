/**
 * Parol mosligini tekshirish (maxfiy chiqarilmaydi).
 * Ishlatish: npx tsx scripts/verify-login-password.ts <email> <parol>
 */
import { config } from "dotenv";

config();

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3] ?? "";
  if (!email?.includes("@") || !password) {
    console.error("Usage: npx tsx scripts/verify-login-password.ts <email> <password>");
    process.exitCode = 1;
    return;
  }
  const u = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  if (!u?.passwordHash) {
    console.log("result: USER_NOT_FOUND");
    return;
  }
  const ok = await bcrypt.compare(password, u.passwordHash);
  console.log("result:", ok ? "PASSWORD_MATCH" : "PASSWORD_MISMATCH");
}

main()
  .catch((e: Error) => {
    console.error("ERR", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
