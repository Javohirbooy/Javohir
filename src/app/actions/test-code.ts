"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  TEST_GRANT_COOKIE,
  TEST_GRANT_MAX_TESTS,
  serializeTestGrantCookie,
  type TestCodeFormState,
} from "@/lib/test-access";
import { sessionHasPermission } from "@/lib/permissions";
import { normalizeTestCode } from "@/lib/test-code-normalize";

function parseGrantedJson(raw: string): string[] {
  try {
    const a = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(a)) return [];
    return a.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

export async function submitTestCode(_prev: TestCodeFormState, formData: FormData): Promise<TestCodeFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Avval tizimga kiring." };
  if (session.user.role !== "STUDENT") {
    return { error: "Test kodi oqituvchi beradigan o‘quvchilar uchun." };
  }
  if (!sessionHasPermission(session, "TESTS_ATTEMPT")) {
    return { error: "Sizda test topshirish huquqi yo‘q." };
  }

  const code = normalizeTestCode(String(formData.get("code") ?? ""));
  const nextRaw = String(formData.get("next") ?? "").trim();

  if (!code) return { error: "Test kodini kiriting." };

  const tc = await prisma.testCode.findUnique({
    where: { code },
    include: { test: { include: { subject: true } } },
  });

  if (!tc || !tc.isActive) return { error: "Kod topilmadi yoki o‘chirilgan." };
  if (tc.expiresAt && tc.expiresAt < new Date()) return { error: "Kod muddati tugagan." };
  if (tc.maxUses != null && tc.usesCount >= tc.maxUses) return { error: "Kod uchun urinishlar soni tugagan." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { gradeId: true, id: true } });
  if (!user) return { error: "Foydalanuvchi topilmadi." };

  if (tc.scopeType === "GRADE") {
    if (!user.gradeId || user.gradeId !== tc.scopeGradeId) {
      return { error: "Bu kod sizning sinfingiz uchun emas." };
    }
  } else if (tc.scopeType === "USERS") {
    let ids: string[] = [];
    try {
      ids = JSON.parse(tc.scopeUserIdsJson) as string[];
    } catch {
      ids = [];
    }
    if (!ids.includes(session.user.id)) {
      return { error: "Bu kod siz uchun mo‘ljallanmagan." };
    }
  }
  /** ALL: kod o‘zi ruxsat; talaba sinfi bazada noto‘g‘ri bo‘lsa ham bloklamaslik. */

  const extraIds = parseGrantedJson(tc.grantedTestIdsJson);
  const allTestIds = [...new Set([tc.testId, ...extraIds])].slice(0, TEST_GRANT_MAX_TESTS);

  const bundleRows = await prisma.test.findMany({
    where: { id: { in: allTestIds } },
    include: { subject: true },
  });
  if (bundleRows.length !== allTestIds.length) {
    return { error: "Kod sozlamalari noto‘g‘ri: ba’zi testlar topilmadi." };
  }

  for (const t of bundleRows) {
    if (!t.isActive || t.isDraft || t.status === "ARCHIVED") {
      return { error: `“${t.title}” hozir ochilmagan. Administrator yoki o‘qituvchi bilan bog‘laning.` };
    }
    if (tc.scopeType === "GRADE") {
      if (t.subject.gradeId !== tc.scopeGradeId) {
        return { error: "Paketdagi testlar bu kod sinfiga mos emas." };
      }
    }
  }

  await prisma.testCode.update({
    where: { id: tc.id },
    data: { usesCount: { increment: 1 } },
  });

  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  jar.set(TEST_GRANT_COOKIE, serializeTestGrantCookie(allTestIds), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  if (nextRaw.startsWith("/testlar/")) {
    redirect(nextRaw);
  }
  if (allTestIds.length > 1) {
    redirect("/oquvchi/monitoring-testlar");
  }
  redirect(`/testlar/${tc.testId}`);
}
