import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { OLYMPIAD_BUNDLE_COOKIE, OLYMPIAD_SESSION_COOKIE } from "@/lib/olympiad/constants";
import { generateSessionToken, hashSessionToken } from "@/lib/olympiad/code-crypto";

export const olympiadSessionInclude = {
  olympiad: true,
  participant: true,
  attempt: true,
  bundleAttempt: { select: { id: true, bundleId: true } },
} as const;

export type OlympiadSessionWithRelations = NonNullable<
  Awaited<ReturnType<typeof loadSessionByCookie>>
>;

export async function setOlympiadSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(OLYMPIAD_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10,
  });
}

export async function loadSessionByCookie() {
  const jar = await cookies();
  const raw = jar.get(OLYMPIAD_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const h = hashSessionToken(raw);
  return prisma.olympiadSession.findFirst({
    where: { sessionTokenHash: h },
    include: olympiadSessionInclude,
  });
}

async function loadBundleAttemptIdByCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(OLYMPIAD_BUNDLE_COOKIE)?.value;
  if (!raw) return null;
  const h = hashSessionToken(raw);
  const row = await prisma.olympiadBundleAttempt.findFirst({
    where: { accessTokenHash: h },
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Paket imtihonida sessiya cookie yo‘qolsa, paket cookie orqali qayta bog‘lash. */
export async function loadSessionForParticipantAction(
  sessionId: string,
): Promise<OlympiadSessionWithRelations | null> {
  const fromCookie = await loadSessionByCookie();
  if (fromCookie?.id === sessionId) return fromCookie;

  const bundleAttemptId = await loadBundleAttemptIdByCookie();
  if (!bundleAttemptId) return null;

  const row = await prisma.olympiadSession.findFirst({
    where: { id: sessionId, bundleAttemptId },
    include: olympiadSessionInclude,
  });
  if (!row) return null;

  const jar = await cookies();
  const raw = jar.get(OLYMPIAD_SESSION_COOKIE)?.value;
  const cookieHash = raw ? hashSessionToken(raw) : null;
  if (!cookieHash || cookieHash !== row.sessionTokenHash) {
    const newToken = generateSessionToken();
    await prisma.olympiadSession.update({
      where: { id: row.id },
      data: { sessionTokenHash: hashSessionToken(newToken) },
    });
    await setOlympiadSessionCookie(newToken);
    return prisma.olympiadSession.findFirst({
      where: { id: sessionId },
      include: olympiadSessionInclude,
    });
  }

  return row;
}
