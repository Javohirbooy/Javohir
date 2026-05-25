/**
 * AyuGram DOCX dan eksport qilingan matnlar asosida ingliz tili testlarini yaratadi.
 *
 * Talab: DB allaqachon `prisma/seed.ts` (yoki boshqa yo‘l bilan) sinflar + fanlar bilan to‘ldirilgan bo‘lsin.
 * Matn fayllari: `data/ayugram-raw/*.txt` (mammoth bilan DOCX dan chiqarilgan nusxa).
 *
 * Boshqa papka: `AYUGRAM_TEXT_DIR=C:\\path\\to\\folder` (ichida xuddi shu .txt nomlari).
 *
 * Ishlash:
 *   npx tsx scripts/seed-ayugram-tests.ts
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
import { englishImtihonPointsForOrder } from "../src/lib/mcq/english-imtihon-points";

const prisma = new PrismaClient();

const PACK_KEY = "ayugramEnglishPack";

function textDir() {
  const fromEnv = process.env.AYUGRAM_TEXT_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "ayugram-raw");
}

function readTxt(name: string) {
  const p = path.join(textDir(), name);
  if (!fs.existsSync(p)) {
    throw new Error(`Fayl topilmadi: ${p}`);
  }
  return fs.readFileSync(p, "utf8");
}

async function resolveEnglishSubject(gradeNumber: number) {
  const subject = await prisma.subject.findFirst({
    where: { title: "Ingliz tili", grade: { number: gradeNumber } },
    select: { id: true, gradeId: true },
  });
  if (!subject) {
    throw new Error(`“Ingliz tili” fani ${gradeNumber}-sinf uchun topilmadi. Avval asosiy seed ishga tushiring.`);
  }
  const topic = await prisma.topic.findFirst({
    where: { subjectId: subject.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return { subjectId: subject.id, gradeId: subject.gradeId, topicId: topic?.id ?? null };
}

async function createPublishedTest(args: {
  subjectId: string;
  gradeId: string | null;
  topicId: string | null;
  title: string;
  meta: Record<string, unknown>;
  questions: { text: string; options: [string, string, string, string]; correctIndex: number }[];
}) {
  await prisma.test.create({
    data: {
      subjectId: args.subjectId,
      gradeId: args.gradeId,
      topicId: args.topicId,
      title: args.title,
      difficulty: "MEDIUM",
      isDraft: false,
      isActive: true,
      status: "PUBLISHED",
      authorUserId: null,
      sourceType: "IMPORT_DOCX",
      importMetadataJson: JSON.stringify({ [PACK_KEY]: true, ...args.meta }),
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: {
        create: args.questions.map((q, order) => ({
          text: q.text,
          optionsJson: JSON.stringify([...q.options]),
          correctIndex: Math.min(3, Math.max(0, q.correctIndex)),
          order,
          points: englishImtihonPointsForOrder(order),
        })),
      },
    },
  });
}

async function main() {
  const dir = textDir();
  console.log("AyuGram matn papkasi:", dir);

  const deleted = await prisma.test.deleteMany({
    where: { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
  });
  console.log("O‘chirilgan oldingi paket testlari:", deleted.count);

  const answerRaw = readTxt("Answer.docx.txt");
  const answerByGrade = parseAnswerKeyByGrade(answerRaw);

  const imtihonByGrade = {
    4: "Test imtihon 4 1-2 variant.docx.txt",
    5: "Test imtihon 5 1-2 variant.docx.txt",
    6: "Test imtihon 6 1-2 variant.docx.txt",
  } as const;

  for (const g of [4, 5, 6] as const) {
    const raw = readTxt(imtihonByGrade[g]);
    const variants = splitImtihonVariants(raw);
    const keys =
      g === 4
        ? [AYU_DERIVED_KEYS.grade4.variant1, AYU_DERIVED_KEYS.grade4.variant2]
        : g === 5
          ? [AYU_DERIVED_KEYS.grade5.variant1, AYU_DERIVED_KEYS.grade5.variant2]
          : [AYU_DERIVED_KEYS.grade6.variant1, AYU_DERIVED_KEYS.grade6.variant2];

    const { subjectId, gradeId, topicId } = await resolveEnglishSubject(g);

    for (let vi = 0; vi < variants.length; vi++) {
      const v = variants[vi]!;
      const parsed = parseStemThenInlineOptions(v.bodyLines);
      const key = keys[vi];
      if (!key || parsed.length !== key.length) {
        throw new Error(`${g}-sinf variant ${vi + 1}: savollar ${parsed.length}, kalit ${key?.length ?? 0}`);
      }
      const questions = parsed.map((q, i) => ({
        text: q.text,
        options: q.options,
        correctIndex: key[i]!,
      }));
      await createPublishedTest({
        subjectId,
        gradeId,
        topicId,
        title: `Ingliz tili — imtihon (${g}-sinf, ${vi + 1}-variant)`,
        meta: { gradeNumber: g, kind: "imtihon", variant: vi + 1, answerKeyNote: "4-6-sinf: DOCXda kalit yo‘q; grammatika bo‘yicha tuzilgan indekslar." },
        questions,
      });
      console.log("Yaratildi:", g, v.label, questions.length, "savol");
    }
  }

  for (const g of [7, 8, 9] as const) {
    const letters = answerByGrade.get(g);
    if (!letters || letters.length !== 30) {
      throw new Error(`Javob kaliti ${g}-sinf: ${letters?.length ?? 0} ta (30 bo‘lishi kerak).`);
    }
    const indices = lettersToIndices(letters);
    const lines = stripUntilFirstNumberedQuestion(readTxt(`Grade ${g}.docx.txt`).split(/\n/));
    const parsed = parseStemThenInlineOptions(lines);
    if (parsed.length !== 30) {
      throw new Error(`Grade ${g}.docx: ${parsed.length} ta savol (30 kerak).`);
    }
    const { subjectId, gradeId, topicId } = await resolveEnglishSubject(g);
    const questions = parsed.map((q, i) => ({
      text: q.text,
      options: q.options,
      correctIndex: indices[i]!,
    }));
    await createPublishedTest({
      subjectId,
      gradeId,
      topicId,
      title: `Ingliz tili — yakuniy test (${g}-sinf)`,
      meta: { gradeNumber: g, kind: "yakuniy", sourceAnswers: "Answer.docx" },
      questions,
    });
    console.log("Yaratildi:", g, "yakuniy", questions.length, "savol");
  }

  console.log("Tayyor: 9 ta test (4–6: 2 variant, 7–9: 1 ta).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
