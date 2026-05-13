/**
 * Internet (production) uchun: `java@gmail.com` demo SUPER_ADMIN — parol `password` (bcrypt).
 * Boshqa foydalanuvchilarni o‘chirmaydi, faqat shu emailni yaratadi yoki yangilaydi.
 *
 * Vercel / Neon URL ni `.env` ga qo‘ygan bo‘lsangiz yoki bir martalik:
 *   PowerShell:
 *     $env:DATABASE_URL="postgresql://..."; npx tsx scripts/ensure-demo-java.ts
 *   bash:
 *     DATABASE_URL="postgresql://..." npx tsx scripts/ensure-demo-java.ts
 *
 * Internetdagi sayt uchun: Vercel **Production** bazasiga yozish kerak.
 * `vercel env pull` odatda **development** ni tortadi — sayt esa Production `DATABASE_URL` ishlatadi.
 *
 * To‘g‘ri ketma-ketlik:
 *   vercel env pull .env.local --environment production
 *   npm run demo:ensure-java
 * yoki bir qatorda: npm run demo:ensure-java:production
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "java@gmail.com";
const PLAIN_PASSWORD = "password";
const NAME = "Demo Super Admin";

function safeDbTargetHint(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname || "?";
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return `${host}${isLocal ? "  (DIQQAT: bu mahalliy — internetdagi sayt boshqa Neon/Vercel URL ishlatishi mumkin)" : ""}`;
  } catch {
    return "(URL parse qilinmadi)";
  }
}

async function main() {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    console.error("DATABASE_URL bo‘sh. Vercel/Neon ulanish qatorini qo‘ying.");
    process.exit(1);
  }

  console.log("Ulangan bazaning hosti:", safeDbTargetHint(rawUrl));

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

  const verify = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { passwordHash: true },
  });
  const match = verify?.passwordHash ? await bcrypt.compare(PLAIN_PASSWORD, verify.passwordHash) : false;

  console.log(`OK — ${user.email} tayyor. Kirish: email=${EMAIL}, parol=${PLAIN_PASSWORD}`);
  console.log("Parol tekshiruvi (bcrypt):", match ? "MOS_KELADI" : "XATO (qayta urinib ko‘ring)");
  if (!match) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
