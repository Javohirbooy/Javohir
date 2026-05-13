/**
 * `.env` + `.env.local` (vercel env pull) bo‘yicha bazada java@gmail.com + parol holati.
 * Ishlatish: avval `vercel env pull .env.local --environment production`
 * Keyin: npm run login:diagnose
 */
import "./db-env-for-cli";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const EMAIL = "java@gmail.com";
const DEMO_PASSWORD = "password";
const BCRYPT_PREFIX = "$2";

function dbHost(): string {
  const raw = process.env.DATABASE_URL?.trim() || "";
  if (!raw) return "(DATABASE_URL bo‘sh — .env.local da Neon/Postgres URL yo‘q)";
  try {
    return new URL(raw).hostname;
  } catch {
    return "(URL noto‘g‘ri)";
  }
}

async function main() {
  console.log("=== IQ Monitoring — kirish diagnostikasi ===");
  console.log("Baza hosti:", dbHost());
  console.log(
    "Eslatma: `vercel env pull` sizda **development** bo‘lsa, bu yerda ham development bazasi chiqadi.",
    "Internet sayti uchun: vercel env pull .env.local --environment production",
  );
  const authSecret = process.env.AUTH_SECRET?.trim();
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim();
  console.log("AUTH_SECRET:", authSecret ? `bor (${authSecret.length} belgi)` : "YO‘Q");
  console.log("NEXTAUTH_SECRET:", nextAuthSecret ? `bor (${nextAuthSecret.length} belgi)` : "YO‘Q");
  console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL?.trim() || "(yo‘q)");
  console.log("AUTH_URL:", process.env.AUTH_URL?.trim() || "(yo‘q)");
  console.log("UPSTASH_REDIS_REST_URL:", process.env.UPSTASH_REDIS_REST_URL?.trim() ? "bor" : "YO‘Q");
  console.log("---");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL (yoki POSTGRES_PRISMA_URL / POSTGRES_URL) .env.local da topilmadi.\n" +
        "Vercelda o‘zgaruvchi nomlarini tekshiring; `vercel env pull .env.local --environment production` qayta ishga tushiring.",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.findUnique({
      where: { email: EMAIL },
      select: {
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        passwordHash: true,
      },
    });

    if (!u) {
      console.log("Foydalanuvchi:", EMAIL, "→ NOT_FOUND (shu bazada yo‘q — npm run demo:ensure-java ishga tushiring)");
      return;
    }

    const ph = u.passwordHash ?? "";
    const isBcrypt = ph.startsWith(BCRYPT_PREFIX);
    const pwdOk = isBcrypt ? await bcrypt.compare(DEMO_PASSWORD, ph) : false;
    const blocks: string[] = [];
    if (u.status === "PENDING_VERIFICATION" || !u.emailVerified) blocks.push("email_not_verified");
    if (u.status && u.status !== "ACTIVE") blocks.push(`status:${u.status}`);
    if (!isBcrypt) blocks.push("not_bcrypt");
    if (!u.role) blocks.push("no_role");

    console.log("Foydalanuvchi:", u.email, "|", u.name, "| role:", u.role, "| status:", u.status);
    console.log("emailVerified:", u.emailVerified);
    console.log("parol `password` bilan mos:", pwdOk ? "HA" : "YO‘Q");
    console.log("authorize() bloklari:", blocks.length ? blocks.join(", ") : "(yo‘q — parol tekshiruvigacha boradi)");

    if (blocks.length === 0 && pwdOk) {
      console.log(
        "\nXulosa: bu bazada kirish **ishlashi kerak**. Saytda ishlamasa — boshqa domen/Preview deploy, www vs non-www, yoki forma xatosi (faqat `password`, 8 harf).",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERR", e);
  process.exitCode = 1;
});
