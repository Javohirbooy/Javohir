import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      status?: string;
      locale?: string;
      mustChangePassword: boolean;
      /** O‘quvchi kabineti — bazadan keladigan doimiy raqam. */
      studentNumber?: number;
      /** Hydrated from DB RolePermission at sign-in / session update. */
      permissionKeys: string[];
    };
  }

  interface User {
    role: AppRole;
    status?: string;
    locale?: string;
    mustChangePassword?: boolean;
    studentNumber?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    status?: string;
    locale?: string;
    mustChangePassword?: boolean;
    studentNumber?: number;
    /** Throttle DB refresh of `studentNumber` for students (ms since epoch). */
    studentNumberSyncedAt?: number;
    permissionKeys?: string[];
  }
}
