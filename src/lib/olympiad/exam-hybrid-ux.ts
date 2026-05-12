/**
 * Hybrid exam UX: Duolingo-style calm + Codeforces-style structure.
 * Client-only heuristics — scoring, timer, submit remain server-authoritative.
 *
 * Flow (conceptual): User → AdaptiveUXLayer → ExamEngine → …
 * This module is the AdaptiveUXLayer slice (UI adaptation only, no cheating).
 */

export type ExamStressInput = {
  /** Savollar orasida tez-tez o‘tishlar soni (so‘nggi ~25s) */
  stepJumpsLast25s: number;
  /** Joriy savolda variantni qayta-qayta almashtirish (so‘nggi ~20s) */
  optionFlipsOnCurrentStep20s: number;
  timerSec: number;
};

/** 0–100: faqat UI moslashuvi uchun (serverga yuborilmaydi). */
export function computeExamStressScore(s: ExamStressInput): number {
  let x = 0;
  if (s.stepJumpsLast25s >= 8) x += 45;
  else if (s.stepJumpsLast25s >= 5) x += 28;
  else if (s.stepJumpsLast25s >= 3) x += 14;

  if (s.optionFlipsOnCurrentStep20s >= 6) x += 38;
  else if (s.optionFlipsOnCurrentStep20s >= 4) x += 24;
  else if (s.optionFlipsOnCurrentStep20s >= 2) x += 10;

  if (s.timerSec > 0 && s.timerSec <= 120) x += 28;
  else if (s.timerSec > 0 && s.timerSec <= 300) x += 14;

  return Math.min(100, Math.round(x));
}

export function shouldAutoFocusMode(stress: number): boolean {
  return stress >= 68;
}

const MILESTONE_KEYS = [0.25, 0.5, 0.75] as const;

/** Eng yuqori, hali ko‘rsatilmagan marra (bir vaqtning o‘zida bittasi). */
export function latestUnseenMilestone(
  answeredRatio: number,
  shown: Set<string>,
): (typeof MILESTONE_KEYS)[number] | null {
  for (let i = MILESTONE_KEYS.length - 1; i >= 0; i--) {
    const k = MILESTONE_KEYS[i]!;
    if (answeredRatio >= k - 0.001 && !shown.has(String(k))) return k;
  }
  return null;
}

export function milestoneEncouragementUz(key: (typeof MILESTONE_KEYS)[number]): string {
  switch (key) {
    case 0.25:
      return "Zo‘r! Birinchi chorakni bosib o‘tdingiz — shunday davom eting.";
    case 0.5:
      return "Yarmini tugatdingiz! Bir dam nafas oling va yana yo‘lga chiqing.";
    case 0.75:
      return "Oxiriga yaqinlashyapsiz — barqarorlik muhim.";
    default:
      return "";
  }
}

/** Qisqa “momentum” / streak hissi (XP bar uchun foiz). */
export function answeredMomentumPercent(answers: number[]): number {
  if (!answers.length) return 0;
  const n = answers.filter((a) => a >= 0).length;
  return Math.round((n / answers.length) * 100);
}

/** Juda past ovozli “soft” tasdiq (faqat foydalanuvchi yoqganida). */
export function playSoftSaveChime(): void {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem("olympiad_exam_sound") !== "1") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.06);
    void ctx.close();
  } catch {
    /* brauzer ovozni bloklashi mumkin */
  }
}
