import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.$executeRawUnsafe(
  `UPDATE "Test" SET "status" = 'PUBLISHED' WHERE "isDraft" = 0 AND "isActive" = 1 AND "status" = 'DRAFT'`,
);
await prisma.$executeRawUnsafe(
  `UPDATE "Test" SET "gradeId" = (SELECT "gradeId" FROM "Subject" WHERE "Subject"."id" = "Test"."subjectId") WHERE "gradeId" IS NULL`,
);
console.log("Backfill complete.");
await prisma.$disconnect();
