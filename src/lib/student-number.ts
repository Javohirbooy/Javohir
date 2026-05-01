import { prisma } from "@/lib/prisma";

const STUDENT_NUMBER_START = 100_000;

/** Keyingi bo‘sh o‘quvchi raqami (global, ketma-ket). */
export async function allocateNextStudentNumber(): Promise<number> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const agg = await prisma.user.aggregate({
      where: { role: "STUDENT", studentNumber: { not: null } },
      _max: { studentNumber: true },
    });
    const next = (agg._max.studentNumber ?? STUDENT_NUMBER_START) + 1;
    const clash = await prisma.user.findFirst({
      where: { studentNumber: next },
      select: { id: true },
    });
    if (!clash) return next;
  }
  throw new Error("studentNumber allocation failed");
}
