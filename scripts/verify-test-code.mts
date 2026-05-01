/**
 * `npx tsx scripts/verify-test-code.mts`
 * src/lib import qilmaydi (.mts / tsx nomlangan eksport muammosi).
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

function normalizeTestCode(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseTestGrantCookie(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const a = JSON.parse(t) as unknown;
      if (Array.isArray(a)) {
        return [...new Set(a.filter((x): x is string => typeof x === "string" && x.length > 0))];
      }
    } catch {
      return [];
    }
    return [];
  }
  return [t];
}

function serializeTestGrantCookie(ids: string[]): string {
  const u = [...new Set(ids.filter(Boolean))].slice(0, 12);
  if (u.length === 0) return "";
  if (u.length === 1) return u[0]!;
  return JSON.stringify(u);
}

const prisma = new PrismaClient();

function assert(name: string, ok: boolean) {
  console.log(ok ? `  OK  ${name}` : `  FAIL ${name}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  console.log("--- normalizeTestCode (lib bilan bir xil mantiq) ---");
  assert("upper + trim + spaces", normalizeTestCode("  abc 12  ") === "ABC12");
  assert("zero-width removed", normalizeTestCode("A\u200bB") === "AB");
  assert("NFKC compat", normalizeTestCode("ＡＢＣ") === "ABC");

  console.log("--- grant cookie ---");
  const id = "cm_testid_sample";
  assert("single id roundtrip", parseTestGrantCookie(serializeTestGrantCookie([id])).join() === id);
  assert("multi json", parseTestGrantCookie(serializeTestGrantCookie([id, "cm2"])).length === 2);

  console.log("--- Prisma: faol test kodi ---");
  const tc = await prisma.testCode.findFirst({
    where: { isActive: true },
    include: { test: { select: { id: true, title: true, isDraft: true, isActive: true, status: true } } },
  });

  if (!tc) {
    console.log("  (bazada faol TestCode yo‘q — qolgan tekshiruvlar o‘tkazilmadi)");
    await prisma.$disconnect();
    return;
  }

  const raw = ` ${tc.code.toLowerCase()} `;
  const norm = normalizeTestCode(raw);
  const found = await prisma.testCode.findUnique({
    where: { code: norm },
    select: { id: true, code: true, scopeType: true, isActive: true },
  });
  assert(`findUnique(code="${norm.slice(0, 12)}…")`, !!found && found.id === tc.id);

  const student = await prisma.user.findFirst({
    where: { role: "STUDENT", status: "ACTIVE" },
    select: { id: true, gradeId: true },
  });

  console.log("  namuna: kod", tc.code, "| scope", tc.scopeType, "| test", tc.test.title.slice(0, 40));
  console.log("  namuna o‘quvchi:", student?.id?.slice(0, 12) ?? "yo‘q", "| gradeId", student?.gradeId ?? "null");

  const testOk =
    tc.test && !tc.test.isDraft && tc.test.isActive && tc.test.status !== "ARCHIVED";
  assert("asosiy test ochilishga yaroqli", testOk);

  await prisma.$disconnect();
  console.log("--- tugadi (exitCode=" + (process.exitCode ?? 0) + ") ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
