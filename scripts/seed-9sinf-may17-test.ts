/**
 * 9-sinf matematika — 17-may DOCX dan (faylda 1 variant).
 *   npm run seed:9sinf-may17
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { runMay17MathSeed } from "./lib/seed-may17-math";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

const prisma = new PrismaClient();

runMay17MathSeed(prisma, {
  packKey: "may17Math9Sinf",
  gradeNumber: 9,
  questionsDocx: "17-may 9-sinf (2).docx",
  extractBasename: "17-may-9-sinf-2-docx",
  answersCandidates: [
    "9-sinf-may17-javoblar.txt",
    "17-may 9-sinf javoblar.docx",
    "17-may 9-sinf javoblar.docx.txt",
  ],
  expectedVariants: 1,
})
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
