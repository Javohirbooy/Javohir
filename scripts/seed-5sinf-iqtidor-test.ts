/**
 * 5-sinf matematika testi (Iqtidor) — DOCX dan (OMML → LaTeX).
 *
 * Savollar: `5-sinf uchun.docx`
 * Javoblar: `Javoblar.docx` yoki `Javoblar.docx.txt`
 *
 * Papka: `AYUGRAM_DOCX_DIR` yoki `data/ayugram-docx` yoki Downloads/AyuGram Desktop
 *
 *   npm run seed:5sinf-iqtidor
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { PrismaClient } from "@prisma/client";
import {
  lettersToIndices,
  parseCompactLetterAnswerKey,
  parseNumberedUzMcqDocument,
} from "../src/lib/ayugram-mcq-parse";
import { docxBufferToMcqPlainText } from "../src/lib/docx-buffer-to-mcq-text";

const prisma = new PrismaClient();

const PACK_KEY = "iqtidorMath5Sinf";
const GRADE_NUMBER = 5;
const QUESTIONS_DOCX = "5-sinf uchun.docx";
const ANSWERS_DOCX = "Javoblar.docx";
const ANSWERS_TXT = "Javoblar.docx.txt";

function docxDirs(): string[] {
  const dirs: string[] = [];
  const fromEnv = process.env.AYUGRAM_DOCX_DIR?.trim();
  if (fromEnv) dirs.push(path.resolve(fromEnv));
  dirs.push(path.join(process.cwd(), "data", "ayugram-docx"));
  dirs.push(path.join(process.cwd(), "data", "ayugram-raw"));
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    dirs.push(path.join(home, "Downloads", "AyuGram Desktop"));
  }
  return dirs;
}

function textDir() {
  const fromEnv = process.env.AYUGRAM_TEXT_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "ayugram-raw");
}

function resolveFile(name: string, exts: string[]): string {
  for (const dir of docxDirs()) {
    for (const ext of exts) {
      const p = path.join(dir, name.replace(/\.(docx|txt)$/i, "") + ext);
      if (fs.existsSync(p)) return p;
    }
    const direct = path.join(dir, name);
    if (fs.existsSync(direct)) return direct;
  }
  throw new Error(
    `${name} topilmadi. Qidirilgan: ${docxDirs().join("; ")} — AYUGRAM_DOCX_DIR o‘rnating.`,
  );
}

async function readQuestionsFromDocx(): Promise<string> {
  const p = resolveFile(QUESTIONS_DOCX, [".docx"]);
  console.log("Savollar DOCX:", p);
  const buf = fs.readFileSync(p);
  return docxBufferToMcqPlainText(buf);
}

async function readAnswerLettersAsync(): Promise<string[]> {
  const txtPath = path.join(textDir(), ANSWERS_TXT);
  if (fs.existsSync(txtPath)) {
    console.log("Javoblar TXT:", txtPath);
    return parseCompactLetterAnswerKey(fs.readFileSync(txtPath, "utf8"));
  }
  try {
    const p = resolveFile(ANSWERS_DOCX, [".docx"]);
    console.log("Javoblar DOCX:", p);
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ path: p });
    return parseCompactLetterAnswerKey(value);
  } catch (e) {
    throw new Error(
      `Javoblar topilmadi (${ANSWERS_TXT} yoki ${ANSWERS_DOCX}). ${e instanceof Error ? e.message : e}`,
    );
  }
}

async function resolveMatematikaSubject(gradeNumber: number) {
  const subject = await prisma.subject.findFirst({
    where: { title: "Matematika", grade: { number: gradeNumber } },
    select: { id: true, gradeId: true },
  });
  if (!subject) {
    throw new Error(`“Matematika” fani ${gradeNumber}-sinf uchun topilmadi. Avval asosiy seed ishga tushiring.`);
  }
  const topic = await prisma.topic.findFirst({
    where: { subjectId: subject.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return { subjectId: subject.id, gradeId: subject.gradeId, topicId: topic?.id ?? null };
}

async function main() {
  const raw = await readQuestionsFromDocx();
  const questions = parseNumberedUzMcqDocument(raw);
  const letters = await readAnswerLettersAsync();

  if (questions.length !== 30) {
    throw new Error(`Savollar: ${questions.length} ta (30 bo‘lishi kerak).`);
  }
  if (letters.length !== 30) {
    throw new Error(`Javoblar: ${letters.length} ta (30 bo‘lishi kerak).`);
  }

  const emptyOpts = questions.filter((q) =>
    q.options.some((o) => /^\([A-D]\)$/.test(o)),
  );
  if (emptyOpts.length) {
    console.warn(
      "Ogohlantirish: bo‘sh variant(lar) qolgan savollar:",
      emptyOpts.map((_, i) => i + 1).join(", "),
    );
  }

  const indices = lettersToIndices(letters);
  const payload = questions.map((q, i) => ({
    text: q.text,
    options: q.options,
    correctIndex: indices[i]!,
  }));

  const deleted = await prisma.test.deleteMany({
    where: { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
  });
  console.log("O‘chirilgan oldingi nusxa:", deleted.count);

  const { subjectId, gradeId, topicId } = await resolveMatematikaSubject(GRADE_NUMBER);

  await prisma.test.create({
    data: {
      subjectId,
      gradeId,
      topicId,
      title: "Matematika — Iqtidor maktabi (5-sinf)",
      difficulty: "MEDIUM",
      isDraft: false,
      isActive: true,
      status: "PUBLISHED",
      authorUserId: null,
      sourceType: "IMPORT_DOCX",
      importMetadataJson: JSON.stringify({
        [PACK_KEY]: true,
        gradeNumber: GRADE_NUMBER,
        sourceQuestions: QUESTIONS_DOCX,
        sourceAnswers: ANSWERS_TXT,
        mathExtraction: "docx-omml-to-latex",
      }),
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: {
        create: payload.map((q, order) => ({
          text: q.text,
          optionsJson: JSON.stringify([...q.options]),
          correctIndex: Math.min(3, Math.max(0, q.correctIndex)),
          order,
          points: 1,
        })),
      },
    },
  });

  console.log("Yaratildi: Matematika — Iqtidor maktabi (5-sinf),", payload.length, "savol");
  console.log("Namuna 1-savol:", payload[0]!.text.slice(0, 120));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
