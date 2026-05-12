/**
 * Faqat bitta asosiy SUPER_ADMIN akkauntini yaratadi/yangilaydi.
 * To‘liq `prisma/seed.ts` ishga tushmasin — u productionda User jadvalini tozalaydi.
 *
 * Ishlatish (mahalliy terminal, DATABASE_URL production Neon ga yo‘naltirilgan bo‘lsa):
 *   $env:PRIMARY_ADMIN_EMAIL="java@gmail.com"; $env:PRIMARY_ADMIN_PASSWORD="..."; npx tsx scripts/upsert-primary-admin.ts
 *
 * Linux/macOS:
 *   PRIMARY_ADMIN_EMAIL=java@gmail.com PRIMARY_ADMIN_PASSWORD='...' npx tsx scripts/upsert-primary-admin.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROUNDS = 12;

async function main() {
  const email = process.env.PRIMARY_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PRIMARY_ADMIN_PASSWORD;
  const name = process.env.PRIMARY_ADMIN_NAME?.trim() || "Asosiy administrator";

  if (!email?.includes("@")) {
    console.error(
      "PRIMARY_ADMIN_EMAIL yo‘q yoki noto‘g‘ri.\n" +
        "Misol (PowerShell): $env:PRIMARY_ADMIN_EMAIL=\"you@mail.com\"; $env:PRIMARY_ADMIN_PASSWORD=\"...\"; npx tsx scripts/upsert-primary-admin.ts",
    );
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("PRIMARY_ADMIN_PASSWORD kamida 8 belgi bo‘lishi kerak.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
      locale: "uz",
      avatarEmoji: "⚡",
    },
    update: {
      passwordHash,
      name,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  console.log(`OK — SUPER_ADMIN tayyor: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
