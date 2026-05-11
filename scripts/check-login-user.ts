/**
 * One-off: inspect why credentials login may reject (no secrets printed).
 * Usage: npx tsx scripts/check-login-user.ts [email...]
 */
import { config } from "dotenv";

config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BCRYPT_PREFIX = "$2";

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  const emails =
    args.length > 0
      ? args.map((e) => e.trim().toLowerCase())
      : ["java@gmail.com", "ava@gmail.com"];

  for (const email of emails) {
    const u = await prisma.user.findUnique({
      where: { email },
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
      console.log(`${email}: NOT_FOUND`);
      continue;
    }
    const ph = u.passwordHash ?? "";
    const isBcrypt = ph.startsWith(BCRYPT_PREFIX);
    const blocksLogin: string[] = [];
    if (u.status === "PENDING_VERIFICATION" || !u.emailVerified) {
      blocksLogin.push("email_not_verified_or_pending");
    }
    if (u.status && u.status !== "ACTIVE") {
      blocksLogin.push(`status_not_active:${u.status}`);
    }
    if (!isBcrypt) {
      blocksLogin.push("password_not_bcrypt");
    }
    if (!u.role) {
      blocksLogin.push("role_missing");
    }

    console.log(
      JSON.stringify(
        {
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          emailVerified: u.emailVerified,
          passwordIsBcrypt: isBcrypt,
          passwordHashLength: ph.length,
          wouldPassAuthorizeGuards: blocksLogin.length === 0,
          blockReasons: blocksLogin.length ? blocksLogin : undefined,
        },
        null,
        2,
      ),
    );
  }

  const needle = emails[0]?.split("@")[0];
  if (needle && needle.length >= 2) {
    const like = await prisma.user.findMany({
      where: { email: { contains: needle, mode: "insensitive" } },
      take: 15,
      select: { email: true, status: true, emailVerified: true },
    });
    if (like.length) {
      console.log(`emails containing "${needle}":`, JSON.stringify(like, null, 2));
    }
  }
}

main()
  .catch((e: Error) => {
    console.error("ERR", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
