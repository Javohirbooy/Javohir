/**
 * 7-sinf matematika — 17-may (2 variant) DOCX dan.
 *   npm run seed:7sinf-may17
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { runMay17MathSeed } from "./lib/seed-may17-math";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

const prisma = new PrismaClient();

runMay17MathSeed(prisma, {
  packKey: "may17Math7Sinf",
  gradeNumber: 7,
  questionsDocx: "17-may 7-sinf.docx",
  extractBasename: "17-may-7-sinf-docx",
  answersCandidates: [
    "7-sinf-may17-javoblar.txt",
    "17-may 7-sinf javoblar.docx",
    "17-may 7-sinf javoblar.docx.txt",
  ],
  expectedVariants: 2,
})
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
