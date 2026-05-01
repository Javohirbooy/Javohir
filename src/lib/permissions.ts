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

  const [permCount, rows] = await Promise.all([
    prisma.permission.count(),
    prisma.rolePermission.findMany({
      where: { role: rr },
      select: { permission: { select: { key: true } } },
    }),
  ]);

  if (permCount === 0) {
    return staticPermissionKeysForRole(rr);
  }

  const keys = rows.map((r) => r.permission.key).filter(isPermissionKey);
  if (rr === "SUPER_ADMIN") {
    const merged = new Set(keys);
    for (const k of SUPER_ADMIN_INVARIANT_KEYS) merged.add(k);
    return [...merged].filter(isPermissionKey).sort((a, b) => PERMISSION_KEYS.indexOf(a) - PERMISSION_KEYS.indexOf(b));
  }
  return keys;
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
