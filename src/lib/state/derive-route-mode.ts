import type { UiMode } from "@/lib/design-system/types";

/** Maps URL prefix → UI mode — shared by route sync and pathname fallback. */
export function deriveRouteModeFromPath(path: string): UiMode {
  if (path.startsWith("/classroom")) return "classroom";
  if (path.startsWith("/contest")) return "contest";
  if (path.startsWith("/workspace")) return "coding";
  if (path.startsWith("/learning")) return "learning";
  return "classroom";
}
