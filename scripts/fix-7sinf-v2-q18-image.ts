/**
 * 7-sinf 2-variant 18-savol kub rasmini Blob URL ga yuklaydi.
 *   npx tsx scripts/fix-7sinf-v2-q18-image.ts
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { PrismaClient } from "@prisma/client";
import { extract7sinfV2Q18ImageBuffer } from "../src/lib/docx/extract-single-embed-image";
import { uploadPublicImageBuffer } from "../src/lib/uploads/blob-image";

const PACK_KEY = "may17Math7Sinf";
const Q18_ORDER = 17;

function docxPath(): string {
  const dirs = [
    process.env.AYUGRAM_DOCX_DIR?.trim(),
    path.join(process.cwd(), "data", "ayugram-docx"),
    path.join(process.env.USERPROFILE ?? "", "Downloads", "AyuGram Desktop"),
  ].filter(Boolean) as string[];
  for (const dir of dirs) {
    const p = path.join(dir, "17-may 7-sinf.docx");
    if (fs.existsSync(p)) return p;
  }
  throw new Error("17-may 7-sinf.docx topilmadi");
}

async function main() {
  const prisma = new PrismaClient();
  const img = await extract7sinfV2Q18ImageBuffer(docxPath());
  if (!img) throw new Error("18-savol rasmi DOCXdan topilmadi");

  let imageMd: string;
  const url = await uploadPublicImageBuffer(
    `test-import/7sinf-v2-q18-${Date.now()}.${img.contentType.includes("png") ? "png" : "jpg"}`,
    img.buf,
    img.contentType,
  );
  if (url) {
    imageMd = `![Kub variantlari](${url})`;
    console.log("Blob URL:", url);
  } else {
    const b64 = img.buf.toString("base64");
    imageMd = `![](data:${img.contentType};base64,${b64})`;
    console.warn("BLOB_READ_WRITE_TOKEN yo‘q — data URL (katta bo‘lishi mumkin)");
  }

  const test = await prisma.test.findFirst({
    where: {
      AND: [
        { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
        { importMetadataJson: { contains: '"variant":2' } },
      ],
    },
    include: {
      questions: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
    },
  });
  if (!test) throw new Error("7-sinf 2-variant test topilmadi");

  const q = test.questions.find((x) => x.order === Q18_ORDER);
  if (!q) throw new Error(`Savol order=${Q18_ORDER} topilmadi`);

  const stem =
    "Quyida berilgan birlik kublardan tashkil topgan jismlarning qaysi biri boshqasidan farqli?";
  const newText = `${stem}\n\n${imageMd}`;

  await prisma.question.update({
    where: { id: q.id },
    data: { text: newText },
  });

  console.log("Yangilandi:", test.title, "Q18, belgilar:", newText.length);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
