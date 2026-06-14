import type { AuthRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: AuthRole;
    memberId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AuthRole;
      memberId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AuthRole;
    memberId: string | null;
  }
}
