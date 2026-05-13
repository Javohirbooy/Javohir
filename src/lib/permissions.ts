import type { Session } from "next-auth";
import type { AppRole } from "@/lib/app-role";
import { prisma } from "@/lib/prisma";
import {
  PERMISSION_KEYS,
  SUPER_ADMIN_INVARIANT_KEYS,
  type PermissionKey,
  isPermissionKey,
} from "@/lib/permission-keys";
import { staticPermissionKeysForRole } from "@/lib/static-role-permissions";

export type { AppRole } from "@/lib/app-role";

export function roleFromString(r: string | undefined): AppRole | null {
  if (r === "SUPER_ADMIN" || r === "ADMIN" || r === "TEACHER" || r === "STUDENT") return r;
  return null;
}

/**
 * Resolves permission keys for a role: DB RolePermission if seeded, else static fallback
 * when the permission catalog has not been created yet.
 */
export async function resolvePermissionKeysForRole(role: string): Promise<string[]> {
  const rr = roleFromString(role);
  if (!rr) return [];

  const staticKeys = staticPermissionKeysForRole(rr);

  const [permCount, rows] = await Promise.all([
    prisma.permission.count(),
    prisma.rolePermission.findMany({
      where: { role: rr },
      select: { permission: { select: { key: true } } },
    }),
  ]);

  if (permCount === 0) {
    return staticKeys;
  }

  const dbKeys = rows.map((r) => r.permission.key).filter(isPermissionKey);

  /** Grant yo‘q — to‘liq statik rol. */
  if (dbKeys.length === 0) {
    return staticKeys;
  }

  /** DB + statik birlashmasi — qisman seed yangi modul kalitlarini (masalan OLYMPIAD_MANAGE) “olib tashlamasligi” uchun. */
  const merged = new Set<string>([...staticKeys, ...dbKeys]);

  if (rr === "SUPER_ADMIN") {
    for (const k of SUPER_ADMIN_INVARIANT_KEYS) merged.add(k);
  }

  return [...merged].filter(isPermissionKey).sort((a, b) => PERMISSION_KEYS.indexOf(a) - PERMISSION_KEYS.indexOf(b));
}

export function canAccessAdminPanel(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAccessSuperAdminPanel(role: string | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function sessionHasPermission(session: Session | null | undefined, key: PermissionKey): boolean {
  const keys = session?.user?.permissionKeys;
  if (!keys?.length) return false;
  return keys.includes(key);
}

/**
 * Olimpiada boshqaruvi: platforma ADMIN/SUPER_ADMIN har doim (JWT kalitlari qisman bo‘lsa ham).
 * O‘qituvchi — faqat `OLYMPIAD_MANAGE` bilan.
 */
export function canOlympiadManage(session: Session | null | undefined): boolean {
  const role = session?.user?.role;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  return sessionHasPermission(session, "OLYMPIAD_MANAGE");
}
