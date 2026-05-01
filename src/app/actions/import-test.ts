"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { teacherHasSubjectAccess } from "@/lib/teacher-scope";
import { parseMcqTextToDraftQuestions } from "@/lib/test-import-parser";
import { docxBufferToMarkdown } from "@/lib/docx-to-markdown";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type ImportTestResult = { ok: false; error: string } | { ok: true; testId: string };

/**
 * Creates a **draft** test from `.txt`, `.md`, or `.docx`.
 * DOCX: converts to Markdown via HTML (inline images as `data:` URIs where possible).
 */
export async function importTestDraftFromUpload(formData: FormData): Promise<ImportTestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish kerak." };
  if (!sessionHasPermission(session, "TESTS_CREATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const subjectId = String(formData.get("subjectId") ?? "").trim();
  if (!subjectId) return { ok: false, error: "Fan tanlang." };

  if (session.user.role === "TEACHER") {
    if (!(await teacherHasSubjectAccess(session.user.id, subjectId))) {
      return { ok: false, error: "Fan doirasidan tashqari." };
    }
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fayl yuklanmadi." };
  }

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

  const parsed = parseMcqTextToDraftQuestions(parserSource || text);
  const title = String(formData.get("title") ?? "").trim() || "Import — qoralama";

  const authorUserId =
    session.user.role === "TEACHER"
      ? session.user.id
      : session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN"
        ? null
        : undefined;
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
      sourceType,
      importRawText: text.slice(0, 500000),
      importMetadataJson: JSON.stringify({ fileName: name, importedAt: new Date().toISOString() }),
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
    metadata: { sourceType, questionCount: parsed.length },
  });

  revalidatePath("/admin/testlar");
  revalidatePath("/oqituvchi/testlar");

  return { ok: true, testId: test.id };
}
