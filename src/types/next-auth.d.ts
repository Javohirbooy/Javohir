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
      /** Hydrated from DB RolePermission at sign-in / session update. */
      permissionKeys: string[];
    };
  }

  interface User {
    role: AppRole;
    status?: string;
    locale?: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    status?: string;
    locale?: string;
    mustChangePassword?: boolean;
    permissionKeys?: string[];
  }
}
