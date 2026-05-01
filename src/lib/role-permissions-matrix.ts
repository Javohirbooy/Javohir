import type { AppRole } from "@/lib/permissions";
import {
  PERMISSION_KEYS,
  SUPER_ADMIN_INVARIANT_KEYS,
  type PermissionKey,
  isPermissionKey,
} from "@/lib/permission-keys";

export const MATRIX_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] as const;

/** SUPER_ADMIN must always keep these — enforced server-side to avoid lockout. */
export type RolePermissionMatrix = Record<AppRole, PermissionKey[]>;

function emptyMatrix(): RolePermissionMatrix {
  return {
    SUPER_ADMIN: [],
    ADMIN: [],
    TEACHER: [],
    STUDENT: [],
  };
}

export function parseMatrixInput(raw: unknown): { ok: true; matrix: RolePermissionMatrix } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Noto‘g‘ri ma’lumot shakli." };
  }
  const obj = raw as Record<string, unknown>;
  const matrix = emptyMatrix();

  for (const role of MATRIX_ROLES) {
    const v = obj[role];
    if (!Array.isArray(v)) {
      return { ok: false, error: `Rol "${role}" uchun massiv kutilmoqda.` };
    }
    const keys: PermissionKey[] = [];
    for (const item of v) {
      if (typeof item !== "string" || !isPermissionKey(item)) {
        return { ok: false, error: `Noto‘g‘ri ruxsat kaliti: ${String(item)}` };
      }
      if (!keys.includes(item)) keys.push(item);
    }
    matrix[role] = keys;
  }

  for (const k of Object.keys(obj)) {
    if (!MATRIX_ROLES.includes(k as AppRole)) {
      return { ok: false, error: `Noma’lum rol: ${k}` };
    }
  }

  const superSet = new Set(matrix.SUPER_ADMIN);
  for (const inv of SUPER_ADMIN_INVARIANT_KEYS) {
    if (!superSet.has(inv)) {
      return {
        ok: false,
        error: `SUPER_ADMIN uchun quyidagilar majburiy: ${SUPER_ADMIN_INVARIANT_KEYS.join(", ")}`,
      };
    }
  }

  return { ok: true, matrix };
}

export function matrixToSerializable(m: RolePermissionMatrix): Record<AppRole, string[]> {
  return {
    SUPER_ADMIN: [...m.SUPER_ADMIN],
    ADMIN: [...m.ADMIN],
    TEACHER: [...m.TEACHER],
    STUDENT: [...m.STUDENT],
  };
}

/** Keys present for a role in DB (subset of catalog). */
export function buildMatrixFromDbRows(
  rows: { role: string; permission: { key: string } }[],
): RolePermissionMatrix {
  const m = emptyMatrix();
  const allowed = new Set<string>(PERMISSION_KEYS);
  for (const r of rows) {
    const role = r.role as AppRole;
    if (!MATRIX_ROLES.includes(role)) continue;
    const k = r.permission.key;
    if (allowed.has(k) && isPermissionKey(k)) {
      m[role].push(k);
    }
  }
  for (const role of MATRIX_ROLES) {
    m[role].sort((a, b) => PERMISSION_KEYS.indexOf(a) - PERMISSION_KEYS.indexOf(b));
  }
  return m;
}
