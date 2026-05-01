import { prisma } from "@/lib/prisma";
import { PERMISSION_KEYS, SUPER_ADMIN_INVARIANT_KEYS, type PermissionKey, isPermissionKey } from "@/lib/permission-keys";
import { PERMISSION_DESCRIPTIONS_UZ } from "@/lib/permission-metadata";
import { buildMatrixFromDbRows, type RolePermissionMatrix } from "@/lib/role-permissions-matrix";

export type PermissionRowDto = { id: string; key: PermissionKey; description: string | null };

/**
 * Ensures every catalog key exists as a `Permission` row (for DBs migrated before new keys).
 */
export async function ensurePermissionCatalogRows(): Promise<void> {
  const existing = new Set((await prisma.permission.findMany({ select: { key: true } })).map((p) => p.key));
  const missing = PERMISSION_KEYS.filter((k) => !existing.has(k));
  for (const key of missing) {
    await prisma.permission.create({
      data: { key, description: PERMISSION_DESCRIPTIONS_UZ[key] },
    });
  }
}

export async function loadPermissionRowsOrdered(): Promise<PermissionRowDto[]> {
  await ensurePermissionCatalogRows();
  const rows = await prisma.permission.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, description: true },
  });
  const ordered = [...PERMISSION_KEYS];
  const list: PermissionRowDto[] = [];
  for (const k of ordered) {
    const r = rows.find((x) => x.key === k);
    if (r && isPermissionKey(r.key)) {
      list.push({ id: r.id, key: r.key, description: r.description });
    }
  }
  for (const r of rows) {
    if (!isPermissionKey(r.key)) continue;
    if (!list.some((x) => x.id === r.id)) {
      list.push({ id: r.id, key: r.key, description: r.description });
    }
  }
  return list;
}

export async function loadRolePermissionMatrix(): Promise<RolePermissionMatrix> {
  await ensurePermissionCatalogRows();
  const rows = await prisma.rolePermission.findMany({
    select: { role: true, permission: { select: { key: true } } },
  });
  const m = buildMatrixFromDbRows(rows);
  /** Show merged SUPER_ADMIN row so UI matches effective access (JWT also merges invariants). */
  const set = new Set(m.SUPER_ADMIN);
  for (const k of SUPER_ADMIN_INVARIANT_KEYS) set.add(k);
  m.SUPER_ADMIN = [...set].filter(isPermissionKey).sort((a, b) => PERMISSION_KEYS.indexOf(a) - PERMISSION_KEYS.indexOf(b));
  return m;
}
