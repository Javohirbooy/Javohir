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
  if (!raw) {
    const hasKey = Object.prototype.hasOwnProperty.call(process.env, "DATABASE_URL");
    return hasKey
      ? "(DATABASE_URL kaliti bor, lekin QIYMAT bo‘sh — Vercelda to‘ldiring yoki Sensitive tufayli pull bo‘shmagan)"
      : "(DATABASE_URL kaliti yo‘q)";
  }
  try {
    return new URL(raw).hostname;
  } catch {
    return "(URL noto‘g‘ri)";
  }
}

function envPresence(name: string): string {
  if (!Object.prototype.hasOwnProperty.call(process.env, name)) return "kalit yo‘q";
  const v = process.env[name];
  if (v == null || !String(v).trim()) return "kalit bor, **QIYMAT BO‘SH**";
  return `bor (${String(v).trim().length} belgi)`;
}

async function main() {
  console.log("=== IQ Monitoring — kirish diagnostikasi ===");
  console.log("Baza hosti:", dbHost());
  console.log(
    "Eslatma: `vercel env pull` sizda **development** bo‘lsa, bu yerda ham development bazasi chiqadi.",
    "Internet sayti uchun: vercel env pull .env.local --environment production",
  );
  console.log("DATABASE_URL:", envPresence("DATABASE_URL"));
  console.log("DIRECT_URL:", envPresence("DIRECT_URL"));
  console.log("AUTH_SECRET:", envPresence("AUTH_SECRET"));
  console.log("NEXTAUTH_SECRET:", envPresence("NEXTAUTH_SECRET"));
  console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL?.trim() || "(qiymat bo‘sh yoki yo‘q)");
  console.log("AUTH_URL:", process.env.AUTH_URL?.trim() || "(qiymat bo‘sh yoki yo‘q)");
  console.log("UPSTASH_REDIS_REST_URL:", process.env.UPSTASH_REDIS_REST_URL?.trim() ? "bor" : "YO‘Q");

  const dbKeyHints = Object.keys(process.env)
    .filter((k) => /DATABASE|POSTGRES|NEON|PRISMA|DIRECT_URL|POOLING|SQL/i.test(k))
    .sort();
  console.log("process.env da DB bilan bog‘liq kalit nomlari (qiymat chiqarilmaydi):", dbKeyHints.length ? dbKeyHints.join(", ") : "(hech biri — Vercelda Postgres/Neon ulanmagan yoki `env pull` noto‘g‘ri muhit)");

  const authKeyHints = Object.keys(process.env)
    .filter((k) => /^(AUTH_|NEXTAUTH_)/i.test(k))
    .sort();
  console.log("AUTH / NEXTAUTH kalit nomlari:", authKeyHints.length ? authKeyHints.join(", ") : "(yo‘q)");
  console.log("---");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "PostgreSQL URL .env fayllarda topilmadi.\n" +
        "1) Vercel → Settings → Environment Variables: `DATABASE_URL` (Production) borligini tekshiring.\n" +
        "2) CMD: vercel env pull .env.local --environment production\n" +
        "3) Yoki Neon ulanish qatorini qo‘lda `.env.local` ga yozing: DATABASE_URL=\"postgresql://...\"\n" +
        "4) **Sensitive** deb belgilangan o‘zgaruvchilar ba’zan pull ga tushmaydi — shunda Dashboard dan nusxa oling.",
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
