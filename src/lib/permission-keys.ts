/**
 * Canonical permission keys for IQ Monitoring (DB `Permission.key` must match).
 * Use these in server checks — do not invent ad-hoc strings.
 */
export const PERMISSION_KEYS = [
  "USERS_VIEW_ALL",
  "USERS_CREATE",
  "USERS_UPDATE",
  "USERS_DELETE",
  "USERS_BLOCK",
  "PASSWORD_RESET_ANY",
  "PASSWORD_RESET_ASSIGNED_STUDENTS",
  "TESTS_VIEW",
  "TESTS_CREATE",
  "TESTS_EDIT",
  "TESTS_DELETE",
  "TESTS_ATTEMPT",
  "TEST_CODES_MANAGE",
  "RESULTS_VIEW_ALL",
  "RESULTS_VIEW_ASSIGNED",
  "RESULTS_VIEW_OWN",
  "SUBJECTS_MANAGE",
  "SUBJECTS_VIEW",
  "QUESTION_BANK_MANAGE",
  "QUESTION_BANK_VIEW",
  "ANALYTICS_GLOBAL",
  "ANALYTICS_ASSIGNED",
  "ANALYTICS_OWN",
  "AUDIT_READ",
  "SITE_SETTINGS_MANAGE",
  "SITE_SETTINGS_SUPER",
  "ANNOUNCEMENTS_MANAGE",
  /** Role ↔ permission matrix in admin UI; super-admin lockout protection applies. */
  "PERMISSIONS_MANAGE",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function isPermissionKey(v: string): v is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(v);
}

/** SUPER_ADMIN always receives these in JWT (even if DB grants were stripped) to prevent lockout. */
export const SUPER_ADMIN_INVARIANT_KEYS = ["SITE_SETTINGS_SUPER", "PERMISSIONS_MANAGE"] as const satisfies readonly PermissionKey[];
