"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { sessionHasPermission } from "@/lib/permissions";
import { teacherHasSubjectAccess } from "@/lib/teacher-scope";
import { parseMcqTextToDraftQuestions } from "@/lib/test-import-parser";
import { docxBufferToMarkdown } from "@/lib/docx-to-markdown";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type ImportTestResult = { ok: false; error: string } | { ok: true; testId: string };

export type ImportBatchResult =
  | { ok: false; error: string }
  | { ok: true; items: { testId: string; title: string; fileName: string }[] };

const MAX_BATCH_FILES = 3;

type ParseResult =
  | { ok: false; error: string }
  | {
      ok: true;
      text: string;
      parserSource: string;
      sourceType: "IMPORT_TXT" | "IMPORT_DOCX";
      name: string;
    };

async function parseImportFile(file: File): Promise<ParseResult> {
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  let parserSource = "";
  let sourceType: "IMPORT_TXT" | "IMPORT_DOCX" = "IMPORT_TXT";

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    text = buf.toString("utf8");
    parserSource = text;
    sourceType = "IMPORT_TXT";
  } else if (lower.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const raw = await mammoth.extractRawText({ buffer: buf });
      text = await docxBufferToMarkdown(buf);
      if (text.length > 1_200_000) {
        text = text.slice(0, 1_200_000);
      }
      parserSource = raw.value;
      sourceType = "IMPORT_DOCX";
    } catch {
      return { ok: false, error: "DOCX o‘qib bo‘lmadi." };
    }
  } else {
    return { ok: false, error: "Faqat .txt, .md yoki .docx qabul qilinadi." };
  }

  return { ok: true, text, parserSource, sourceType, name };
}

function authorIdForSession(session: Session): string | null | undefined {
  if (session.user.role === "TEACHER") return session.user.id;
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") return null;
  return undefined;
}

async function createDraftTestFromFile(args: {
  session: Session;
  subjectId: string;
  title: string;
  file: File;
}): Promise<{ ok: true; testId: string } | { ok: false; error: string }> {
  const { session, subjectId, title, file } = args;
  const parsedFile = await parseImportFile(file);
  if (!parsedFile.ok) return parsedFile;

  // DOCX: extractRawText bitta qatorga yig‘adi — +/− variantlar ajralmaydi; MCQ uchun HTML→Markdown kerak.
  const mcqSource =
    parsedFile.sourceType === "IMPORT_DOCX" ? parsedFile.text : (parsedFile.parserSource || parsedFile.text);
  const parsed = parseMcqTextToDraftQuestions(mcqSource);
  const authorUserId = authorIdForSession(session);
  if (authorUserId === undefined) return { ok: false, error: "Rol mos emas." };

  const subjectMeta = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { gradeId: true },
  });

  const test = await prisma.test.create({
    data: {
      subjectId,
      gradeId: subjectMeta?.gradeId ?? null,
      title,
      difficulty: "MEDIUM",
      isDraft: true,
      isActive: false,
      status: "DRAFT",
      authorUserId,
      sourceType: parsedFile.sourceType,
      importRawText: parsedFile.text.slice(0, 500000),
      importMetadataJson: JSON.stringify({
        fileName: parsedFile.name,
        importedAt: new Date().toISOString(),
      }),
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: {
        create: parsed.map((q, order) => {
          const opts = q.options.length ? q.options : ["A", "B", "C", "D"];
          const correctIndex = q.correctIndex ?? 0;
          return {
            text: q.text,
            optionsJson: JSON.stringify(opts),
            correctIndex: Math.min(Math.max(0, correctIndex), opts.length - 1),
            order,
          };
        }),
      },
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEST_IMPORT_DRAFT",
    entityType: "Test",
    entityId: test.id,
    metadata: { sourceType: parsedFile.sourceType, questionCount: parsed.length },
  });

  return { ok: true, testId: test.id };
}

async function gateImport(session: Session | null, subjectId: string): Promise<{ ok: false; error: string } | { ok: true }> {
  if (!session?.user?.id) return { ok: false, error: "Kirish kerak." };
  if (!sessionHasPermission(session, "TESTS_CREATE")) return { ok: false, error: "Ruxsat yo‘q." };
  if (!subjectId) return { ok: false, error: "Fan tanlang." };
  if (session.user.role === "TEACHER") {
    if (!(await teacherHasSubjectAccess(session.user.id, subjectId))) {
      return { ok: false, error: "Fan doirasidan tashqari." };
    }
  }
  return { ok: true };
}

/**
 * Creates a **draft** test from `.txt`, `.md`, or `.docx`.
 * DOCX: converts to Markdown via HTML (inline images as `data:` URIs where possible).
 */
export async function importTestDraftFromUpload(formData: FormData): Promise<ImportTestResult> {
  const session = await auth();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const g = await gateImport(session, subjectId);
  if (!g.ok) return g;
  if (!session?.user) return { ok: false, error: "Sessiya yo‘q." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fayl yuklanmadi." };
  }

  const title = String(formData.get("title") ?? "").trim() || "Import — qoralama";
  const r = await createDraftTestFromFile({ session, subjectId, title, file });
  if (!r.ok) return r;

  revalidatePath("/admin/testlar");
  revalidatePath("/oqituvchi/testlar");
  return { ok: true, testId: r.testId };
}

/**
 * Bir vaqtda 2–3 ta fayldan alohida qoralama testlar yaratadi.
 */
export async function importTestDraftsFromUpload(formData: FormData): Promise<ImportBatchResult> {
  const session = await auth();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const g = await gateImport(session, subjectId);
  if (!g.ok) return g;
  if (!session?.user) return { ok: false, error: "Sessiya yo‘q." };

  const fromMulti = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const one = formData.get("file");
  const files =
    fromMulti.length > 0
      ? fromMulti
      : one instanceof File && one.size > 0
        ? [one]
        : [];

  if (files.length === 0) return { ok: false, error: "Kamida bitta fayl yuklang." };
  if (files.length > MAX_BATCH_FILES) {
    return { ok: false, error: `Bir vaqtda ko‘pi bilan ${MAX_BATCH_FILES} ta fayl yuklang.` };
  }

  const titleBase = String(formData.get("title") ?? "").trim() || "Import — qoralama";
  const items: { testId: string; title: string; fileName: string }[] = [];
  const createdIds: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const stem = file.name.replace(/\.[^.]+$/i, "") || `fayl-${i + 1}`;
    const title = files.length === 1 ? titleBase : `${titleBase} — ${stem}`;
    const r = await createDraftTestFromFile({ session, subjectId, title, file });
    if (!r.ok) {
      if (createdIds.length) {
        await prisma.test.deleteMany({ where: { id: { in: createdIds } } });
      }
      return {
        ok: false,
        error: items.length ? `${r.error} (${file.name})` : r.error,
      };
    }
    createdIds.push(r.testId);
    items.push({ testId: r.testId, title, fileName: file.name });
  }

  revalidatePath("/admin/testlar");
  revalidatePath("/oqituvchi/testlar");
  return { ok: true, items };
}
