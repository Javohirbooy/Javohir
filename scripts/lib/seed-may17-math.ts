/**
 * 17-may matematika testlari — DOCX (OMML) import + seed.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  lettersToIndices,
  parseCompactLetterAnswerKey,
  parseNumberedUzMcqDocument,
} from "../../src/lib/ayugram-mcq-parse";
import { extractRedAnswerLettersFromDocumentXml } from "../../src/lib/docx-red-answer-extract";
import {
  docxBufferToMcqPlainText,
  splitUzMathTestVariants,
} from "../../src/lib/docx-buffer-to-mcq-text";

export type May17MathSeedConfig = {
  packKey: string;
  gradeNumber: number;
  questionsDocx: string;
  extractBasename: string;
  answersCandidates: string[];
  /** Faylda nechta variant kutiladi (9-sinfda ko‘pincha 1). */
  expectedVariants: number;
};

export function docxDirs(): string[] {
  const dirs: string[] = [];
  const fromEnv = process.env.AYUGRAM_DOCX_DIR?.trim();
  if (fromEnv) dirs.push(path.resolve(fromEnv));
  dirs.push(path.join(process.cwd(), "data", "ayugram-docx"));
  dirs.push(path.join(process.cwd(), "data", "ayugram-raw"));
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) dirs.push(path.join(home, "Downloads", "AyuGram Desktop"));
  return dirs;
}

export function resolveFile(name: string): string {
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

async function readAnswerKeys(
  candidates: string[],
): Promise<{ v1: string[]; v2: string[] } | null> {
  for (const name of candidates) {
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

export function redAnswersByVariant(
  docXml: string,
  gradeNumber: number,
): { v1: string[]; v2: string[] } {
  let idx = docXml.indexOf("2-variant");
  if (idx < 0) {
    const marker = `${gradeNumber}-sinf`;
    const first = docXml.indexOf(marker);
    const second = first >= 0 ? docXml.indexOf(marker, first + marker.length) : -1;
    if (second >= 0) idx = second;
  }
  const v1Xml = idx >= 0 ? docXml.slice(0, idx) : docXml;
  const v2Xml = idx >= 0 ? docXml.slice(idx) : "";
  return {
    v1: extractRedAnswerLettersFromDocumentXml(v1Xml),
    v2: extractRedAnswerLettersFromDocumentXml(v2Xml),
  };
}

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

async function resolveMatematikaSubject(prisma: PrismaClient, gradeNumber: number) {
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

export async function runMay17MathSeed(
  prisma: PrismaClient,
  config: May17MathSeedConfig,
): Promise<void> {
  const qPath = resolveFile(config.questionsDocx);
  console.log("Savollar:", qPath);

  const raw = await docxBufferToMcqPlainText(fs.readFileSync(qPath));
  const outExtract = path.join(
    process.cwd(),
    "data",
    "ayugram-raw",
    `${config.extractBasename}.extract.txt`,
  );
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

  if (parsedVariants.length !== config.expectedVariants) {
    throw new Error(
      `${config.expectedVariants} variant kerak, topildi: ${parsedVariants.length}`,
    );
  }

  for (const v of parsedVariants) {
    if (v.questions.length !== 30) {
      throw new Error(`${v.label}: ${v.questions.length} savol (30 kerak).`);
    }
  }

  const docXml = await loadDocumentXml(qPath);
  const red = redAnswersByVariant(docXml, config.gradeNumber);
  const keys = await readAnswerKeys(config.answersCandidates);

  const answerPicks: { letters: string[]; source: string }[] = [];
  if (config.expectedVariants >= 1) {
    answerPicks.push(mergeAnswerKey(1, red.v1, keys?.v1));
  }
  if (config.expectedVariants >= 2) {
    answerPicks.push(mergeAnswerKey(2, red.v2, keys?.v2));
  }

  for (let i = 0; i < config.expectedVariants; i++) {
    const pick = answerPicks[i]!;
    if (pick.letters.length === 30) {
      console.log(`${i + 1}-variant javoblari:`, pick.source);
    }
    if (pick.letters.length !== 30) {
      throw new Error(
        `${i + 1}-variant javob kaliti: ${pick.letters.length}/30. Javoblar faylini qo‘shing.`,
      );
    }
  }

  const indicesList = answerPicks.map((p) => lettersToIndices(p.letters));

  const deleted = await prisma.test.deleteMany({
    where: { importMetadataJson: { contains: `"${config.packKey}":true` } },
  });
  console.log("O‘chirilgan oldingi:", deleted.count);

  const { subjectId, gradeId, topicId } = await resolveMatematikaSubject(
    prisma,
    config.gradeNumber,
  );

  for (let vi = 0; vi < config.expectedVariants; vi++) {
    const v = parsedVariants[vi]!;
    const indices = indicesList[vi]!;
    const payload = v.questions.map((q, i) => ({
      text: q.text,
      options: q.options,
      correctIndex: indices[i]!,
    }));
    const title =
      config.expectedVariants === 1
        ? `Matematika — 17-may imtihon (${config.gradeNumber}-sinf)`
        : `Matematika — 17-may imtihon (${config.gradeNumber}-sinf, ${vi + 1}-variant)`;

    await prisma.test.create({
      data: {
        subjectId,
        gradeId,
        topicId,
        title,
        difficulty: "MEDIUM",
        isDraft: false,
        isActive: true,
        status: "PUBLISHED",
        authorUserId: null,
        sourceType: "IMPORT_DOCX",
        importMetadataJson: JSON.stringify({
          [config.packKey]: true,
          gradeNumber: config.gradeNumber,
          variant: vi + 1,
          sourceQuestions: config.questionsDocx,
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
    console.log(`Yaratildi: ${title},`, payload[0]!.text.slice(0, 80));
  }
}
