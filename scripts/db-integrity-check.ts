/**
 * Production ma’lumotlar tuzilishi tekshiruvi (o‘qish-only).
 * Usage: `npm run db:integrity` (.env / .env.local da DATABASE_URL)
 */
import "./db-env-for-cli";
import { PrismaClient } from "@prisma/client";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL yo‘q — db-env-for-cli yoki .env.local ni tekshiring.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;

    const dupEmails = await prisma.$queryRaw<Array<{ e: string; c: number }>>`
      SELECT lower(email) AS e, COUNT(*)::int AS c
      FROM "User"
      GROUP BY lower(email)
      HAVING COUNT(*) > 1
    `;

    const nonBcryptPasswords = await prisma.user.count({
      where: { NOT: { passwordHash: { startsWith: "$2" } } },
    });

    const pendingButVerified = await prisma.user.count({
      where: { status: "PENDING_VERIFICATION", emailVerified: true },
    });

    console.log("=== DB integrity (read-only) ===\n");
    console.log("Connection: OK");
    console.log(
      "Duplicate emails (lower(email) collision):",
      dupEmails.length ? dupEmails : "none — yaxshi",
    );
    if (dupEmails.length) {
      console.warn(
        "FIX: bir xil email turli registrda — qatorlarni birlashtiring; keyin emailni lower-case qilib saqlang.",
      );
    }

    console.log("\nPassword hashes not bcrypt ($2*):", nonBcryptPasswords);
    if (nonBcryptPasswords > 0) {
      console.warn("Bu akkauntlar credentials login qabul qilinmaydi — parolni bcrypt ga migratsiya qiling.");
    }

    console.log("\nPENDING_VERIFICATION + emailVerified=true (suspicious):", pendingButVerified);

    console.log("\nDone.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
