import type { Session } from "next-auth";
import { sessionHasPermission } from "@/lib/permissions";

/** Prisma `Test` fields needed for ownership checks. */
export type TestOwnershipFields = {
  id: string;
  authorUserId: string | null;
};

/** Teacher-owned rows: `prisma.test.findMany({ where: { authorUserId: teacherUserId } })` (see `Test.authorUserId` in schema). */

export function isPlatformOwnedTest(test: TestOwnershipFields): boolean {
  return test.authorUserId == null;
}

export function isTeacherOwnedTest(test: TestOwnershipFields, teacherUserId: string): boolean {
  return test.authorUserId === teacherUserId;
}

/** Teacher may open /testlar/[id] only for tests they authored. */
export function teacherCanOpenTestRunner(session: Session, test: TestOwnershipFields): boolean {
  if (session.user.role !== "TEACHER") return false;
  return isTeacherOwnedTest(test, session.user.id);
}

/** Admin / super-admin may open any test for preview if they have TESTS_VIEW. */
export function adminCanOpenTestRunner(session: Session): boolean {
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return false;
  return sessionHasPermission(session, "TESTS_VIEW");
}

export function canDeleteTest(session: Session, test: TestOwnershipFields): boolean {
  if (!sessionHasPermission(session, "TESTS_DELETE")) return false;
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN") return true;
  if (session.user.role === "TEACHER") {
    return isTeacherOwnedTest(test, session.user.id) && !isPlatformOwnedTest(test);
  }
  return false;
}

/** Teacher cannot edit platform/admin tests; only their own (authored) rows. */
export function canTeacherEditTest(session: Session, test: TestOwnershipFields): boolean {
  if (session.user.role !== "TEACHER") return false;
  if (!sessionHasPermission(session, "TESTS_EDIT")) return false;
  if (isPlatformOwnedTest(test)) return false;
  return isTeacherOwnedTest(test, session.user.id);
}

export function canAdminEditTest(session: Session): boolean {
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return false;
  return sessionHasPermission(session, "TESTS_EDIT");
}
