/**
 * Barcha AyuGram ingliz tili testlarida savol ballarini yangilaydi.
 *   npx tsx scripts/patch-english-imtihon-points.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { PrismaClient } from "@prisma/client";
import { englishImtihonPointsForOrder } from "../src/lib/mcq/english-imtihon-points";

const PACK_KEY = "ayugramEnglishPack";
const prisma = new PrismaClient();

async function main() {
  const tests = await prisma.test.findMany({
    where: { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
    select: {
      id: true,
      title: true,
      questions: { select: { id: true, order: true }, orderBy: { order: "asc" } },
    },
  });

  let updated = 0;
  for (const test of tests) {
    for (const q of test.questions) {
      const points = englishImtihonPointsForOrder(q.order);
      await prisma.question.update({
        where: { id: q.id },
        data: { points },
      });
      updated++;
    }
    console.log("OK:", test.title, test.questions.length, "savol");
  }
  console.log("Jami yangilangan savollar:", updated);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
