import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { PermissionKey } from "@/lib/permission-keys";
import { sessionHasPermission } from "@/lib/permissions";

/**
 * Server-only: require authenticated session.
 */
export function requireAuth(session: Session | null | undefined): asserts session is Session {
  if (!session?.user?.id) redirect("/kirish");
}

/**
 * Server-only: require a permission granted on the session (JWT-hydrated from RolePermission).
 */
export function requirePermission(
  session: Session | null | undefined,
  key: PermissionKey,
  opts?: { redirectTo?: string },
): asserts session is Session {
  requireAuth(session);
  if (!sessionHasPermission(session, key)) {
    redirect(opts?.redirectTo ?? "/");
  }
}
