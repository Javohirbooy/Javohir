"use server";

/**
 * Legacy hook — real student flow uses `beginTestAttempt` + `submitExamAttempt` in `exam-session.ts`
 * (attempt limits, shuffle mapping, timer, violations).
 */
// Signature saqlanadi (eski importlar uchun).
export async function submitTestAnswers(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy stub
  _testId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _answers: number[],
) {
  return {
    ok: false as const,
    error: "Bu yo‘l o‘chirilgan. Test sahifasini yangilang — sessiya avtomatik boshlanadi.",
  };
}
