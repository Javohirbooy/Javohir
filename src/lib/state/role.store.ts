import { create } from "zustand";
import type { PlatformRole } from "@/lib/design-system/types";

type RoleState = {
  role: PlatformRole;
  setRole: (r: PlatformRole) => void;
};

/**
 * Role slice — independent from mode and stress.
 */
export const useRoleStore = create<RoleState>((set) => ({
  role: "student",
  setRole: (role) => set({ role }),
}));
