import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permission-keys";

export async function getOlympiadForManage(olympiadId: string) {
  return prisma.olympiad.findUnique({
    where: { id: olympiadId },
    select: {
      id: true,
      createdByUserId: true,
      responsibleUserId: true,
      status: true,
      title: true,
      slug: true,
    },
  });
}

/** Mutatsiya: admin/super yoki mas'ul/yaratgan o‘qituvchi. */
export async function assertOlympiadManage(session: Session | null, olympiadId: string): Promise<void> {
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const row = await getOlympiadForManage(olympiadId);
  if (!row) throw new Error("NOT_FOUND");
  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return;
  if (role === "TEACHER") {
    if (!sessionHasPermission(session, "OLYMPIAD_MANAGE" as PermissionKey)) throw new Error("FORBIDDEN");
    if (row.createdByUserId === session.user.id || row.responsibleUserId === session.user.id) return;
  }
  throw new Error("FORBIDDEN");
}

export function assertOlympiadMonitor(session: Session | null): void {
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return;
  const ok =
    sessionHasPermission(session, "OLYMPIAD_MONITOR" as PermissionKey) ||
    sessionHasPermission(session, "OLYMPIAD_MANAGE" as PermissionKey);
  if (!ok) throw new Error("FORBIDDEN");
}

/** Jonli monitoring: admin/super yoki mas’ul/yaratgan o‘qituvchi. */
export async function assertOlympiadMonitorAccess(session: Session | null, olympiadId: string): Promise<void> {
  assertOlympiadMonitor(session);
  const row = await getOlympiadForManage(olympiadId);
  if (!row) throw new Error("NOT_FOUND");
  const role = session!.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return;
  if (role === "TEACHER") {
    if (row.createdByUserId === session!.user.id || row.responsibleUserId === session!.user.id) return;
  }
  throw new Error("FORBIDDEN");
}
