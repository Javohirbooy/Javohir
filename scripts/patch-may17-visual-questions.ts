/**
 * 7/8-sinf imtihon savollaridagi rasmlar va tenglamalar (DOCX → public URL → DB).
 *   npx tsx scripts/patch-may17-visual-questions.ts
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { PrismaClient } from "@prisma/client";
import {
  extractEmbedBuffersInXml,
  loadDocxZip,
  variantXmlSlice,
  xmlSliceBetween,
} from "../src/lib/docx/extract-docx-images";
import { uploadPublicImageBuffer } from "../src/lib/uploads/blob-image";

const prisma = new PrismaClient();
const ASSET_DIR = path.join(process.cwd(), "public", "test-assets", "may17");

type PatchSpec = {
  packKey: string;
  variant: number;
  order: number;
  buildText: (imageUrls: string[]) => string;
};

function docxPath(name: string): string {
  const dirs = [
    process.env.AYUGRAM_DOCX_DIR?.trim(),
    path.join(process.cwd(), "data", "ayugram-docx"),
    path.join(process.env.USERPROFILE ?? "", "Downloads", "AyuGram Desktop"),
  ].filter(Boolean) as string[];
  for (const dir of dirs) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`${name} topilmadi`);
}

async function saveImage(
  slug: string,
  buf: Buffer,
  contentType: string,
): Promise<string> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const ext = contentType.includes("png") ? "png" : "jpg";
  const fileName = `${slug}.${ext}`;
  const diskPath = path.join(ASSET_DIR, fileName);
  fs.writeFileSync(diskPath, buf);

  const blobUrl = await uploadPublicImageBuffer(`test-assets/may17/${fileName}`, buf, contentType);
  return blobUrl ?? `/test-assets/may17/${fileName}`;
}

function mdImg(url: string, alt: string) {
  return `![${alt}](${url})`;
}

const PATCHES: PatchSpec[] = [
  {
    packKey: "may17Math7Sinf",
    variant: 2,
    order: 17,
    buildText: (urls) =>
      [
        "Quyida berilgan birlik kublardan tashkil topgan jismlarning qaysi biri boshqasidan farqli?",
        "",
        urls[0] ? mdImg(urls[0], "A B C D variantlari") : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
  },
  {
    packKey: "may17Math7Sinf",
    variant: 1,
    order: 27,
    buildText: (urls) =>
      [
        "Behruzda to‘rtta har xil muntazam ko‘pburchak bor: uchburchak, kvadrat, beshburchak va oltiburchak. Ularning tomonlari uzunliklari santimetrlarda butun sonlar bilan ifodalanadi. Behruz ushbu shakllarni tomonlarining uzunliklari bo‘yicha tartiblaganida quyidagicha bo‘ldi:",
        urls[0] ? mdImg(urls[0], "Tomon bo‘yicha tartib") : "",
        "Perimetrlari bo‘yicha tartiblaganida esa quyidagicha holat bo‘ldi:",
        urls[1] ? mdImg(urls[1], "Perimetr bo‘yicha tartib") : "",
        "Agar muntazam uchburchakning tomoni 28 cm teng bo‘lsa, muntazam beshburchakning perimetrini toping (cm).",
      ]
        .filter(Boolean)
        .join("\n\n"),
  },
  {
    packKey: "may17Math8Sinf",
    variant: 1,
    order: 13,
    buildText: () =>
      [
        "$x+y$ ning yig‘indisini toping.",
        "",
        "$$\\begin{cases} 5x - 4y = 22 \\\\ 13x + 2y = 20 \\end{cases}$$",
      ].join("\n"),
  },
];

async function main() {
  const buf7 = fs.readFileSync(docxPath("17-may 7-sinf.docx"));
  const buf8 = fs.readFileSync(docxPath("17-may 8-sinf (2).docx"));
  const zip7 = await loadDocxZip(buf7);
  const zip8 = await loadDocxZip(buf8);
  const xml7 = (await zip7.file("word/document.xml")?.async("string")) ?? "";
  const xml8 = (await zip8.file("word/document.xml")?.async("string")) ?? "";

  const v1Xml = variantXmlSlice(xml7, 7, 0);
  const v2Xml = variantXmlSlice(xml7, 7, 1);

  const q28Slice = xmlSliceBetween(v1Xml, "Behruzda", "29.");
  const q28Images = await extractEmbedBuffersInXml(zip7, q28Slice);

  const q18Slice = xmlSliceBetween(v2Xml, "kublar", "19.");
  const q18Images = await extractEmbedBuffersInXml(zip7, q18Slice);

  const imageMap = new Map<string, string[]>();

  const q18Url = q18Images[0]
    ? await saveImage("7sinf-v2-q18", q18Images[0].buf, q18Images[0].contentType)
    : "";
  imageMap.set("may17Math7Sinf:2:17", q18Url ? [q18Url] : []);

  const q28Urls: string[] = [];
  for (let i = 0; i < Math.min(2, q28Images.length); i++) {
    const img = q28Images[i]!;
    q28Urls.push(await saveImage(`7sinf-v1-q28-${i + 1}`, img.buf, img.contentType));
  }
  imageMap.set("may17Math7Sinf:1:27", q28Urls);

  imageMap.set("may17Math8Sinf:1:13", []);

  for (const spec of PATCHES) {
    const key = `${spec.packKey}:${spec.variant}:${spec.order}`;
    const urls = imageMap.get(key) ?? [];
    const text = spec.buildText(urls);

    const test = await prisma.test.findFirst({
      where: {
        AND: [
          { importMetadataJson: { contains: `"${spec.packKey}":true` } },
          { importMetadataJson: { contains: `"variant":${spec.variant}` } },
        ],
      },
      include: {
        questions: { where: { order: spec.order }, select: { id: true, text: true, optionsJson: true } },
      },
    });
    if (!test?.questions[0]) {
      console.warn("Topilmadi:", key);
      continue;
    }
    const q = test.questions[0];
    await prisma.question.update({
      where: { id: q.id },
      data: {
        text,
        optionsJson: JSON.stringify(["A", "B", "C", "D"]),
      },
    });
    console.log("OK:", test.title, `Q${spec.order + 1}`, "img:", urls.length, "len:", text.length);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
