import {
  PERMISSION_KEYS,
  SUPER_ADMIN_INVARIANT_KEYS,
  type PermissionKey,
  isPermissionKey,
} from "@/lib/permission-keys";

/**
 * Edge / middleware uchun: Prisma siz rolga mos ruxsatlar.
 * `resolvePermissionKeysForRole` DB dan o‘qiydi; bu yerda fallback (seed bo‘lmagan yoki session.update).
 */
const STATIC_BY_ROLE: Record<string, readonly PermissionKey[]> = {
  SUPER_ADMIN: [...PERMISSION_KEYS],
  ADMIN: PERMISSION_KEYS.filter((k) => k !== "SITE_SETTINGS_SUPER"),
  TEACHER: [
    "TESTS_VIEW",
    "TESTS_CREATE",
    "TESTS_EDIT",
    "TESTS_DELETE",
    "TEST_CODES_MANAGE",
    "SUBJECTS_VIEW",
    "QUESTION_BANK_VIEW",
    "QUESTION_BANK_MANAGE",
    "RESULTS_VIEW_ASSIGNED",
    "ANALYTICS_ASSIGNED",
    "PASSWORD_RESET_ASSIGNED_STUDENTS",
    "USERS_CREATE",
    "USERS_UPDATE",
  ],
  STUDENT: ["TESTS_ATTEMPT", "RESULTS_VIEW_OWN", "SUBJECTS_VIEW", "ANALYTICS_OWN"],
};

export function staticPermissionKeysForRole(role: string): string[] {
  const keys = STATIC_BY_ROLE[role];
  if (!keys?.length) return [];
  if (role === "SUPER_ADMIN") {
    const merged = new Set(keys);
    for (const k of SUPER_ADMIN_INVARIANT_KEYS) merged.add(k);
    return [...merged].filter(isPermissionKey).sort((a, b) => PERMISSION_KEYS.indexOf(a) - PERMISSION_KEYS.indexOf(b));
  }
  return [...keys].filter(isPermissionKey);
}
