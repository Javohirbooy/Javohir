/**
 * Internet (production) uchun: `java@gmail.com` demo SUPER_ADMIN — parol `password` (bcrypt).
 * Boshqa foydalanuvchilarni o‘chirmaydi, faqat shu emailni yaratadi yoki yangilaydi.
 *
 * Vercel / Neon URL ni `.env` ga qo‘ygan bo‘lsangiz yoki bir martalik:
 *   PowerShell:
 *     $env:DATABASE_URL="postgresql://..."; npx tsx scripts/ensure-demo-java.ts
 *   bash:
 *     DATABASE_URL="postgresql://..." npx tsx scripts/ensure-demo-java.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "java@gmail.com";
const PLAIN_PASSWORD = "password";
const NAME = "Demo Super Admin";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL bo‘sh. Vercel/Neon ulanish qatorini qo‘ying.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PLAIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: NAME,
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
      name: NAME,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  console.log(`OK — ${user.email} tayyor. Kirish: email=${EMAIL}, parol=${PLAIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
