"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import type { AppRole } from "@/lib/permissions";
import { MATRIX_ROLES, parseMatrixInput } from "@/lib/role-permissions-matrix";
import { ensurePermissionCatalogRows } from "@/lib/role-permissions-service";
import type { ActionResult } from "@/lib/action-result";
import { errResult, okResult } from "@/lib/action-result";

export type SaveRoleMatrixResult = ActionResult;

export async function saveRolePermissionMatrix(payload: unknown): Promise<SaveRoleMatrixResult> {
  const session = await auth();
  requirePermission(session, "PERMISSIONS_MANAGE", { redirectTo: "/admin" });

  const parsed = parseMatrixInput(payload);
  if (!parsed.ok) return errResult(parsed.error, "VALIDATION_ERROR");

  await ensurePermissionCatalogRows();

  const keyToId = new Map(
    (await prisma.permission.findMany({ select: { id: true, key: true } })).map((p) => [p.key, p.id]),
  );

  try {
    await prisma.$transaction(async (tx) => {
      for (const role of MATRIX_ROLES) {
        const keys = parsed.matrix[role];
        await tx.rolePermission.deleteMany({ where: { role } });
        if (keys.length === 0) continue;
        const pairs = keys
          .map((key) => {
            const permissionId = keyToId.get(key);
            return permissionId ? { role: role as AppRole, permissionId } : null;
          })
          .filter((x): x is { role: AppRole; permissionId: string } => x != null);
        if (pairs.length) {
          await tx.rolePermission.createMany({ data: pairs });
        }
      }
    });
  } catch {
    return errResult("Saqlashda xatolik yuz berdi.", "INTERNAL_ERROR");
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "permissions.matrix_updated",
    entityType: "RolePermission",
    entityId: null,
    metadata: {
      roles: [...MATRIX_ROLES],
      counts: Object.fromEntries(MATRIX_ROLES.map((r) => [r, parsed.matrix[r].length])),
    },
  });

  return okResult(undefined, "OK");
}
