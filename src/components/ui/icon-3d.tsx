import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const iconSize = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;
const boxSize = { sm: "h-8 w-8 min-h-8 min-w-8", md: "h-9 w-9 min-h-9 min-w-9", lg: "h-11 w-11 min-h-11 min-w-11" } as const;

export type Icon3DSize = keyof typeof iconSize;

/**
 * 3D “kub” ichida Lucide ikon — gradient, soyalar, hoverda aylanish.
 */
export function Icon3D({
  icon: Icon,
  size = "md",
  active = false,
  className,
  boxClassName,
  iconClassName,
}: {
  icon: LucideIcon;
  size?: Icon3DSize;
  active?: boolean;
  className?: string;
  boxClassName?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "iq-3d-icon-box perspective-[500px] inline-flex shrink-0 items-center justify-center rounded-xl",
        boxSize[size],
        active ? "iq-3d-icon-box--active" : "iq-3d-icon-box--idle",
        boxClassName,
        className,
      )}
    >
      <Icon className={cn("iq-3d-icon-svg pointer-events-none", iconSize[size], iconClassName)} aria-hidden />
    </span>
  );
}

/** Quti yo‘q — faqat “hajmli” svg (tugma ichida, badge yonida). */
export function Icon3DGlyph({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  size?: Icon3DSize;
  className?: string;
}) {
  return <Icon className={cn("iq-3d-glyph", iconSize[size], className)} aria-hidden />;
}
