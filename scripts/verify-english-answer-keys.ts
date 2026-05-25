/**
 * Answer.docx javoblari ↔ yuklangan ingliz tili testlari mosligini tekshiradi.
 *   npx tsx scripts/verify-english-answer-keys.ts
 *   AYUGRAM_DOCX_DIR="C:\...\AyuGram Desktop" npx tsx scripts/verify-english-answer-keys.ts
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { PrismaClient } from "@prisma/client";
import {
  lettersToIndices,
  parseAnswerKeyByGrade,
  parseStemThenInlineOptions,
  splitImtihonVariants,
  stripUntilFirstNumberedQuestion,
} from "../src/lib/ayugram-mcq-parse";
import { AYU_DERIVED_KEYS } from "../src/data/ayugram-derived-keys";

const PACK_KEY = "ayugramEnglishPack";
const prisma = new PrismaClient();

function textDirs(): string[] {
  const dirs: string[] = [];
  const fromEnv = process.env.AYUGRAM_TEXT_DIR?.trim();
  if (fromEnv) dirs.push(path.resolve(fromEnv));
  dirs.push(path.join(process.cwd(), "data", "ayugram-raw"));
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) dirs.push(path.join(home, "Downloads", "AyuGram Desktop"));
  return dirs;
}

function readTxt(name: string): string {
  for (const dir of textDirs()) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  const fallback = path.join(process.cwd(), "data", "ayugram-raw", name);
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, "utf8");
  throw new Error(`${name} topilmadi`);
}

async function readAnswerDocx(): Promise<string> {
  for (const dir of textDirs()) {
    const p = path.join(dir, "Answer.docx");
    if (!fs.existsSync(p)) continue;
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ path: p })).value;
  }
  return readTxt("Answer.docx.txt");
}

function indexToLetter(i: number): string {
  return "ABCD"[i] ?? "?";
}

async function main() {
  console.log("=== Answer.docx ↔ Ingliz tili testlari tekshiruvi ===\n");

  const answerRaw = await readAnswerDocx();
  const answerByGrade = parseAnswerKeyByGrade(answerRaw);

  console.log("Answer.docx dan topilgan sinflar:", [...answerByGrade.keys()].sort((a, b) => a - b).join(", ") || "(yo‘q)");
  for (const [g, letters] of [...answerByGrade.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  GRADE ${g}: ${letters.length} ta javob — ${letters.join("")}`);
  }

  console.log("\n--- 4–6-sinf (imtihon, 2 variant) ---");
  console.log(
    "Answer.docx da 4/5/6-sinf kaliti YO‘Q. Seed skripti AYU_DERIVED_KEYS (grammatika bo‘yicha tuzilgan) ishlatadi.\n",
  );

  const imtihonByGrade = {
    4: "Test imtihon 4 1-2 variant.docx.txt",
    5: "Test imtihon 5 1-2 variant.docx.txt",
    6: "Test imtihon 6 1-2 variant.docx.txt",
  } as const;

  const derivedMismatch: string[] = [];

  for (const g of [4, 5, 6] as const) {
    const raw = readTxt(imtihonByGrade[g]);
    const variants = splitImtihonVariants(raw);
    const keys =
      g === 4
        ? [AYU_DERIVED_KEYS.grade4.variant1, AYU_DERIVED_KEYS.grade4.variant2]
        : g === 5
          ? [AYU_DERIVED_KEYS.grade5.variant1, AYU_DERIVED_KEYS.grade5.variant2]
          : [AYU_DERIVED_KEYS.grade6.variant1, AYU_DERIVED_KEYS.grade6.variant2];

    for (let vi = 0; vi < variants.length; vi++) {
      const parsed = parseStemThenInlineOptions(variants[vi]!.bodyLines);
      const key = keys[vi];
      const ok = key && parsed.length === key.length;
      console.log(
        `${g}-sinf ${vi + 1}-variant: ${parsed.length} savol, kalit ${key?.length ?? 0} — ${ok ? "OK (derived, Answer.docx emas)" : "XATO"}`,
      );
      if (!ok) derivedMismatch.push(`${g}-sinf v${vi + 1}`);
    }
  }

  console.log("\n--- 7–9-sinf (yakuniy, Answer.docx) ---");

  const fileVsDb: { grade: number; mismatches: number; details: string[] }[] = [];

  for (const g of [7, 8, 9] as const) {
    const letters = answerByGrade.get(g);
    const expectedIndices = letters ? lettersToIndices(letters) : [];

    const lines = stripUntilFirstNumberedQuestion(readTxt(`Grade ${g}.docx.txt`).split(/\n/));
    const parsed = parseStemThenInlineOptions(lines);

    console.log(`\nGRADE ${g}:`);
    console.log(`  Savollar (Grade ${g}.docx): ${parsed.length} ta`);
    console.log(`  Javoblar (Answer.docx): ${letters?.length ?? 0} ta`);

    if (!letters || letters.length !== 30) {
      console.log(`  ⚠ Answer.docx da 30 ta harf yo‘q — moslashtirib bo‘lmaydi`);
      continue;
    }
    if (parsed.length !== 30) {
      console.log(`  ⚠ Savollar soni 30 emas — seed ham xato beradi`);
      continue;
    }

    const tests = await prisma.test.findMany({
      where: {
        AND: [
          { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
          { importMetadataJson: { contains: `"gradeNumber":${g}` } },
          { importMetadataJson: { contains: `"kind":"yakuniy"` } },
        ],
      },
      include: {
        questions: { orderBy: { order: "asc" }, select: { text: true, optionsJson: true, correctIndex: true } },
      },
    });

    if (tests.length === 0) {
      console.log(`  ⚠ Bazada ${g}-sinf yakuniy test topilmadi`);
    } else {
      const t = tests[0]!;
      const dbIndices = t.questions.map((q) => q.correctIndex);
      let dbMismatch = 0;
      for (let i = 0; i < 30; i++) {
        if (dbIndices[i] !== expectedIndices[i]) dbMismatch++;
      }
      console.log(`  Bazadagi test: "${t.title}"`);
      console.log(
        `  DB ↔ Answer.docx: ${dbMismatch === 0 ? "✓ TO‘LIQ MOS" : `✗ ${dbMismatch}/30 farq`}`,
      );

      const details: string[] = [];
      if (dbMismatch > 0) {
        for (let i = 0; i < 30; i++) {
          if (dbIndices[i] !== expectedIndices[i]) {
            const opts = JSON.parse(t.questions[i]!.optionsJson) as string[];
            details.push(
              `  Q${i + 1}: Answer=${letters[i]} DB=${indexToLetter(dbIndices[i]!)} | ${t.questions[i]!.text.slice(0, 55)}…`,
            );
          }
        }
        details.slice(0, 5).forEach((d) => console.log(d));
        if (details.length > 5) console.log(`  … yana ${details.length - 5} ta`);
      }
      fileVsDb.push({ grade: g, mismatches: dbMismatch, details });
    }

    // Har bir savol: Answer.docx harfi qaysi variant matniga mos
    let outOfRange = 0;
    for (let i = 0; i < 30; i++) {
      const letter = letters[i]!;
      const idx = expectedIndices[i]!;
      const opt = parsed[i]!.options[idx];
      if (!opt?.trim()) outOfRange++;
    }
    console.log(`  Kalit harflari variantlarda: ${outOfRange === 0 ? "✓ barchasi mavjud" : `⚠ ${outOfRange} ta bo‘sh`}`);
  }

  console.log("\n--- 4–6-sinf: DB ↔ derived keys ---");
  let derivedDbOk = true;
  for (const g of [4, 5, 6] as const) {
    const keys =
      g === 4
        ? [AYU_DERIVED_KEYS.grade4.variant1, AYU_DERIVED_KEYS.grade4.variant2]
        : g === 5
          ? [AYU_DERIVED_KEYS.grade5.variant1, AYU_DERIVED_KEYS.grade5.variant2]
          : [AYU_DERIVED_KEYS.grade6.variant1, AYU_DERIVED_KEYS.grade6.variant2];

    for (let vi = 0; vi < 2; vi++) {
      const tests = await prisma.test.findMany({
        where: {
          AND: [
            { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
            { importMetadataJson: { contains: `"gradeNumber":${g}` } },
            { importMetadataJson: { contains: `"kind":"imtihon"` } },
            { importMetadataJson: { contains: `"variant":${vi + 1}` } },
          ],
        },
        include: {
          questions: { orderBy: { order: "asc" }, select: { correctIndex: true } },
        },
      });
      const t = tests[0];
      if (!t) {
        console.log(`${g}-sinf v${vi + 1}: bazada test yo‘q`);
        derivedDbOk = false;
        continue;
      }
      const key = keys[vi]!;
      const db = t.questions.map((q) => q.correctIndex);
      let diff = 0;
      for (let i = 0; i < key.length; i++) {
        if (db[i] !== key[i]) diff++;
      }
      console.log(
        `${g}-sinf v${vi + 1}: DB ↔ derived ${diff === 0 ? "✓ MOS" : `✗ ${diff}/30 farq`}`,
      );
      if (diff > 0) derivedDbOk = false;
    }
  }

  console.log("\n=== XULOSA ===");
  if (!answerByGrade.has(4) && !answerByGrade.has(5) && !answerByGrade.has(6)) {
    console.log("• Answer.docx faqat 7, 8, 9-sinf uchun — 4–6-sinf javoblari boshqa manbadan (derived keys).");
  }
  const allDbOk = fileVsDb.every((x) => x.mismatches === 0);
  if (fileVsDb.length && allDbOk) {
    console.log("• 7–9-sinf: bazadagi testlar Answer.docx bilan 100% mos.");
  } else if (fileVsDb.some((x) => x.mismatches > 0)) {
    console.log("• 7–9-sinf: bazada Answer.docx dan farqli javoblar bor (yuqorida).");
  }
  if (derivedMismatch.length) console.log("• 4–6-sinf parse xatosi:", derivedMismatch.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
