/**
 * 17-may matematika: to‘liq bo‘lmagan savollar + 9-sinf 30-savol formulasi.
 *   npx tsx scripts/patch-may17-question-fixes.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TextPatch = {
  packKey: string;
  variant: number;
  order: number;
  text: string;
  options?: [string, string, string, string];
};

const PATCHES: TextPatch[] = [
  {
    packKey: "may17Math7Sinf",
    variant: 2,
    order: 27,
    text: "28 sonining barcha natural bo‘luvchilari yig‘indisini toping.",
    options: ["44", "58", "56", "62"],
  },
  {
    packKey: "may17Math8Sinf",
    variant: 1,
    order: 2,
    text: "10 ta odam bir-biri bilan salomlashsa, nechta salomlashish bo‘ladi?",
    options: ["10", "20", "100", "45"],
  },
  {
    packKey: "may17Math8Sinf",
    variant: 2,
    order: 25,
    text: [
      "Hayvonot bog‘ida ilonlar, kiyiklar va burgutlar bor. Ularning jami",
      "30 ta boshi va 54 ta oyog‘i bor. Shuningdek, ilonlar soni kiyiklar",
      "va burgutlarning umumiy sonidan ikki marta kam. Hayvonot bog‘ida",
      "nechta burgut bor?",
    ].join("\n"),
    options: ["7", "10", "11", "13"],
  },
  {
    packKey: "may17Math9Sinf",
    variant: 1,
    order: 29,
    text: [
      "Agar",
      "",
      "$$\\begin{cases} a+2b-3c=14 \\\\ 2a-2b+3c=16 \\end{cases}$$",
      "",
      "bo‘lsa, $2c-a-b$ ning qiymatini toping.",
    ].join("\n"),
    options: ["1", "2", "-11", "0"],
  },
];

async function main() {
  for (const spec of PATCHES) {
    const test = await prisma.test.findFirst({
      where: {
        AND: [
          { importMetadataJson: { contains: `"${spec.packKey}":true` } },
          { importMetadataJson: { contains: `"variant":${spec.variant}` } },
        ],
      },
      include: {
        questions: { where: { order: spec.order }, select: { id: true, text: true } },
      },
    });
    if (!test?.questions[0]) {
      console.warn("Topilmadi:", spec.packKey, spec.variant, spec.order);
      continue;
    }
    const q = test.questions[0];
    await prisma.question.update({
      where: { id: q.id },
      data: {
        text: spec.text,
        ...(spec.options ? { optionsJson: JSON.stringify(spec.options) } : {}),
      },
    });
    console.log("OK:", test.title, `Q${spec.order + 1}`, "len:", spec.text.length);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
