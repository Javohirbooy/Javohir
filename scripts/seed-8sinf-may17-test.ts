/**
 * 8-sinf matematika — 17-may (2 variant) DOCX dan.
 *
 *   npm run seed:8sinf-may17
 *
 * Savollar: `17-may 8-sinf (2).docx`
 * Javoblar: `17-may 8-sinf javoblar.docx` yoki `.txt` (ixtiyoriy; bo‘lmasa Answer.docx GRADE 8 emas!)
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
import { extractRedAnswerLettersFromDocumentXml } from "../src/lib/docx-red-answer-extract";
import {
  docxBufferToMcqPlainText,
  splitUzMathTestVariants,
} from "../src/lib/docx-buffer-to-mcq-text";

const prisma = new PrismaClient();

const PACK_KEY = "may17Math8Sinf";
const GRADE_NUMBER = 8;
const QUESTIONS_DOCX = "17-may 8-sinf (2).docx";
const ANSWERS_CANDIDATES = [
  "8-sinf-may17-javoblar.txt",
  "17-may 8-sinf javoblar.docx",
  "17-may 8-sinf javoblar.docx.txt",
  "8-sinf 17-may javoblar.docx",
  "8-sinf javoblar.docx",
];

function docxDirs(): string[] {
  const dirs: string[] = [];
  const fromEnv = process.env.AYUGRAM_DOCX_DIR?.trim();
  if (fromEnv) dirs.push(path.resolve(fromEnv));
  dirs.push(path.join(process.cwd(), "data", "ayugram-docx"));
  dirs.push(path.join(process.cwd(), "data", "ayugram-raw"));
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) dirs.push(path.join(home, "Downloads", "AyuGram Desktop"));
  return dirs;
}

function resolveFile(name: string): string {
  for (const dir of docxDirs()) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`${name} topilmadi. Papkalar: ${docxDirs().join("; ")}`);
}

function tryResolveOptional(name: string): string | null {
  for (const dir of docxDirs()) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  const inData = path.join(process.cwd(), "data", "ayugram-raw", name);
  if (fs.existsSync(inData)) return inData;
  return null;
}

async function readAnswerKeys(): Promise<{ v1: string[]; v2: string[] } | null> {
  for (const name of ANSWERS_CANDIDATES) {
    const p = tryResolveOptional(name);
    if (!p) continue;
    console.log("Javoblar:", p);
    let raw: string;
    if (p.endsWith(".txt")) {
      raw = fs.readFileSync(p, "utf8");
    } else {
      const mammoth = await import("mammoth");
      raw = (await mammoth.extractRawText({ path: p })).value;
    }
    const parts = raw.split(/(?:^|\n)\s*2[\s-]*variant\s*/i);
    const v1Body = (parts[0] ?? raw).replace(/1[\s-]*variant\s*/i, "");
    const v1 = parseCompactLetterAnswerKey(v1Body);
    const v2 =
      parts.length > 1 ? parseCompactLetterAnswerKey(parts[1] ?? "") : [];
    if (v1.length === 30 && v2.length === 30) return { v1, v2 };
    if (v1.length === 60) {
      return { v1: v1.slice(0, 30), v2: v1.slice(30, 60) };
    }
    if (v1.length === 30 && v2.length === 0) return { v1, v2: [] };
  }
  return null;
}

async function loadDocumentXml(docxPath: string): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

function redAnswersByVariant(docXml: string): { v1: string[]; v2: string[] } {
  const idx = docXml.indexOf("2-variant");
  const v1Xml = idx >= 0 ? docXml.slice(0, idx) : docXml;
  const v2Xml = idx >= 0 ? docXml.slice(idx) : "";
  return {
    v1: extractRedAnswerLettersFromDocumentXml(v1Xml),
    v2: extractRedAnswerLettersFromDocumentXml(v2Xml),
  };
}

async function resolveMatematikaSubject(gradeNumber: number) {
  const subject = await prisma.subject.findFirst({
    where: { title: "Matematika", grade: { number: gradeNumber } },
    select: { id: true, gradeId: true },
  });
  if (!subject) {
    throw new Error(`“Matematika” fani ${gradeNumber}-sinf uchun topilmadi.`);
  }
  const topic = await prisma.topic.findFirst({
    where: { subjectId: subject.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return { subjectId: subject.id, gradeId: subject.gradeId, topicId: topic?.id ?? null };
}

async function createTest(args: {
  subjectId: string;
  gradeId: string | null;
  topicId: string | null;
  title: string;
  variant: number;
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
      importMetadataJson: JSON.stringify({
        [PACK_KEY]: true,
        gradeNumber: GRADE_NUMBER,
        variant: args.variant,
        sourceQuestions: QUESTIONS_DOCX,
        mathExtraction: "docx-omml-to-latex",
      }),
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: {
        create: args.questions.map((q, order) => ({
          text: q.text,
          optionsJson: JSON.stringify([...q.options]),
          correctIndex: Math.min(3, Math.max(0, q.correctIndex)),
          order,
          points: 1,
        })),
      },
    },
  });
}

async function main() {
  const qPath = resolveFile(QUESTIONS_DOCX);
  console.log("Savollar:", qPath);

  const raw = await docxBufferToMcqPlainText(fs.readFileSync(qPath));
  const outExtract = path.join(process.cwd(), "data", "ayugram-raw", "17-may-8-sinf-2.docx.extract.txt");
  fs.mkdirSync(path.dirname(outExtract), { recursive: true });
  fs.writeFileSync(outExtract, raw, "utf8");

  const variantBodies = splitUzMathTestVariants(raw);
  const parsedVariants = variantBodies.map((v) => ({
    label: v.label,
    questions: parseNumberedUzMcqDocument(v.body),
  }));

  console.log(
    "Variantlar:",
    parsedVariants.map((v) => `${v.label}: ${v.questions.length} savol`).join(", "),
  );

  for (const v of parsedVariants) {
    if (v.questions.length !== 30) {
      throw new Error(`${v.label}: ${v.questions.length} savol (30 kerak).`);
    }
  }

  if (parsedVariants.length !== 2) {
    throw new Error(`2 variant kerak, topildi: ${parsedVariants.length}`);
  }

  const docXml = await loadDocumentXml(qPath);
  const red = redAnswersByVariant(docXml);
  const keys = await readAnswerKeys();

  function mergeAnswerKey(
    variant: 1 | 2,
    redLetters: string[],
    fileLetters: string[] | undefined,
  ): { letters: string[]; source: string } {
    if (redLetters.length === 30) return { letters: redLetters, source: "DOCX qizil" };
    if (fileLetters?.length === 30) return { letters: fileLetters, source: "javoblar fayli" };
    if (redLetters.length === 29 && fileLetters && fileLetters.length >= 30) {
      const redStr = redLetters.join("");
      const prefix = fileLetters.slice(0, 29).join("");
      if (prefix === redStr) {
        return { letters: fileLetters.slice(0, 30), source: "DOCX qizil + javoblar (30-savol)" };
      }
      return {
        letters: [...redLetters, fileLetters[29]!],
        source: "DOCX qizil (29) + javoblar (30-savol)",
      };
    }
    if (redLetters.length === 29 && fileLetters?.length === 29) {
      console.warn(
        `${variant}-variant: DOCXda 29 ta qizil javob — 30-savol uchun javoblar faylida 30-chi harf kerak.`,
      );
    }
    return { letters: redLetters, source: "DOCX qizil" };
  }

  const v1Pick = mergeAnswerKey(1, red.v1, keys?.v1);
  const v2Pick = mergeAnswerKey(2, red.v2, keys?.v2);
  const v1Letters = v1Pick.letters;
  const v2Letters = v2Pick.letters;

  if (v1Letters.length === 30) console.log("1-variant javoblari:", v1Pick.source);
  if (v2Letters.length === 30) console.log("2-variant javoblari:", v2Pick.source);
  if (v1Letters.length !== 30) {
    throw new Error(
      `1-variant javob kaliti: ${v1Letters.length}/30. \`17-may 8-sinf javoblar.docx\` qo‘shing (60 ta A–D, 2-variant bo‘limi).`,
    );
  }
  if (v2Letters.length !== 30) {
    throw new Error(
      `2-variant javob kaliti: ${v2Letters.length}/30. Javoblar faylini qo‘shing yoki DOCXda qizil belgilash kerak.`,
    );
  }

  const v1Indices = lettersToIndices(v1Letters);
  const v2Indices = lettersToIndices(v2Letters);

  const deleted = await prisma.test.deleteMany({
    where: { importMetadataJson: { contains: `"${PACK_KEY}":true` } },
  });
  console.log("O‘chirilgan oldingi:", deleted.count);

  const { subjectId, gradeId, topicId } = await resolveMatematikaSubject(GRADE_NUMBER);

  for (let vi = 0; vi < 2; vi++) {
    const v = parsedVariants[vi]!;
    const indices = vi === 0 ? v1Indices! : v2Indices!;
    const payload = v.questions.map((q, i) => ({
      text: q.text,
      options: q.options,
      correctIndex: indices[i]!,
    }));
    await createTest({
      subjectId,
      gradeId,
      topicId,
      title: `Matematika — 17-may imtihon (8-sinf, ${vi + 1}-variant)`,
      variant: vi + 1,
      questions: payload,
    });
    console.log(`Yaratildi: ${vi + 1}-variant,`, payload[0]!.text.slice(0, 80));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
