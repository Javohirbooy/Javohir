/**
 * MCQ savol og‘irligi: null, 0 yoki manfiy bo‘lsa ham minimal 1 ball (olimpiada va monitoring testlari bilan bir xil).
 */
export function normalizeMcqQuestionWeight(raw: number | null | undefined): number {
  return raw != null && raw > 0 ? raw : 1;
}
