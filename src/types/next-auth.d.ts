import type { AuthRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: AuthRole;
    memberId: string | null;
    passwordChangeRequired: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: AuthRole;
      memberId: string | null;
      isActive: boolean;
      passwordChangeRequired: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AuthRole;
    memberId: string | null;
    isActive?: boolean;
    passwordChangeRequired?: boolean;
    authCheckedAt?: number;
  }
}
