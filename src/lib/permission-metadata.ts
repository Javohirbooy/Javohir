import type { PermissionKey } from "@/lib/permission-keys";

/** Short Uzbek labels for admin UI + DB `Permission.description` sync. */
export const PERMISSION_DESCRIPTIONS_UZ: Record<PermissionKey, string> = {
  USERS_VIEW_ALL: "Barcha foydalanuvchilarni ko‘rish",
  USERS_CREATE: "Foydalanuvchi yaratish",
  USERS_UPDATE: "Foydalanuvchini yangilash",
  USERS_DELETE: "Foydalanuvchini o‘chirish",
  USERS_BLOCK: "Foydalanuvchini bloklash / holat",
  PASSWORD_RESET_ANY: "Istalgan foydalanuvchi parolini tiklash",
  PASSWORD_RESET_ASSIGNED_STUDENTS: "O‘z o‘quvchilari parolini tiklash",
  TESTS_VIEW: "Testlarni ko‘rish",
  TESTS_CREATE: "Test yaratish",
  TESTS_EDIT: "Testni tahrirlash",
  TESTS_DELETE: "Testni o‘chirish",
  TESTS_ATTEMPT: "Test topshirish (o‘quvchi)",
  TEST_CODES_MANAGE: "Test kodlarini boshqarish",
  RESULTS_VIEW_ALL: "Barcha natijalar",
  RESULTS_VIEW_ASSIGNED: "Biriktirilgan sinf/o‘quvchi natijalari",
  RESULTS_VIEW_OWN: "Faqat o‘z natijalari",
  SUBJECTS_MANAGE: "Fanlarni boshqarish",
  SUBJECTS_VIEW: "Fanlarni ko‘rish",
  QUESTION_BANK_MANAGE: "Savollar bankini boshqarish",
  QUESTION_BANK_VIEW: "Savollar bankini ko‘rish",
  ANALYTICS_GLOBAL: "Global tahlil dashboard",
  ANALYTICS_ASSIGNED: "O‘z doirasi tahlili",
  ANALYTICS_OWN: "Shaxsiy progress tahlili",
  AUDIT_READ: "Audit jurnalini o‘qish",
  SITE_SETTINGS_MANAGE: "Sayt sozlamalari (admin)",
  SITE_SETTINGS_SUPER: "Super-only sozlamalar",
  ANNOUNCEMENTS_MANAGE: "E’lonlarni boshqarish",
  PERMISSIONS_MANAGE: "Rol ruxsatlarini boshqarish",
};

export type PermissionCategoryId =
  | "users"
  | "tests"
  | "results"
  | "curriculum"
  | "analytics"
  | "audit"
  | "settings"
  | "comms"
  | "system";

const CATEGORY_ORDER: PermissionCategoryId[] = [
  "system",
  "users",
  "tests",
  "results",
  "curriculum",
  "analytics",
  "audit",
  "settings",
  "comms",
];

const CATEGORY_LABELS_UZ: Record<PermissionCategoryId, string> = {
  system: "Tizim",
  users: "Foydalanuvchilar",
  tests: "Testlar",
  results: "Natijalar",
  curriculum: "O‘quv reja",
  analytics: "Tahlil",
  audit: "Audit",
  settings: "Sozlamalar",
  comms: "E’lonlar",
};

export function permissionCategoryOf(key: PermissionKey): PermissionCategoryId {
  if (key === "PERMISSIONS_MANAGE") return "system";
  if (key.startsWith("USERS_") || key.startsWith("PASSWORD_")) return "users";
  if (key.startsWith("TESTS_") || key.startsWith("TEST_CODES")) return "tests";
  if (key.startsWith("RESULTS_")) return "results";
  if (key.startsWith("SUBJECTS_") || key.startsWith("QUESTION_")) return "curriculum";
  if (key.startsWith("ANALYTICS_")) return "analytics";
  if (key.startsWith("AUDIT_")) return "audit";
  if (key.startsWith("SITE_SETTINGS")) return "settings";
  if (key.startsWith("ANNOUNCEMENTS_")) return "comms";
  return "system";
}

export function categoryLabelUz(id: PermissionCategoryId): string {
  return CATEGORY_LABELS_UZ[id];
}

/** Stable category order for grouped tables. */
export function orderedCategoryIds(): PermissionCategoryId[] {
  return [...CATEGORY_ORDER];
}

export function groupPermissionsByCategory(keys: readonly PermissionKey[]): Map<PermissionCategoryId, PermissionKey[]> {
  const m = new Map<PermissionCategoryId, PermissionKey[]>();
  for (const id of CATEGORY_ORDER) m.set(id, []);
  for (const k of keys) {
    const c = permissionCategoryOf(k);
    m.get(c)!.push(k);
  }
  return m;
}
