import { prisma } from "@/lib/prisma";

export type OlympiadExamWindow = {
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes: number;
};

/**
 * Ko‘p fanli paketdagi fan: imtihon vaqti paket jadvalidan (alohida olimpiada oynasi emas).
 */
export async function resolveOlympiadExamWindow(args: {
  bundleAttemptId: string | null;
  olympiadId: string;
  olympiadStartsAt: Date;
  olympiadEndsAt: Date | null;
  olympiadDurationMinutes: number;
}): Promise<OlympiadExamWindow> {
  if (!args.bundleAttemptId) {
    return {
      startsAt: args.olympiadStartsAt,
      endsAt: args.olympiadEndsAt,
      durationMinutes: args.olympiadDurationMinutes,
    };
  }

  const attempt = await prisma.olympiadBundleAttempt.findUnique({
    where: { id: args.bundleAttemptId },
    select: {
      bundleId: true,
      bundle: { select: { startsAt: true, endsAt: true } },
    },
  });
  if (!attempt) {
    return {
      startsAt: args.olympiadStartsAt,
      endsAt: args.olympiadEndsAt,
      durationMinutes: args.olympiadDurationMinutes,
    };
  }

  const subject = await prisma.olympiadBundleSubject.findFirst({
    where: { bundleId: attempt.bundleId, olympiadId: args.olympiadId },
    select: { durationOverrideMinutes: true },
  });

  return {
    startsAt: attempt.bundle.startsAt,
    endsAt: attempt.bundle.endsAt,
    durationMinutes: subject?.durationOverrideMinutes ?? args.olympiadDurationMinutes,
  };
}
