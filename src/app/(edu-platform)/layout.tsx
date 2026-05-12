import type { ReactNode } from "react";
import { EduPlatformGroupLayout } from "@/components/layout/edu-platform-group-layout";

export default function EduPlatformRouteGroupLayout({ children }: { children: ReactNode }) {
  return <EduPlatformGroupLayout>{children}</EduPlatformGroupLayout>;
}
