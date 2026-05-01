import { auth } from "@/auth";
import { requirePermission } from "@/lib/authz";
import { loadPermissionRowsOrdered, loadRolePermissionMatrix } from "@/lib/role-permissions-service";
import { matrixToSerializable } from "@/lib/role-permissions-matrix";
import { RolePermissionsManager } from "@/components/admin/role-permissions-manager";

export default async function AdminRolePermissionsPage() {
  const session = await auth();
  requirePermission(session, "PERMISSIONS_MANAGE", { redirectTo: "/admin" });

  const [permissions, matrix] = await Promise.all([loadPermissionRowsOrdered(), loadRolePermissionMatrix()]);

  return (
    <RolePermissionsManager
      permissions={permissions.map((p) => ({ id: p.id, key: p.key, description: p.description }))}
      initialMatrix={matrixToSerializable(matrix)}
    />
  );
}
