/** 8px grid — numeric = n×8 at the layout level; use Tailwind spacing scale (2=8px). */
export const gridUnitPx = 8;

export const eduSpacing = {
  /** gap-2, p-2 */
  xs: "gap-2 p-2",
  sm: "gap-3 p-3 sm:gap-4 sm:p-4",
  md: "gap-4 p-4 sm:gap-6 sm:p-6",
  lg: "gap-6 p-6 sm:gap-8 sm:p-8",
  sectionY: "py-6 sm:py-8 md:py-10",
  sectionX: "px-4 sm:px-6 lg:px-8",
} as const;
