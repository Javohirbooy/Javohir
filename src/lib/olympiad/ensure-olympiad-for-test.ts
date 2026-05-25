import { randomBytes } from "crypto";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

function slugBase(title: string) {
  const t = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return t || "olympiad";
}

async function allocateSlug(title: string) {
  const base = slugBase(title);
  for (let i = 0; i < 10; i++) {
    const slug = i === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const ex = await prisma.olympiad.findUnique({ where: { slug }, select: { id: true } });
    if (!ex) return slug;
  }
  throw new Error("slug");
}

/** Test uchun nashr qilingan olimpiada (DRAFT emas); yo‘q bo‘lsa yaratadi. */
export async function ensureOlympiadForTest(args: {
  testId: string;
  createdByUserId: string;
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes?: number;
  title?: string;
}): Promise<string> {
  const existing = await prisma.olympiad.findFirst({
    where: { testId: args.testId, status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const test = await prisma.test.findUnique({
    where: { id: args.testId },
    select: { title: true, shuffleQuestions: true, shuffleOptions: true },
  });
  if (!test) throw new Error("TEST_NOT_FOUND");

  const title = args.title?.trim() || test.title;
  const slug = await allocateSlug(title);
  const row = await prisma.olympiad.create({
    data: {
      title,
      slug,
      testId: args.testId,
      createdByUserId: args.createdByUserId,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      durationMinutes: args.durationMinutes ?? 60,
      status: "SCHEDULED",
      antiCheatStrictness: "STANDARD",
      resultVisibility: "DELAYED",
      shuffleQuestions: test.shuffleQuestions,
      shuffleOptions: test.shuffleOptions,
    },
    select: { id: true },
  });
  return row.id;
}

export async function assertTestAssignableForOlympiad(session: Session, testId: string) {
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    const t = await prisma.test.findFirst({
      where: { id: testId, status: "PUBLISHED", isDraft: false, isActive: true },
      select: { id: true },
    });
    if (!t) throw new Error("TEST");
    return;
  }
  if (session.user.role === "TEACHER") {
    const t = await prisma.test.findFirst({
      where: {
        id: testId,
        status: "PUBLISHED",
        isDraft: false,
        isActive: true,
        OR: [{ authorUserId: session.user.id }, { authorUserId: null }],
      },
      select: { id: true },
    });
    if (!t) throw new Error("TEST");
    return;
  }
  throw new Error("FORBIDDEN");
}
